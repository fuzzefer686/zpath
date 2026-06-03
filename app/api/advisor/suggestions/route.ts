import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { generateGeminiText } from "@/src/lib/ai/geminiVertexClient";
import type { GenerateContentConfig } from "@google/genai";

export const runtime = "nodejs";

const DEFAULT_SUGGESTIONS = [
  "Review ngành Khoa học Máy tính tại Đại học Bách khoa Hà Nội",
  "So sánh ngành Khoa học Máy tính (IT1) và Kỹ thuật Máy tính (IT2)",
  "Học phí ngành Khoa học Máy tính tại HUST là bao nhiêu?",
  "Cơ hội việc làm của ngành Kỹ thuật Phần mềm sau khi tốt nghiệp?",
  "25 điểm tổ hợp A00 nên chọn ngành nào của Đại học Bách khoa?",
];

function stripJsonCodeFence(text: string) {
  const cleaned = text.trim();
  const fenced = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced ? fenced[1].trim() : cleaned;
}

function extractFirstJsonArray(text: string) {
  const cleaned = stripJsonCodeFence(text);
  const start = cleaned.indexOf("[");
  if (start === -1) return cleaned;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) return cleaned.slice(start, index + 1);
    }
  }

  return cleaned.slice(start);
}

function sanitizeJsonArray(text: string) {
  return text
    .replace(/,(\s*[\]}])/g, "$1")
    .replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, value) => {
      const escaped = value.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
      return `"${escaped}"`;
    });
}

function normalizeSuggestionItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((suggestion) => String(suggestion).trim()).filter(Boolean).slice(0, 5);
}

function parseSuggestionsFromGeminiText(responseText: string) {
  const arrayText = extractFirstJsonArray(responseText);

  for (const candidate of [arrayText, sanitizeJsonArray(arrayText)]) {
    try {
      const suggestions = normalizeSuggestionItems(JSON.parse(candidate));
      if (suggestions.length) return suggestions;
    } catch {
      // Try the next recovery strategy.
    }
  }

  return Array.from(arrayText.matchAll(/"((?:[^"\\]|\\.)*)"/g))
    .map((match) => {
      try {
        return JSON.parse(`"${match[1]}"`) as string;
      } catch {
        return match[1].replace(/\\"/g, "\"").trim();
      }
    })
    .filter(Boolean)
    .slice(0, 5);
}

export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS, hasBio: false });
    }

    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("bio")
      .eq("id", auth.user.id)
      .maybeSingle();

    const bio = profile?.bio?.trim();
    if (!bio) {
      return NextResponse.json({
        suggestions: DEFAULT_SUGGESTIONS,
        hasBio: false,
      });
    }

    // Call Gemini to generate personalized suggestions based on bio
    const prompt = `Bạn là ZPath Advisor, chuyên viên tư vấn tuyển sinh đại học và hướng nghiệp tại Việt Nam.
Dưới đây là phần tự mô tả bản thân (bio/profile) của một học sinh:
"${bio}"

Dựa trên thông tin này, hãy tạo ra 5 câu hỏi hướng nghiệp hoặc tư vấn tuyển sinh cụ thể, thiết thực và cá nhân hóa nhất mà học sinh này có thể muốn hỏi ZPath Advisor.
Các câu hỏi này nên liên quan trực tiếp đến sở thích, năng lực, trường hoặc ngành học mà học sinh đề cập trong mô tả bản thân. Nếu mô tả quá ngắn hoặc chung chung, hãy tạo các câu hỏi hướng nghiệp phổ biến nhưng thiết kế gần gũi.

Yêu cầu định dạng phản hồi:
Trả về duy nhất một mảng JSON chứa 5 chuỗi câu hỏi bằng tiếng Việt, ví dụ:
[
  "Câu hỏi 1...",
  "Câu hỏi 2...",
  "Câu hỏi 3...",
  "Câu hỏi 4...",
  "Câu hỏi 5..."
]
Không bao gồm bất kỳ phần text giải thích, không bọc trong markdown block. Chỉ trả về chuỗi JSON hợp lệ.`;

    const config: GenerateContentConfig = {
      responseMimeType: "application/json",
      temperature: 0.6,
      maxOutputTokens: 500,
    };

    const responseText = await generateGeminiText({
      prompt,
      config,
    });

    let suggestions: string[] = [];
    try {
      suggestions = parseSuggestionsFromGeminiText(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini suggestions response:", e);
    }

    if (suggestions.length === 0) {
      suggestions = DEFAULT_SUGGESTIONS;
    }

    return NextResponse.json({ suggestions, hasBio: true });
  } catch (error) {
    console.error("GET /api/advisor/suggestions error:", error);
    return NextResponse.json({ suggestions: DEFAULT_SUGGESTIONS, hasBio: false });
  }
}
