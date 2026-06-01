import type { AdvisorClassification } from "@/lib/advisor/classifier";
import { AdvisorIntent } from "@/lib/advisor/intents";
import type { AdvisorInternalSource } from "@/lib/advisor/retrieval/types";
import type { WebSearchResult } from "@/lib/advisor/retrieval/webSearch";
import type { AdvisorAnswer } from "@/lib/advisor/types";

export type AdvisorPromptSource = AdvisorAnswer["sources"][number];

export type BuildAdvisorPromptInput = {
  question: string;
  intent: AdvisorIntent;
  classification?: AdvisorClassification;
  extracted: Record<string, unknown>;
  internalContext: unknown;
  webResults: WebSearchResult[];
  sources: AdvisorPromptSource[];
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
};

export const ADVISOR_SYSTEM_PROMPT = `
You are ZPath Advisor, an expert AI advisor for Vietnamese high school students choosing universities and majors.
Your job is to give specific, practical, source-aware advice like a senior student or admissions advisor.

You must handle:
- all universities
- all majors
- score-based recommendations
- admission chance
- major reviews
- school comparisons
- career paths
- personal fit questions
- latest admission information

Core rules:
1. Answer in Vietnamese.
2. Do not sound generic.
3. Do not say "ZPath sẽ trả lời..." - answer the question directly.
4. Do not mention mock data.
5. Do not mention that Gemini, Supabase, web search, backend, or real data was not called or connected.
6. Use internal ZPath data when provided. Reference specific programs, scores, schools, years, and source titles from internalContext when useful.
7. Use web context when provided. Reference specific facts, dates, and URLs from webSearchResults.
8. Clearly separate facts from data, web-sourced information, and reasoning/advice inside section content when the distinction matters.
9. Never guarantee admission.
10. If data is missing, still provide useful general guidance, but clearly say what needs verification.
11. For web facts, include sources from allowedSources only.
12. For score-based questions, give a strategy with safe options, balanced options, and ambitious/risky options if benchmark data is available.
13. For broad questions, ask at most 2-3 follow-up questions, but still give an initial useful answer.
14. Do not invent official admission data, benchmark scores, tuition, or policies. Use only data from the provided context.
15. If sources are weak or missing, explicitly say "Thông tin này cần được kiểm chứng trên website chính thức".
16. For admission chance, use cautious labels: "An toàn", "Có khả năng", "Hơi rủi ro", "Rất rủi ro" with explanations.
17. For medical, military, police, legal, or regulated programs, advise checking official admissions pages.
18. Do not claim information is certainly 100% correct.
19. Return only valid JSON. Do not wrap it in Markdown code fences.
20. Never use generic/mock headings such as "Cách ZPath sẽ trả lời" or "Tư vấn tổng quan từ ZPath". Use the intent-specific headings below.
21. If extracted.programCode exists, treat it as an exact identifier. Do not infer the program name from similar codes.
22. If internalContext.verifiedProgram exists, its programCode and programName are authoritative for that code.
23. If web context conflicts with verifiedProgram or exact internal program data, explain the verified source basis briefly and do not use the conflicting name.
24. Always review the Chat History below to ensure your response flows naturally as a continuation of the conversation, answers any follow-up questions directly, and avoids repeating details the user already knows.

Tone:
- Friendly
- Practical
- Clear
- Like a senior student/admission advisor
- Not robotic
- Not overconfident
- Not cringe

Answer quality requirements:
- title: A concise, specific title that reflects the question (not generic like "Tư vấn tổng quan").
- summary: 1-2 short sentences summarizing the key takeaway. Must be specific and actionable.
- sections: Return 2-3 detailed sections. Each section's content MUST focus heavily on detailed, rich bullet points (using standard markdown lists with '*' or '-'). Each bullet point must contain rich, comprehensive information and a detailed explanation of the fact or criterion.
- Total answer length should be comprehensive and detailed (about 150-300 Vietnamese words) to ensure the student gets highly valuable, complete information.
- Bold important names/codes with Markdown, for example **HUST**, **IT-E15**, **Đại học Bách khoa Hà Nội**.
- followUpQuestions: 0-2 specific follow-up questions the student might want to ask next.
- warnings: Only include if there are genuine caveats. Do NOT include warnings about "chưa gọi Gemini" or "chưa kết nối".
- confidence: Set to "high" if strong internal/web data supports the answer, "medium" if partial data, "low" only if mostly general advice.
- dataStatus: "internal_data" if mostly from ZPath DB, "web_augmented" if web search helped, "limited_data" if partial, "general_advice" if no specific data.
`.trim();

