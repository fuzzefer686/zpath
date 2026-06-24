// Server-only guard (matches the rest of the AI layer).
if (typeof window !== "undefined") {
  throw new Error("lib/ai/vertex must only be imported from server-side code.");
}

/**
 * ZPath CV Builder — T14: Vertex AI gateway (plan §13.7).
 *
 * The ONLY way CV content reaches a model. By construction it is impossible to
 * call the model without de-identifying first: this module accepts a raw
 * FullProfile and ALWAYS runs sanitizeForAI() internally — there is no exported
 * path that takes a pre-built prompt/payload. Callers (T15 AI tools, the
 * /api/cv/ai route) import ONLY runCvAiTask; they never touch the model client.
 *
 * Compliance posture (§13.7):
 *   - Layer 1 (de-identify): enforced here via sanitizeForAI — non-bypassable.
 *   - Layer 3 (region pinning): REGIONAL endpoint asia-southeast1 only. The
 *     global endpoint and API-key Developer API are refused (cannot pin region).
 *   - Layer 4 (no retention): prompts are already de-identified; Vertex does not
 *     train on customer data by default. See the DPA/CTIA TODO below for the
 *     remaining org-level controls that must be signed/filed before launch.
 *   - The student's real name/school/org appear in the FINAL text only, via
 *     restore() applied server-side to the model OUTPUT — never sent upstream.
 *
 * TODO (legal, before production AI launch — plan §13.7 layers 5–7):
 *   - Sign the Google Cloud Data Processing Addendum (DPA) for Vertex AI.
 *   - File the cross-border transfer impact assessment (CTIA) per Luật 91/2025
 *     + NĐ 356/2025; user consent must state processing occurs abroad.
 *   - Confirm Vertex prompt-logging / data-governance is set to no-retention at
 *     the project/org level (there is no per-request SDK flag for this).
 */
import type { GenerateContentConfig } from "@google/genai";

import { FEATURES } from "@/config/features";
import {
  generateGeminiTextInRegion,
  getGeminiModelName,
  isGeminiRegionPinnable,
} from "@/src/lib/ai/geminiVertexClient";
import { isAiEnabled } from "@/lib/ai/flags";
import { sanitizeForAI, type AiTask, type FullProfile } from "@/lib/ai/sanitizer";

// Hard-pinned regional endpoint nearest VN (Singapore). NEVER 'global'.
export const CV_VERTEX_LOCATION = "asia-southeast1";

export interface RunCvAiOptions {
  isUnder16: boolean;
  /** Default false: <16 profiles skip AI (rule-based fallback) per §13.7 layer 6. */
  allowUnder16Ai?: boolean;
  /** Optional sink for the SANITIZED payload only (never raw profile). */
  logger?: (event: string, data: unknown) => void;
  /** Generation overrides (temperature, maxOutputTokens, responseMimeType...). */
  config?: GenerateContentConfig;
}

export type CvAiSkipReason =
  | "feature_disabled"
  | "ai_not_configured"
  | "under16_skipped"
  | "kill_switch_disabled";

export interface CvAiResult {
  ok: boolean;
  /** Model output with placeholders restored to real values (server-side). */
  text: string | null;
  /** True when the model was intentionally not called. */
  skipped: boolean;
  skipReason?: CvAiSkipReason;
  /** De-identified payload actually sent — safe to log / store for explainability. */
  sanitizedPayload: Record<string, unknown>;
  /** Model identifier used — for traceability in cv_recommendations.source_model. */
  sourceModel?: string;
}

