import "server-only";

import { getGeminiClient, getGeminiModelName } from "@/src/lib/ai/geminiVertexClient";
import {
  validateAdmissionConfig,
  type GenericAdmissionConfig,
} from "@/src/lib/admission-engine/generic";

export type ExtractAdmissionConfigInput = {
  pdfBase64: string;
  schoolCode: string;
  schoolName?: string;
  year: number;
};

export type ExtractAdmissionConfigResult = {
  /** Best-effort config (may still need admin correction). */
  draft: unknown;
  /** True when the draft passes strict schema validation as-is. */
  valid: boolean;
  /** Validation/normalization notes for the admin to review. */
  warnings: string[];
};

const EXTRACTION_PROMPT = `Bạn là trợ lý trích xuất dữ liệu tuyển sinh. Đọc file PDF đề án tuyển sinh đính kèm và trích xuất ra một CẤU HÌNH TÍNH ĐIỂM dạng JSON đúng theo schema dưới đây.

QUAN TRỌNG:
- Chỉ trả về JSON, không kèm giải thích, không markdown.
- Nếu không chắc một con số, hãy bỏ qua trường đó thay vì bịa.
- Mọi công thức cuối cùng phải quy về thang 30 (targetScale 30 cho weighted_combination, hoặc dùng scale_conversion từ thang gốc về 30).
- Đơn vị điểm môn học là thang 10.

Schema:
{
  "schoolCode": string,        // mã trường viết HOA, ví dụ "HUST"
  "schoolName": string,        // tên đầy đủ của trường
  "year": number,              // năm tuyển sinh
  "disclaimer": string,        // (tùy chọn) lưu ý cho người dùng
  "sourceUrl": string,         // (tùy chọn) link nguồn
  "methods": [
    {
      "methodCode": string,    // mã phương thức, ví dụ "THPT", "DGNL", "SAT"
      "methodName": string,    // tên phương thức
      "description": string,   // (tùy chọn)
      "inputs": [
        {
          "key": string,                 // khóa duy nhất, không dấu, ví dụ "math"
          "label": string,               // nhãn hiển thị tiếng Việt
          "type": "number" | "certificate" | "select",
          "required": boolean,
          "min": number,                 // (tùy chọn) ví dụ 0
          "max": number,                 // (tùy chọn) ví dụ 10
          "unit": string,                // (tùy chọn)
          "options": [{ "value": string, "label": string }],   // chỉ cho type "select"
          "certificateLevels": [{ "band": number, "convertedScore": number }] // chỉ cho "certificate"
        }
      ],
      "formula": {
        "type": "weighted_combination",
        "terms": [{ "inputKey": string, "weight": number }],
        "targetScale": 30
      },
      // HOẶC
      "formula": {
        "type": "scale_conversion",
        "inputKey": string,
        "fromScale": number   // thang gốc của bài thi, ví dụ 100 (TSA), 150 (HSA), 1600 (SAT)
      },
      "priorityInputKey": string,   // (tùy chọn) khóa input điểm ưu tiên cộng sau công thức
      "bonusInputKeys": [string],   // (tùy chọn) các khóa input điểm thưởng cộng sau công thức
      "benchmark30": number         // (tùy chọn) điểm chuẩn tham chiếu đã quy về thang 30
    }
  ]
}

Gợi ý: nếu một input được dùng trong "terms"/"priorityInputKey"/"bonusInputKeys" thì phải khai báo nó trong "inputs" của cùng method.`;

function buildPromptWithHints(input: ExtractAdmissionConfigInput): string {
  const hints = [
    `Mã trường gợi ý: ${input.schoolCode}.`,
    input.schoolName ? `Tên trường gợi ý: ${input.schoolName}.` : "",
    `Năm tuyển sinh gợi ý: ${input.year}.`,
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

/**
 * Sends the PDF to Gemini (multimodal) and asks for a draft admission config.
 * The result is ALWAYS a draft: it is validated but never auto-published. The
 * admin reviews and corrects it before publishing.
 */
export async function extractAdmissionConfigFromPdf(
  input: ExtractAdmissionConfigInput,
): Promise<ExtractAdmissionConfigResult> {
  const model = getGeminiModelName();
  const response = await getGeminiClient().models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: input.pdfBase64,
            },
          },
          { text: buildPromptWithHints(input) },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

  const text = readResponseText(response);
  if (!text) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    throw new Error("Không phân tích được JSON do AI trả về. Vui lòng thử lại.");
  }

  // Backfill the hints so the draft is at least addressable even if the model
  // omitted them. The admin can still edit these.
  const draft = backfillHints(parsed, input);

  const validation = validateAdmissionConfig(draft);
  if (validation.ok) {
    return { draft: validation.config, valid: true, warnings: [] };
  }

  return {
    draft,
    valid: false,
    warnings: [
      "AI trích xuất chưa đạt chuẩn schema, vui lòng kiểm tra và chỉnh sửa trước khi lưu.",
      ...validation.errors,
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