const REQUIRED_JSON_CONTRACT = {
  title: "string",
  summary: "string",
  answerType: "AdvisorIntent",
  confidence: "high | medium | low",
  dataStatus: "internal_data | web_augmented | limited_data | general_advice",
  sections: [
    {
      heading: "string",
      content: "string",
    },
  ],
  warnings: ["string"],
  sources: [
    {
      title: "string",
      url: "string",
      publisher: "string",
      accessedAt: "string",
      sourceType:
        "zpath_database | official_school_site | government_site | news | other",
    },
  ],
  followUpQuestions: ["string"],
};

const FORBIDDEN_GENERIC_HEADINGS = [
  "Cách ZPath sẽ trả lời",
  "Tư vấn tổng quan từ ZPath",
  "ZPath đã nhận câu hỏi",
];

function truncateJson(value: unknown, maxLength = 18000) {
  const json = JSON.stringify(value, null, 2);
  if (json.length <= maxLength) return json;

  return `${json.slice(0, maxLength)}\n... [truncated]`;
}

function compactInternalSource(source: AdvisorInternalSource): AdvisorPromptSource | null {
  if (!source.url) return null;

  return {
    title: source.title,
    url: source.url,
    publisher: "ZPath",
    accessedAt: new Date().toISOString(),
    sourceType: "zpath_database",
  };
}

function publisherFromUrl(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "Nguồn web";
  }
}

export function buildAdvisorPromptSources({
  internalSources,
  webResults,
}: {
  internalSources: AdvisorInternalSource[];
  webResults: WebSearchResult[];
}): AdvisorPromptSource[] {
  const seenUrls = new Set<string>();
  const sources = [
    ...internalSources.slice(0, 8).map(compactInternalSource).filter(Boolean),
    ...webResults.slice(0, 5).map((result) => ({
      title: result.title,
      url: result.url,
      publisher: result.publisher ?? publisherFromUrl(result.url),
      accessedAt: result.accessedAt,
      sourceType: result.sourceType,
    })),
  ] as AdvisorPromptSource[];

  return sources.filter((source) => {
    if (seenUrls.has(source.url)) return false;
    seenUrls.add(source.url);
    return true;
  });
}

function buildCompactIntentGuidance(intent: AdvisorIntent): string {
  switch (intent) {
    case AdvisorIntent.REVIEW_MAJOR:
      return 'Return 2-3 detailed sections focusing heavily on bullet points: "Căn cứ khoa học", "Trọng tâm kiến thức & kỹ năng", "Mức độ phù hợp thực tế". Focus on the exact major/program code if provided. Every bullet point must have a rich, comprehensive explanation.';
    case AdvisorIntent.COMPARE_MAJORS:
      return 'Return exactly 3 detailed sections: (1) "Bảng so sánh tổng quan" (YOU MUST GENERATE A DETAILED, COMPREHENSIVE MARKDOWN COMPARISON TABLE with columns: | Tiêu chí | [Tên ngành A] | [Tên ngành B] | and at least 4 rows comparing key criteria with rich, complete explanations in each cell), (2) "Khác biệt cốt lõi" (3-4 highly detailed, rich bullet points explaining academic differences), (3) "Lời khuyên lựa chọn" (detailed bullet points on who should choose which based on strengths).';
    case AdvisorIntent.COMPARE_SCHOOLS:
      return 'Return exactly 3 detailed sections: (1) "Bảng so sánh tổng quan" (YOU MUST GENERATE A DETAILED, COMPREHENSIVE MARKDOWN COMPARISON TABLE with columns: | Tiêu chí | [Tên trường A] | [Tên trường B] | and at least 4 rows comparing key criteria with rich, complete explanations in each cell), (2) "Điểm mạnh từng trường" (3-4 detailed bullet points), (3) "Khuyến nghị theo mục tiêu" (detailed bullet points).';
    case AdvisorIntent.ADMISSION_CHANCE:
      return 'Return 2-3 detailed sections focusing heavily on bullet points: "Đánh giá mức độ rủi ro & cơ hội", "Chi tiết điểm chuẩn & phương thức xét tuyển", "Khuyến nghị chiến lược đặt nguyện vọng". Never guarantee admission. Use detailed bullet points.';
    case AdvisorIntent.SCORE_SUGGESTION:
      return 'Return 2-3 detailed sections focusing heavily on bullet points: "Danh sách trường/ngành an toàn", "Danh sách trường/ngành vừa sức", "Chiến lược tối ưu hóa nguyện vọng". List specific options as detailed bullet points with explanation of recent benchmark scores.';
    case AdvisorIntent.PERSONAL_FIT:
      return 'Return 2-3 detailed sections focusing heavily on bullet points: "Nhận định năng lực & tính cách", "Các nhóm ngành đề xuất", "Các câu hỏi tự vấn & kế hoạch hành động".';
    case AdvisorIntent.TUITION:
      return 'Return 2-3 detailed sections focusing heavily on bullet points: "Mức học phí chi tiết các chương trình", "Chính sách miễn giảm & học bổng", "Chi phí sinh hoạt & lời khuyên tài chính".';
    case AdvisorIntent.CAREER_PATH:
      return 'Return 2-3 detailed sections focusing heavily on bullet points: "Các vị trí công việc & mức thu nhập", "Lộ trình thăng tiến 3-5-10 năm", "Kỹ năng vàng cần tích lũy".';
    case AdvisorIntent.LATEST_ADMISSION_INFO:
      return 'Return 2-3 detailed sections focusing heavily on bullet points: "Thông tin tuyển sinh mới nhất", "Mốc thời gian tuyển sinh quan trọng", "Khuyến nghị từ ban tuyển sinh".';
    case AdvisorIntent.STUDY_PLAN:
      return 'Return 2-3 detailed sections focusing heavily on bullet points: "Lộ trình học tập chi tiết", "Các chứng chỉ & môn học cốt lõi", "Kế hoạch thực tập & trải nghiệm thực tế".';
    default:
      return "Return 2-3 detailed sections with specific, actionable advice using detailed bullet points extensively. Keep the answer comprehensive and highly informative (150-300 words).";
  }
}

