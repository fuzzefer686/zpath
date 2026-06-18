import "server-only";

import { getGeminiClient, getGeminiModelName } from "@/src/lib/ai/geminiVertexClient";
import {
  validateAdmissionConfig,
  type GenericAdmissionConfig,
} from "@/src/lib/admission-engine/generic";
import { normalizeGeneratedConfig } from "@/src/lib/admission-config/normalizeGeneratedConfig";

export type ExtractAdmissionConfigInput = {
  pdfBase64: string;
  schoolCode: string;
  schoolName?: string;
  year: number;
  extraContext?: string;
};

export type ExtractAdmissionConfigResult = {
  draft: unknown;
  valid: boolean;
  warnings: string[];
};

const IS_VERCEL = process.env.VERCEL === "1";
const FORCE_FAST_MODE = process.env.ADMISSION_FAST_MODE === "1";
const FAST_MODE = IS_VERCEL || FORCE_FAST_MODE;
const MAX_EXTRA_CONTEXT_CHARS = 8_000;

const EXTRACTION_PROMPT = `Bạn là trợ lý trích xuất dữ liệu tuyển sinh. Đọc file PDF đề án tuyển sinh đính kèm và trích xuất ra một CẤU HÌNH TÍNH ĐIỂM dạng JSON đúng theo schema v2 dưới đây.

QUAN TRỌNG:
- Chỉ trả về JSON, không kèm giải thích, không markdown.
- Nếu không chắc một con số, hãy bỏ qua trường đó thay vì bịa.
- Mọi công thức cuối cùng phải quy về thang 30.
- Đơn vị điểm môn học là thang 10.
- Với input chứng chỉ (IELTS, SAT, ...), người dùng chỉ nhập band/điểm chứng chỉ; phải cung cấp bảng quy đổi theo từng phương thức (không dùng chung nếu tài liệu quy định khác nhau).
- Nếu một phương thức có nhiều nhóm/tiểu nhóm (ví dụ: Nhóm 1, Nhóm 2, Nhóm 3), phải tách thành nhiều method riêng (ví dụ: PT2_N1, PT2_N2, PT2_N3). Không được gộp nhóm.
- Mỗi method bắt buộc có inputs không rỗng và formula hợp lệ. Không được trả method placeholder bị thiếu fields.
- Với uiTemplate "direct_admission", vẫn phải có inputs/formula hợp lệ bằng placeholder:
  - input key: "synthetic_score" (required=false)
  - formula: scale_conversion với inputKey "synthetic_score", fromScale=30
- schemaVersion: 2

Schema v2 (rút gọn):
{
  "schemaVersion": 2,
  "schoolCode": string,
  "schoolName": string,
  "year": number,
  "programSource": "db" | "inline",
  "benchmarkSource": "db" | "method_default",
  "benchmarkYear": number,
  "disclaimer": string,
  "sourceUrl": string,
  "programs": [{ "programCode": string, "programName": string, "formulaGroup": string }],
  "methods": [{
    "methodCode": string,
    "methodName": string,
    "description": string,
    "note": string,
    "requirements": [string],
    "sources": [{ "url": string, "label": string, "excerpt": string }],
    "uiTemplate": "flat" | "thpt_combination" | "assessment_scale" | "direct_admission",
    "programInputKey": "programCode",
    "combinationInputKey": "combinationCode",
    "inputs": [{
      "key": string,
      "label": string,
      "type": "number" | "certificate" | "certificate_rich" | "select" | "subject_group",
      "required": boolean,
      "min": number, "max": number,
      "options": [{ "value": string, "label": string }],
      "certificateLevels": [{ "band": number, "convertedScore": number }],
      "visibility": [{ "when": { "inputKey": string, "equals": string } }]
    }],
    "combinations": [{
      "code": string,
      "label": string,
      "subjects": [{ "key": string, "label": string, "weight": number, "required": boolean, "type": "number" }]
    }],
    "formula": {
      "type": "weighted_combination",
      "terms": [{ "inputKey": string, "weight": number, "maxOfInputKeys": [string] }],
      "targetScale": 30
    },
    "priorityInputKey": string,
    "bonusInputKeys": [string],
    "priorityRules": [{ "key": string, "label": string, "max": number }],
    "bonusRules": [{ "key": string, "label": string, "max": number }],
    "eligibilityRules": [{ "type": "min_score" | "required_input", "inputKey": string, "min": number, "message": string }],
    "scoreClamp": { "min": number, "max": number },
    "benchmark30": number
  }]
}

Gợi ý: mọi inputKey trong terms/priority/bonus phải có trong inputs. Với THPT, dùng uiTemplate "thpt_combination" và subject_group input.`;