// ---------------------------------------------------------------------------
// Prompt scaffold (placeholder-aware). T15 refined per-task prompts + JSON
// schemas for enrich_summary and suggest_skills.
// ---------------------------------------------------------------------------
const TASK_INSTRUCTION: Record<AiTask, string> = {
  enrich_summary: [
    "Viết lại phần tiêu đề (headline) và tóm tắt (summary) hồ sơ CV cho học sinh THPT.",
    "Trả lời CHÍNH XÁC theo JSON (không thêm bất kỳ text nào ngoài JSON):",
    '{"headline":"<1 dòng ngắn gọn, 10-15 từ>","summary":"<3-5 câu, tiếng Việt, chuyên nghiệp>","rationale":"<lý do đề xuất, 1-2 câu tiếng Việt>"}',
    "Giữ nguyên các token như [STUDENT], [SCHOOL_1] nếu nhắc tới — hệ thống sẽ thay tên thật sau.",
    "TUYỆT ĐỐI không bịa chứng chỉ, điểm số hay giải thưởng.",
  ].join("\n"),

  suggest_skills: [
    "Gợi ý tối đa 5 kỹ năng thực hành nên bổ sung dựa trên ngành/nghề mục tiêu và hồ sơ hiện có.",
    "Trả lời CHÍNH XÁC theo JSON (không thêm bất kỳ text nào ngoài JSON):",
    '{"skills":[{"name":"<tên kỹ năng>","category":"technical|soft|language|tool|other","rationale":"<lý do, 1 câu>"}]}',
    "Chỉ gợi ý kỹ năng thực hành. KHÔNG gợi ý chứng chỉ, điểm số, giải thưởng hay thành tích.",
    "Giữ nguyên các token [STUDENT], [SCHOOL_1]... nếu nhắc tới.",
  ].join("\n"),

  analyze_skill_gap: [
    "So sánh kỹ năng hiện có trong hồ sơ với yêu cầu của nghề mục tiêu. Liệt kê các kỹ năng CÒN THIẾU (không liệt kê kỹ năng đã có).",
    "Trả lời CHÍNH XÁC theo JSON (không thêm bất kỳ text nào ngoài JSON):",
    '{"gaps":[{"skill":"<tên kỹ năng>","category":"technical|soft|language|tool|other","importance":"high|medium|low","rationale":"<tại sao kỹ năng này quan trọng với nghề mục tiêu, 1 câu>"}]}',
    "Tối đa 6 kỹ năng. KHÔNG bịa chứng chỉ, điểm số hay giải thưởng.",
    "Giữ nguyên token [STUDENT], [SCHOOL_1]... nếu nhắc tới.",
  ].join("\n"),

  analyze_cert_gap: [
    "Xác định các chứng chỉ CÒN THIẾU so với yêu cầu của ngành/nghề mục tiêu. Chỉ liệt kê chứng chỉ chưa có.",
    "Trả lời CHÍNH XÁC theo JSON (không thêm bất kỳ text nào ngoài JSON):",
    '{"gaps":[{"certName":"<tên chứng chỉ>","certTypeCode":"<mã nếu biết, ví dụ IELTS_ACADEMIC hoặc null>","importance":"high|medium|low","rationale":"<tại sao chứng chỉ này cần thiết, 1 câu>"}]}',
    "Tối đa 4 chứng chỉ. TUYỆT ĐỐI không bịa điểm thi hay kết quả — chỉ gợi ý loại chứng chỉ cần có.",
  ].join("\n"),

  recommend_courses: [
    "Dựa vào kỹ năng hiện có, chứng chỉ đã có và nghề mục tiêu, gợi ý các khoá học cơ bản, công khai, khách quan để lấp khoảng cách năng lực.",
    "Trả lời CHÍNH XÁC theo JSON (không thêm bất kỳ text nào ngoài JSON):",
    '{"courses":[{"name":"<tên khoá học>","provider":"<nơi cung cấp: Coursera|edX|YouTube|Khan Academy|...>","url":"<URL nếu biết chính xác, hoặc null>","tags":["<tag liên quan, ví dụ: python, ielts, design>"],"rationale":"<lý do phù hợp với gap, 1 câu>"}]}',
    "Tối đa 5 khoá. KHÔNG bịa URL — nếu không chắc thì để null. Chỉ gợi ý khoá học công khai, không trả phí hoặc có free tier.",
  ].join("\n"),

  suggest_career_direction: [
    "Gợi ý 2–3 định hướng nghề nghiệp phù hợp nhất dựa trên điểm mạnh hiện tại và ngành mục tiêu trong hồ sơ.",
    "Trả lời CHÍNH XÁC theo JSON (không thêm bất kỳ text nào ngoài JSON):",
    '{"directions":[{"title":"<tên nghề hoặc định hướng cụ thể>","fit":"high|medium","rationale":"<lý do phù hợp dựa trên hồ sơ, 2–3 câu tiếng Việt>"}]}',
    "Giữ nguyên token [STUDENT], [SCHOOL_1]... nếu nhắc tới. KHÔNG bịa thành tích hay chứng chỉ.",
  ].join("\n"),
};

function buildCvPrompt(task: AiTask, payload: Record<string, unknown>): string {
  return [
    TASK_INSTRUCTION[task],
    "",
    "QUAN TRỌNG: Dữ liệu dưới đây đã được ẩn danh. Các token [STUDENT], [SCHOOL_1], [ORG_1]… đại diện cho học sinh/trường/tổ chức.",
    "Khi nhắc tới các thực thể này trong câu trả lời, hãy GIỮ NGUYÊN token (đừng đặt tên khác) — hệ thống sẽ thay lại tên thật sau.",
    "Tuyệt đối không bịa chứng chỉ, điểm số hay giải thưởng.",
    "",
    "Hồ sơ (JSON đã ẩn danh):",
    JSON.stringify(payload),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Gateway — the single CV→model entry point.
// ---------------------------------------------------------------------------
export async function runCvAiTask(
  profile: FullProfile,
  task: AiTask,
  opts: RunCvAiOptions,
): Promise<CvAiResult> {
  // 0) Kill-switch — checked before sanitization. No data leaves, no Vertex call.
  if (!(await isAiEnabled())) {
    return {
      ok: true,
      text: null,
      skipped: true,
      skipReason: "kill_switch_disabled",
      sanitizedPayload: {},
    };
  }

  // 1) De-identify FIRST, always. This is the non-bypassable gate.
  const { payload, restore, skipAiRecommended } = sanitizeForAI(profile, task, {
    isUnder16: opts.isUnder16,
    logger: opts.logger,
  });

  const skip = (skipReason: CvAiSkipReason): CvAiResult => ({
    ok: true,
    text: null,
    skipped: true,
    skipReason,
    sanitizedPayload: payload,
  });

  // 2) Policy gates.
  if (!FEATURES.cvBuilder.enabled) return skip("feature_disabled");
  if (skipAiRecommended && !opts.allowUnder16Ai) return skip("under16_skipped");
  // Region pinning requires Vertex service-account mode; refuse to fall back to
  // the global/API-key path with student PII.
  if (!isGeminiRegionPinnable()) return skip("ai_not_configured");

  // 3) Call the model on the SANITIZED payload, pinned to asia-southeast1.
  const prompt = buildCvPrompt(task, payload);
  const raw = await generateGeminiTextInRegion({
    prompt,
    location: CV_VERTEX_LOCATION,
    config: {
      temperature: 0.3,
      maxOutputTokens: 1024,
      ...opts.config,
    },
  });

  // 4) Re-inject real values into the OUTPUT only, server-side.
  return {
    ok: true,
    text: restore(raw),
    skipped: false,
    sanitizedPayload: payload,
    sourceModel: getGeminiModelName(),
  };
}
