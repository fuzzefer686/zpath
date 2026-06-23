import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { generateGeminiJson } from "@/src/lib/ai/geminiClient";
import { validateGeneratedCertificateConfig } from "@/src/lib/certificate-converter";

type SourceInput = {
  type: "url" | "text";
  label?: string;
  value: string;
};

const MAX_SOURCES = 8;
const MAX_URL_CONTENT_CHARS = 8000;
const MAX_TOTAL_PROMPT_CHARS = 28000;

export const runtime = "nodejs";
export const maxDuration = 120;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAllowedUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return false;
    if (
      host.startsWith("10.") ||
      host.startsWith("127.") ||
      host.startsWith("192.168.") ||
      host.startsWith("172.16.") ||
      host.startsWith("172.17.") ||
      host.startsWith("172.18.") ||
      host.startsWith("172.19.") ||
      host.startsWith("172.2") ||
      host === "0.0.0.0"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchUrlText(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "ZPATH-Certificate-Generator/1.0",
    },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Không thể tải URL (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("text") &&
    !contentType.includes("json") &&
    !contentType.includes("xml")
  ) {
    throw new Error("URL không phải nội dung text/html có thể trích xuất.");
  }

  const text = await response.text();
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_URL_CONTENT_CHARS);
}

function parseSources(raw: unknown): SourceInput[] {
  if (!Array.isArray(raw)) return [];
  const parsed: SourceInput[] = [];
  for (const item of raw.slice(0, MAX_SOURCES)) {
    if (!isRecord(item)) continue;
    const type = item.type === "url" ? "url" : item.type === "text" ? "text" : null;
    if (!type) continue;
    const value = isNonEmptyString(item.value) ? item.value.trim() : "";
    if (!value) continue;
    parsed.push({
      type,
      value,
      label: isNonEmptyString(item.label) ? item.label.trim() : undefined,
    });
  }
  return parsed;
}

