import { getGeminiClient, getGeminiModelName } from "@/src/lib/ai/geminiVertexClient";
import {
  validateAdmissionConfig,
  type GenericAdmissionConfig,
} from "@/src/lib/admission-engine/generic";
import { normalizeGeneratedConfig } from "@/src/lib/admission-config/normalizeGeneratedConfig";
import type { AdmissionSourceBundle, GenerateAdmissionConfigResult } from "./types";

type SynthesizeAdmissionConfigInput = {
  schoolCode: string;
  schoolName: string;
  year: number;
  sourceBundle: AdmissionSourceBundle;
};

const IS_VERCEL = process.env.VERCEL === "1";
const FORCE_FAST_MODE = process.env.ADMISSION_FAST_MODE === "1";
const FAST_MODE = IS_VERCEL || FORCE_FAST_MODE;

const EXTRACTION_PROMPT = `Bạn là trợ lý trích xuất dữ liệu tuyển sinh từ nguồn do admin cung cấp.

Nhiệm vụ:
- Đọc toàn bộ nguồn (PDF đính kèm + text snippets) và tạo cấu hình JSON theo schema v2.
- Chỉ sử dụng thông tin có trong nguồn; không tự bịa dữ liệu.
- Nếu không chắc, bỏ trống trường đó.
- Mọi công thức cuối cùng quy về thang 30.
- Đơn vị điểm môn là thang 10.
- Với input chứng chỉ (IELTS, TOEFL, SAT...), người dùng chỉ nhập điểm chứng chỉ/band; phải sinh bảng quy đổi theo từng phương thức nếu tài liệu quy định khác nhau.
- Nếu một phương thức có nhiều nhóm/tiểu nhóm (ví dụ: Nhóm 1, Nhóm 2, Nhóm 3), phải tách thành nhiều method riêng (ví dụ: PT2_N1, PT2_N2, PT2_N3). Không được gộp nhóm.
- Mỗi method bắt buộc có inputs không rỗng và formula hợp lệ. Không được trả method placeholder bị thiếu fields.
- Với uiTemplate "direct_admission", luôn tạo method hợp lệ bằng placeholder:
  - input key: "synthetic_score" (required=false)
  - formula: scale_conversion với inputKey "synthetic_score", fromScale=30
- Chỉ trả về JSON hợp lệ, không markdown.

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
      "certificateLevels": [{ "band": number, "convertedScore": number }],
      "certificateConfig": {
        "certificateType": string,
        "mode": "band_table" | "structured",
        "levels": [{ "band": number, "convertedScore": number }]
      }
    }],
    "formula": {
      "type": "weighted_combination",
      "terms": [{ "inputKey": string, "weight": number, "maxOfInputKeys": [string] }],
      "targetScale": 30
    },
    "eligibilityRules": [{ "type": "min_score" | "required_input", "inputKey": string, "min": number, "message": string }]
  }]
}`;

const PROGRAMS_EXTRACTION_PROMPT = `Trích xuất danh sách chương trình/tổ hợp nếu nguồn có dữ liệu.
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

function buildPromptWithHints(input: SynthesizeAdmissionConfigInput): string {
  const hints = [
    `Mã trường: ${input.schoolCode}.`,
    `Tên trường: ${input.schoolName}.`,
    `Năm tuyển sinh: ${input.year}.`,
    input.sourceBundle.sourceUrl ? `Nguồn URL chính: ${input.sourceBundle.sourceUrl}.` : "",
    `Nội dung nguồn đã tổng hợp:\n${input.sourceBundle.promptContext}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return `${EXTRACTION_PROMPT}\n\n${hints}`;
}

function backfillHints(
  parsed: unknown,
  input: SynthesizeAdmissionConfigInput,
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
        : input.schoolName || input.schoolCode,
    year:
      typeof base.year === "number" && Number.isInteger(base.year)
        ? base.year
        : input.year,
    sourceUrl:
      typeof base.sourceUrl === "string" && base.sourceUrl.trim()
        ? base.sourceUrl
        : input.sourceBundle.sourceUrl,
  };
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

async function callGeminiJson(
  input: SynthesizeAdmissionConfigInput,
  prompt: string,
): Promise<Record<string, unknown>> {
  const model = getGeminiModelName();
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  if (input.sourceBundle.primaryPdf) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: input.sourceBundle.primaryPdf.pdfBase64,
      },
    });
  }

  const extraPdfLimit = FAST_MODE ? 0 : 2;
  for (const extraPdf of input.sourceBundle.additionalPdfs.slice(0, extraPdfLimit)) {
    parts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: extraPdf.pdfBase64,
      },
    });
  }

  parts.push({ text: prompt });

  let lastError: Error | null = null;
  const prompts = FAST_MODE
    ? [prompt]
    : [
        prompt,
        `${prompt}\n\nYêu cầu dự phòng: nếu nội dung quá dài, hãy trả JSON tối thiểu nhưng hợp lệ schema và methods không được rỗng.`,
      ];

  for (let i = 0; i < prompts.length; i += 1) {
    const response = await getGeminiClient().models.generateContent({
      model,
      contents: [{ role: "user", parts: [...parts.slice(0, -1), { text: prompts[i] }] }],
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
      return JSON.parse(stripJsonFences(text)) as Record<string, unknown>;
    } catch {
      lastError = new Error("Không phân tích được JSON do AI trả về. Vui lòng thử lại.");
    }
  }

  throw lastError ?? new Error("GEMINI_EMPTY_RESPONSE");
}

export async function synthesizeAdmissionConfig(
  input: SynthesizeAdmissionConfigInput,
): Promise<GenerateAdmissionConfigResult> {
  const warnings: string[] = [];

  const pass1 = await callGeminiJson(input, buildPromptWithHints(input));
  let draft = backfillHints(pass1, input);

  if (!FAST_MODE) {
    try {
      const pass2 = await callGeminiJson(
        input,
        `${PROGRAMS_EXTRACTION_PROMPT}\n\nDữ liệu nguồn:\n${input.sourceBundle.promptContext}`,
      );
      draft = mergePass2IntoDraft(draft, pass2);
      warnings.push("Pass 2: đã merge chương trình/tổ hợp từ nguồn admin cung cấp.");
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
    return {
      draft: validation.config,
      valid: true,
      warnings,
    };
  }

  return {
    draft,
    valid: false,
    warnings: [
      "AI sinh bản nháp chưa đạt chuẩn schema, vui lòng chỉnh sửa trước khi lưu.",
      ...validation.errors,
      ...warnings,
    ],
  };
}

export type { GenericAdmissionConfig };