const PROGRAMS_EXTRACTION_PROMPT = `Đọc PDF đề án tuyển sinh và trích xuất DANH SÁCH CHƯƠNG TRÌNH + TỔ HỢP MÔN.

Chỉ trả về JSON:
{
  "programs": [{ "programCode": string, "programName": string, "formulaGroup": string }],
  "combinations": [{
    "code": string,
    "label": string,
    "subjects": [{ "key": string, "label": string, "weight": number, "required": boolean, "type": "number" }]
  }],
  "certificateLevels": [{ "band": number, "convertedScore": number, "certificateType": string }]
}`;

function buildPromptWithHints(input: ExtractAdmissionConfigInput): string {
  const hints = [
    `Mã trường gợi ý: ${input.schoolCode}.`,
    input.schoolName ? `Tên trường gợi ý: ${input.schoolName}.` : "",
    `Năm tuyển sinh gợi ý: ${input.year}.`,
    input.extraContext?.trim()
      ? `Ngữ cảnh admin bổ sung (ưu tiên bám sát, không tự suy diễn):\n${input.extraContext
          .trim()
          .slice(0, MAX_EXTRA_CONTEXT_CHARS)}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `${EXTRACTION_PROMPT}\n\nGợi ý từ người dùng (dùng nếu PDF không nêu rõ): ${hints}`;
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function readResponseText(response: unknown): string {
  const record = response as {
    text?: string;
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const directText = record.text?.trim();
  if (directText) return directText;

  return (
    record.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n")
      .trim() ?? ""
  );
}

function readFinishReason(response: unknown): string | undefined {
  const record = response as {
    candidates?: Array<{ finishReason?: string }>;
  };
  return record.candidates?.[0]?.finishReason;
}

async function callGeminiJson(
  pdfBase64: string,
  prompt: string,
): Promise<unknown> {
  const model = getGeminiModelName();
  let lastError: Error | null = null;
  const prompts = FAST_MODE
    ? [
        prompt,
        `${prompt}\n\nYêu cầu dự phòng (ngắn gọn): trả JSON tối thiểu nhưng hợp lệ schema, methods không rỗng, không giải thích thêm.`,
      ]
    : [
        prompt,
        `${prompt}\n\nYêu cầu dự phòng: nếu nội dung dài, hãy trả JSON tối thiểu nhưng hợp lệ theo schema và KHÔNG để methods rỗng.`,
      ];

  for (let i = 0; i < prompts.length; i += 1) {
    const response = await getGeminiClient().models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: pdfBase64,
              },
            },
            { text: prompts[i] },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: i === 0 ? 0.1 : 0,
        maxOutputTokens: 8192,
      },
    });

    const text = readResponseText(response);
    if (!text) {
      const finishReason = readFinishReason(response);
      lastError = new Error(
        finishReason
          ? `GEMINI_EMPTY_RESPONSE:${finishReason}`
          : "GEMINI_EMPTY_RESPONSE",
      );
      continue;
    }

    try {
      return JSON.parse(stripJsonFences(text));
    } catch {
      lastError = new Error("Không phân tích được JSON do AI trả về. Vui lòng thử lại.");
    }
  }

  throw lastError ?? new Error("GEMINI_EMPTY_RESPONSE");
}

function mapGeminiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (message.startsWith("GEMINI_EMPTY_RESPONSE")) {
    return "AI chưa trả về nội dung từ PDF ở lần chạy này. Vui lòng thử lại, hoặc dùng thêm nguồn URL/text để ổn định hơn.";
  }
  return message;
}

function mergePass2IntoDraft(
  draft: Record<string, unknown>,
  pass2: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...draft };

  if (Array.isArray(pass2.programs) && pass2.programs.length) {
    merged.programs = pass2.programs;
    merged.programSource = merged.programSource ?? "inline";
  }

  if (Array.isArray(pass2.combinations) && pass2.combinations.length) {
    const methods = Array.isArray(merged.methods) ? [...merged.methods] : [];
    if (methods.length) {
      const firstMethod = { ...(methods[0] as Record<string, unknown>) };
      firstMethod.combinations = pass2.combinations;
      firstMethod.uiTemplate = firstMethod.uiTemplate ?? "thpt_combination";
      methods[0] = firstMethod;
      merged.methods = methods;
    }
  }

  return merged;
}

export async function extractAdmissionConfigFromPdf(
  input: ExtractAdmissionConfigInput,
): Promise<ExtractAdmissionConfigResult> {
  const warnings: string[] = [];
  let pass1: Record<string, unknown>;
  try {
    pass1 = (await callGeminiJson(
      input.pdfBase64,
      buildPromptWithHints(input),
    )) as Record<string, unknown>;
  } catch (error) {
    throw new Error(mapGeminiErrorMessage(error));
  }

  let draft = backfillHints(pass1, input);

  if (!FAST_MODE) {
    try {
      const pass2 = (await callGeminiJson(
        input.pdfBase64,
        PROGRAMS_EXTRACTION_PROMPT,
      )) as Record<string, unknown>;
      draft = mergePass2IntoDraft(draft, pass2);
      warnings.push("Pass 2: đã merge chương trình/tổ hợp từ PDF (cần admin kiểm tra).");
    } catch (error) {
      warnings.push(
        `Pass 2 (programs/combinations) thất bại: ${
          error instanceof Error ? error.message : "unknown"
        }. Admin có thể import CSV hoặc sửa JSON thủ công.`,
      );
    }
  } else {
    warnings.push(
      "Fast mode: tạm bỏ Pass 2 để tránh timeout trên môi trường deploy. Nếu thiếu tổ hợp/chương trình, admin kiểm tra và bổ sung trước khi publish.",
    );
  }

  const normalized = normalizeGeneratedConfig(draft);
  draft = normalized.draft;
  warnings.push(...normalized.warnings);

  const validation = validateAdmissionConfig(draft);
  if (validation.ok) {
    return { draft: validation.config, valid: true, warnings };
  }

  return {
    draft,
    valid: false,
    warnings: [
      "AI trích xuất chưa đạt chuẩn schema, vui lòng kiểm tra và chỉnh sửa trước khi lưu.",
      ...validation.errors,
      ...warnings,
    ],
  };
}

function backfillHints(
  parsed: unknown,
  input: ExtractAdmissionConfigInput,
): Record<string, unknown> {
  const base =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};

  return {
    schemaVersion: 2,
    programSource: "db",
    benchmarkSource: "db",
    benchmarkYear: input.year - 1,
    ...base,
    schoolCode:
      typeof base.schoolCode === "string" && base.schoolCode.trim()
        ? base.schoolCode
        : input.schoolCode.toUpperCase(),
    schoolName:
      typeof base.schoolName === "string" && base.schoolName.trim()
        ? base.schoolName
        : input.schoolName ?? input.schoolCode,
    year:
      typeof base.year === "number" && Number.isInteger(base.year)
        ? base.year
        : input.year,
  };
}

export type { GenericAdmissionConfig };