function buildPrompt(params: {
  schoolCode: string;
  schoolName: string;
  year: number;
  compiledSources: Array<{
    type: "url" | "text";
    label: string;
    content: string;
  }>;
}) {
  const sourcesText = params.compiledSources
    .map((source, index) => {
      return [
        `SOURCE #${index + 1}`,
        `type: ${source.type}`,
        `label: ${source.label}`,
        `content:`,
        source.content,
      ].join("\n");
    })
    .join("\n\n");

  return `
Bạn là chuyên gia tuyển sinh đại học Việt Nam.
Hãy trích xuất cấu hình quy đổi chứng chỉ ngoại ngữ cho trường ${params.schoolName} (${params.schoolCode}), năm ${params.year}.

YÊU CẦU OUTPUT:
- Chỉ trả về JSON hợp lệ, không markdown, không giải thích.
- JSON phải đúng cấu trúc sau:
{
  "schoolCode": "${params.schoolCode}",
  "schoolName": "${params.schoolName}",
  "year": ${params.year},
  "methods": [
    {
      "methodCode": "THPT_WITH_CERT",
      "methodName": "Tên phương thức",
      "applicability": "direct | conditional",
      "note": "optional",
      "sourceEvidence": ["trích đoạn ngắn từ nguồn"],
      "rules": [
        {
          "certificateType": "IELTS_ACADEMIC | TOEIC | TOEFL_IBT | ...",
          "mode": "numeric_range | text_match | toeic_four_skills",
          "scoreField": "subject_score | bonus_score",
          "reason": "Mô tả áp dụng",
          "conditions": ["điều kiện nếu có"],
          "entries": [
            {
              "minScore": 6.5,
              "maxScore": 6.5,
              "textValue": "optional",
              "bandId": "optional",
              "skillName": "listening|speaking|reading|writing (chỉ cho toeic_four_skills)",
              "convertedScore": 9.0
            }
          ]
        }
      ]
    }
  ]
}

QUY TẮC:
- Chỉ trích xuất thông tin có trong nguồn.
- Nếu không chắc chắn, bỏ qua entry đó.
- Không tự bịa phương thức hoặc ngưỡng điểm.
- methodCode dùng UPPER_SNAKE_CASE, ngắn gọn.
- certificateType dùng mã thống nhất: IELTS_ACADEMIC, TOEIC, TOEFL_IBT, TOEFL_ITP, VSTEP, HSK, JLPT, DELF_DALF, TCF.
- mode:
  - numeric_range: khi quy đổi theo dải điểm số.
  - text_match: khi quy đổi theo mức N1/N2/C1/B2...
  - toeic_four_skills: khi yêu cầu đủ 4 kỹ năng TOEIC.

NGUỒN:
${sourcesText}
  `.trim();
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body phải là object." }, { status: 400 });
  }

  const schoolCode = isNonEmptyString(body.schoolCode)
    ? body.schoolCode.trim().toUpperCase()
    : "";
  const schoolName = isNonEmptyString(body.schoolName) ? body.schoolName.trim() : "";
  const year = typeof body.year === "number" && Number.isInteger(body.year) ? body.year : NaN;
  const sources = parseSources(body.sources);

  if (!schoolCode) {
    return NextResponse.json({ error: "Thiếu schoolCode." }, { status: 400 });
  }
  if (!schoolName) {
    return NextResponse.json({ error: "Thiếu schoolName." }, { status: 400 });
  }
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "year phải là số nguyên." }, { status: 400 });
  }
  if (!sources.length) {
    return NextResponse.json(
      { error: "Cần ít nhất một source dạng URL hoặc text." },
      { status: 400 },
    );
  }

  try {
    let usedChars = 0;
    const compiledSources: Array<{
      type: "url" | "text";
      label: string;
      content: string;
    }> = [];
    const sourceReport: Array<{
      type: "url" | "text";
      label: string;
      status: "fetched" | "failed";
      error?: string;
      charCount?: number;
      url?: string;
    }> = [];

    for (const source of sources) {
      if (usedChars >= MAX_TOTAL_PROMPT_CHARS) break;
      if (source.type === "url") {
        const label = source.label ?? source.value;
        if (!isAllowedUrl(source.value)) {
          sourceReport.push({
            type: "url",
            label,
            status: "failed",
            error: "URL không hợp lệ hoặc thuộc dải nội bộ.",
            url: source.value,
          });
          continue;
        }

        try {
          const text = await fetchUrlText(source.value);
          const content = text.slice(0, Math.max(0, MAX_TOTAL_PROMPT_CHARS - usedChars));
          usedChars += content.length;
          compiledSources.push({
            type: "url",
            label,
            content,
          });
          sourceReport.push({
            type: "url",
            label,
            status: "fetched",
            charCount: content.length,
            url: source.value,
          });
        } catch (error) {
          sourceReport.push({
            type: "url",
            label,
            status: "failed",
            error: error instanceof Error ? error.message : "Không thể đọc URL.",
            url: source.value,
          });
        }
        continue;
      }

      const label = source.label ?? "Pasted text";
      const content = source.value.slice(0, Math.max(0, MAX_TOTAL_PROMPT_CHARS - usedChars));
      usedChars += content.length;
      compiledSources.push({
        type: "text",
        label,
        content,
      });
      sourceReport.push({
        type: "text",
        label,
        status: "fetched",
        charCount: content.length,
      });
    }

    if (!compiledSources.length) {
      return NextResponse.json(
        { error: "Không có source hợp lệ để phân tích.", sourceReport },
        { status: 400 },
      );
    }

    const prompt = buildPrompt({
      schoolCode,
      schoolName,
      year,
      compiledSources,
    });
    const generated = await generateGeminiJson(prompt);
    const validation = validateGeneratedCertificateConfig(generated);

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: `AI trả về draft chưa hợp lệ: ${validation.errors.join(" ")}`,
          draft: generated,
          valid: false,
          sourceReport,
          warnings: validation.errors,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      valid: true,
      draft: validation.config,
      sourceReport,
      warnings: [],
      generatedBy: "gemini",
    });
  } catch (error) {
    console.error("Admin certificate converter generate error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể auto-generate cấu hình quy đổi chứng chỉ.",
      },
      { status: 500 },
    );
  }
}