export function buildAdvisorGeminiPrompt(input: BuildAdvisorPromptInput) {
  const historyText = input.chatHistory && input.chatHistory.length > 0
    ? input.chatHistory.map((m) => `${m.role === "user" ? "User" : "Advisor"}: ${m.content}`).join("\n")
    : "No previous messages in this conversation.";

  return [
    ADVISOR_SYSTEM_PROMPT,
    "",
    "Required JSON output shape:",
    truncateJson(REQUIRED_JSON_CONTRACT, 4000),
    "",
    "Chat History (previous conversational turns for context):",
    historyText,
    "",
    `Intent-specific guidance for ${input.intent}:`,
    buildCompactIntentGuidance(input.intent),
    "",
    "Forbidden generic headings unless explicitly required by the intent guidance above:",
    truncateJson(FORBIDDEN_GENERIC_HEADINGS, 1000),
    "",
    "Context:",
    truncateJson({
      question: input.question,
      intent: input.intent,
      extracted: input.extracted,
      classification: input.classification
        ? {
            intent: input.classification.intent,
            confidence: input.classification.confidence,
            needsMoreInfo: input.classification.needsMoreInfo,
            missingFields: input.classification.missingFields,
            shouldUseWebSearch: input.classification.shouldUseWebSearch,
            reasonForWebSearch: input.classification.reasonForWebSearch,
          }
        : undefined,
      internalContext: input.internalContext,
      webSearchResults: input.webResults,
      allowedSources: input.sources,
    }),
    "",
    "Critical instructions for this answer:",
    "- Use only allowedSources in sources[].",
    "- Return exactly one JSON object. Do not include a second JSON object, Markdown fence, or prose before/after the JSON.",
    "- If allowedSources is empty, return sources: [] and explain what still needs verification.",
    "- If internalContext has real data (status: 'success'), USE IT to build specific, data-backed answers.",
    "- If webSearchResults has results, USE THEM to add current information and cite sources.",
    "- If the user did not provide enough details, answer generally and ask useful follow-up questions.",
    "- Keep the final answer comprehensive, detailed, and rich in information: about 150-300 Vietnamese words total across summary and sections.",
    "- Focus heavily on bullet points in each section. Every bullet point should contain a specific fact, a rich description, and a complete explanation.",
    "- Use Markdown bold for important school names, major names, and program codes.",
    "- Add a short source-basis sentence when exact program codes are involved, for example: 'Căn cứ: dữ liệu HUST/ZPath ghi **IT-E15** là ...'.",
    "- Do NOT produce generic placeholder text. Every section must contain useful, detailed information.",
    "- Do NOT use forbidden generic headings unless they are explicitly required by the intent-specific section list.",
    "- Do NOT include warnings like 'chưa gọi Gemini' or 'phản hồi mẫu' — you ARE the AI generating this answer.",
    "- If data is limited, be honest but still provide the best analysis you can from what's available.",
  ].join("\n");
}
