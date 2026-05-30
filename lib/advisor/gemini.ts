import "server-only";

import type { GenerateContentConfig } from "@google/genai";

import { AdvisorIntent } from "@/lib/advisor/intents";
import { buildAdvisorGeminiPrompt } from "@/lib/advisor/prompts";
import { generateGeminiText } from "@/src/lib/ai/geminiVertexClient";
import type {
  AdvisorPromptSource,
  BuildAdvisorPromptInput,
} from "@/lib/advisor/prompts";
import type {
  AdvisorAnswer,
  AdvisorAnswerConfidence,
  AdvisorAnswerDataStatus,
  AdvisorQuestionTemplate,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";

type GeminiAdvisorInput = BuildAdvisorPromptInput & {
  template: AdvisorQuestionTemplate | null;
  values?: AdvisorTemplateValues;
};

type ValidationResult =
  | { success: true; answer: AdvisorAnswer }
  | { success: false; reason: string };

const CONFIDENCE_VALUES: AdvisorAnswerConfidence[] = ["high", "medium", "low"];
const DATA_STATUS_VALUES: AdvisorAnswerDataStatus[] = [
  "internal_data",
  "web_augmented",
  "limited_data",
  "general_advice",
];

function stripJsonCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function parseGeminiJson(text: string): unknown {
  try {
    return JSON.parse(stripJsonCodeFence(text));
  } catch {
    throw new Error("GEMINI_JSON_PARSE_FAILED");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => readString(item))
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeSources(
  value: unknown,
  allowedSources: AdvisorPromptSource[],
) {
  const allowedByUrl = new Map(allowedSources.map((source) => [source.url, source]));
  const modelSources = Array.isArray(value) ? value : [];
  const normalized: AdvisorAnswer["sources"] = [];

  for (const item of modelSources) {
    if (!isRecord(item)) continue;

    const url = readString(item.url);
    const allowedSource = allowedByUrl.get(url);
    if (!allowedSource) continue;

    normalized.push({
      title: readString(item.title, allowedSource.title),
      url: allowedSource.url,
      publisher: readString(item.publisher, allowedSource.publisher),
      accessedAt: readString(item.accessedAt, allowedSource.accessedAt),
      sourceType: allowedSource.sourceType,
    });
  }

  for (const source of allowedSources) {
    if (normalized.some((item) => item.url === source.url)) continue;
    normalized.push(source);
  }

  return normalized.slice(0, 12);
}

function normalizeSections(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((section) => {
      if (!isRecord(section)) return null;
      const heading = readString(section.heading);
      const content = readString(section.content);
      if (!heading || !content) return null;
      return { heading, content };
    })
    .filter((section): section is { heading: string; content: string } =>
      Boolean(section),
    )
    .slice(0, 3);
}

export function validateAdvisorAnswerJson({
  raw,
  expectedIntent,
  allowedSources,
}: {
  raw: unknown;
  expectedIntent: AdvisorIntent;
  allowedSources: AdvisorPromptSource[];
}): ValidationResult {
  if (!isRecord(raw)) {
    return { success: false, reason: "Model output is not an object." };
  }

  const title = readString(raw.title);
  const summary = readString(raw.summary);
  const sections = normalizeSections(raw.sections);
  const answerType = (Object.values(AdvisorIntent) as string[]).includes(raw.answerType as string)
    ? (raw.answerType as AdvisorIntent)
    : expectedIntent;
  const confidence = CONFIDENCE_VALUES.includes(raw.confidence as AdvisorAnswerConfidence)
    ? (raw.confidence as AdvisorAnswerConfidence)
    : "low";
  const dataStatus = DATA_STATUS_VALUES.includes(raw.dataStatus as AdvisorAnswerDataStatus)
    ? (raw.dataStatus as AdvisorAnswerDataStatus)
    : allowedSources.length
      ? "limited_data"
      : "general_advice";

  if (!title || !summary || !sections.length) {
    return {
      success: false,
      reason: "Model output is missing required answer fields.",
    };
  }

  return {
    success: true,
    answer: {
      title,
      summary,
      answerType,
      confidence,
      dataStatus,
      sections,
      warnings: readStringArray(raw.warnings),
      sources: normalizeSources(raw.sources, allowedSources),
      followUpQuestions: readStringArray(raw.followUpQuestions).slice(0, 2),
    },
  };
}

// ---------------------------------------------------------------------------
// Production-quality safe fallback (replaces the old mock-based fallback).
//
// This is used ONLY when Gemini genuinely fails (network error, auth error,
// JSON parse error, etc.). It produces a helpful, intent-aware response that
// acknowledges the limitation without looking like a placeholder/mock.
// ---------------------------------------------------------------------------

function buildFallbackSections(
  question: string,
  intent: AdvisorIntent,
  extracted: Record<string, unknown>,
): AdvisorAnswer["sections"] {
  const schoolName = (extracted.schoolName as string) ?? (extracted.schoolCode as string) ?? "";
  const majorName =
    (extracted.majorName as string) ?? (extracted.programCode as string) ?? "";
  const score = extracted.score as number | undefined;
  const combination = (extracted.combination as string) ?? "";

  switch (intent) {
    case AdvisorIntent.REVIEW_MAJOR:
      return [
        {
          heading: `Thông tin về ${majorName || "ngành học"}`,
          content: majorName
            ? `Hiện tại ZPath chưa thể phân tích chi tiết ngành ${majorName}${schoolName ? ` tại ${schoolName}` : ""} do lỗi kết nối AI. Tuy nhiên, bạn có thể tìm hiểu thêm trực tiếp trên website chính thức của trường hoặc trang tuyển sinh của Bộ GD&ĐT.`
            : "Bạn chưa cung cấp tên ngành cụ thể. Hãy cho ZPath biết ngành bạn quan tâm để nhận được tư vấn chính xác hơn.",
        },
        {
          heading: "Gợi ý bước tiếp theo",
          content: "Bạn nên kiểm tra: (1) Chương trình đào tạo chi tiết trên website trường, (2) Điểm chuẩn các năm gần nhất, (3) Cơ hội việc làm thực tế của cựu sinh viên, (4) Học phí và chính sách hỗ trợ tài chính.",
        },
      ];

    case AdvisorIntent.ADMISSION_CHANCE:
      return [
        {
          heading: "Đánh giá cơ hội",
          content: score
            ? `Với ${score} điểm${combination ? ` tổ hợp ${combination}` : ""}${schoolName ? ` vào ${schoolName}` : ""}${majorName ? ` ngành ${majorName}` : ""}, ZPath chưa thể tính toán chi tiết do lỗi kết nối. Bạn nên so sánh điểm này với điểm chuẩn các năm gần nhất trên trang tuyển sinh chính thức của trường.`
            : "Bạn cần cung cấp điểm số, tổ hợp xét tuyển, và trường/ngành quan tâm để ZPath ước tính cơ hội.",
        },
        {
          heading: "Lưu ý quan trọng",
          content: "Điểm chuẩn thay đổi hàng năm tùy thuộc vào độ khó đề thi, số lượng thí sinh và chỉ tiêu tuyển sinh. Hãy luôn chuẩn bị danh sách gồm trường an toàn, vừa tầm và thử sức.",
        },
      ];

    case AdvisorIntent.SCORE_SUGGESTION:
      return [
        {
          heading: "Gợi ý lựa chọn",
          content: score
            ? `Với ${score} điểm${combination ? ` ${combination}` : ""}, có nhiều lựa chọn trường và ngành phù hợp. ZPath chưa thể phân tích chi tiết do lỗi kết nối AI, nhưng bạn nên tham khảo bảng điểm chuẩn tổng hợp trên các trang tuyển sinh uy tín.`
            : "Hãy cho ZPath biết điểm số và tổ hợp xét tuyển của bạn để nhận gợi ý trường/ngành cụ thể.",
        },
        {
          heading: "Cách chọn trường phù hợp",
          content: "Nên chia danh sách nguyện vọng thành 3 nhóm: (1) Nhóm an toàn — điểm chuẩn thấp hơn điểm bạn 1-2 điểm, (2) Nhóm vừa tầm — điểm chuẩn xấp xỉ, (3) Nhóm thử sức — điểm chuẩn cao hơn nhưng bạn vẫn muốn thử.",
        },
      ];

    case AdvisorIntent.COMPARE_MAJORS:
      return [
        {
          heading: "So sánh ngành học",
          content: `ZPath chưa thể thực hiện so sánh chi tiết${(extracted.majorA || extracted.majorB) ? ` giữa ${extracted.majorA ?? ""} và ${extracted.majorB ?? ""}` : ""} do lỗi kết nối AI. Khi so sánh ngành, bạn nên xem xét: nội dung đào tạo, điểm chuẩn, cơ hội việc làm, mức lương khởi điểm, và khả năng chuyển ngành.`,
        },
      ];

    case AdvisorIntent.COMPARE_SCHOOLS:
      return [
        {
          heading: "So sánh trường",
          content: `ZPath chưa thể thực hiện so sánh chi tiết${(extracted.schoolA || extracted.schoolB) ? ` giữa ${extracted.schoolA ?? ""} và ${extracted.schoolB ?? ""}` : ""} do lỗi kết nối AI. Khi so sánh trường, bạn nên xem xét: uy tín chương trình đào tạo, cơ sở vật chất, học phí, vị trí địa lý, mạng lưới cựu sinh viên, và cơ hội thực tập.`,
        },
      ];

    case AdvisorIntent.TUITION:
      return [
        {
          heading: "Thông tin học phí",
          content: `ZPath chưa thể tra cứu chi tiết học phí${majorName ? ` ngành ${majorName}` : ""}${schoolName ? ` tại ${schoolName}` : ""} do lỗi kết nối. Bạn nên kiểm tra trực tiếp trên website chính thức của trường hoặc liên hệ phòng tuyển sinh để có thông tin chính xác nhất.`,
        },
        {
          heading: "Lưu ý về học phí",
          content: "Học phí có thể thay đổi theo từng năm, hình thức đào tạo (chính quy/chất lượng cao/quốc tế), và chính sách miễn giảm. Đừng quên tìm hiểu về học bổng và chính sách hỗ trợ tài chính của trường.",
        },
      ];

    case AdvisorIntent.CAREER_PATH:
      return [
        {
          heading: "Cơ hội nghề nghiệp",
          content: majorName
            ? `ZPath chưa thể phân tích chi tiết cơ hội nghề nghiệp ngành ${majorName} do lỗi kết nối AI. Bạn nên tham khảo các nguồn: báo cáo thị trường lao động, trang việc làm, và ý kiến cựu sinh viên ngành này.`
            : "Hãy cho ZPath biết ngành bạn quan tâm để nhận phân tích cơ hội nghề nghiệp cụ thể.",
        },
      ];

    case AdvisorIntent.LATEST_ADMISSION_INFO:
      return [
        {
          heading: "Thông tin tuyển sinh",
          content: `ZPath chưa thể cập nhật thông tin tuyển sinh mới nhất${schoolName ? ` của ${schoolName}` : ""} do lỗi kết nối AI. Bạn nên truy cập trực tiếp website tuyển sinh chính thức của trường hoặc cổng thông tin tuyển sinh của Bộ GD&ĐT để xem đề án tuyển sinh, phương thức xét tuyển và lịch đăng ký.`,
        },
      ];

    case AdvisorIntent.PERSONAL_FIT:
      return [
        {
          heading: "Đánh giá phù hợp",
          content: "ZPath chưa thể đánh giá mức độ phù hợp ngành học với bạn do lỗi kết nối AI. Để tự đánh giá sơ bộ, hãy xem xét: (1) Sở thích — bạn thích làm gì trong thời gian rảnh? (2) Điểm mạnh — môn nào bạn học tốt nhất? (3) Giá trị — bạn ưu tiên thu nhập, đam mê hay cân bằng cuộc sống?",
        },
      ];

    case AdvisorIntent.STUDY_PLAN:
      return [
        {
          heading: "Kế hoạch học tập",
          content: majorName
            ? `ZPath chưa thể xây dựng kế hoạch học tập chi tiết cho ngành ${majorName} do lỗi kết nối AI. Bạn nên tham khảo chương trình đào tạo chi tiết trên website trường để hiểu rõ các học phần cần hoàn thành.`
            : "Hãy cho ZPath biết ngành và trường bạn quan tâm để nhận kế hoạch học tập phù hợp.",
        },
      ];

    default:
      return [
        {
          heading: "Trả lời câu hỏi của bạn",
          content: `ZPath đã nhận câu hỏi: "${question.slice(0, 120)}${question.length > 120 ? "..." : ""}". Hiện tại hệ thống AI đang gặp sự cố kết nối nên chưa thể phân tích đầy đủ. Bạn có thể thử lại sau ít phút hoặc đặt câu hỏi cụ thể hơn.`,
        },
        {
          heading: "Gợi ý trong khi chờ",
          content: "Bạn có thể tham khảo: (1) Website chính thức các trường đại học, (2) Cổng thông tin tuyển sinh Bộ GD&ĐT, (3) Các trang tổng hợp điểm chuẩn và thông tin tuyển sinh uy tín.",
        },
      ];
  }
}

function buildFallbackFollowUpQuestions(
  intent: AdvisorIntent,
  extracted: Record<string, unknown>,
): string[] {
  const majorName =
    (extracted.majorName as string) ?? (extracted.programCode as string) ?? "";
  const schoolName = (extracted.schoolName as string) ?? "";

  const generic = [
    "Em nên cung cấp thêm thông tin gì để ZPath tư vấn tốt hơn?",
    "Có thể giúp em tìm hiểu về trường/ngành nào khác?",
  ];

  switch (intent) {
    case AdvisorIntent.REVIEW_MAJOR:
      return [
        majorName ? `Ngành ${majorName} phù hợp với kiểu học sinh nào?` : "Em quan tâm ngành nào?",
        schoolName ? `Điểm chuẩn ${majorName || "ngành này"} tại ${schoolName}?` : `Trường nào mạnh về ${majorName || "ngành này"}?`,
        ...generic.slice(0, 1),
      ];
    case AdvisorIntent.ADMISSION_CHANCE:
    case AdvisorIntent.SCORE_SUGGESTION:
      return [
        "Nên chọn ngành trước hay chọn trường trước?",
        "Cách đọc điểm chuẩn theo từng phương thức xét tuyển?",
        ...generic.slice(0, 1),
      ];
    default:
      return generic;
  }
}

function buildFallbackTitle(
  intent: AdvisorIntent,
  extracted: Record<string, unknown>,
  question: string,
): string {
  const schoolName = (extracted.schoolName as string) ?? "";
  const majorName =
    (extracted.majorName as string) ?? (extracted.programCode as string) ?? "";
  const score = extracted.score as number | undefined;

  switch (intent) {
    case AdvisorIntent.REVIEW_MAJOR:
      return `Thông tin về ${majorName || "ngành học"}${schoolName ? ` tại ${schoolName}` : ""}`;
    case AdvisorIntent.ADMISSION_CHANCE:
      return `Đánh giá cơ hội${score ? ` với ${score} điểm` : ""}${schoolName ? ` vào ${schoolName}` : ""}`;
    case AdvisorIntent.SCORE_SUGGESTION:
      return `Gợi ý trường/ngành${score ? ` cho ${score} điểm` : ""}`;
    case AdvisorIntent.COMPARE_MAJORS:
      return `So sánh ${(extracted.majorA as string) ?? ""} và ${(extracted.majorB as string) ?? ""}`.trim();
    case AdvisorIntent.COMPARE_SCHOOLS:
      return `So sánh ${(extracted.schoolA as string) ?? ""} và ${(extracted.schoolB as string) ?? ""}`.trim();
    case AdvisorIntent.TUITION:
      return `Học phí${majorName ? ` ngành ${majorName}` : ""}${schoolName ? ` tại ${schoolName}` : ""}`;
    case AdvisorIntent.CAREER_PATH:
      return `Cơ hội nghề nghiệp${majorName ? ` ngành ${majorName}` : ""}`;
    case AdvisorIntent.LATEST_ADMISSION_INFO:
      return `Thông tin tuyển sinh${schoolName ? ` ${schoolName}` : ""}`;
    case AdvisorIntent.PERSONAL_FIT:
      return "Đánh giá ngành phù hợp";
    case AdvisorIntent.STUDY_PLAN:
      return `Kế hoạch học tập${majorName ? ` ngành ${majorName}` : ""}`;
    default:
      return question.length > 60 ? `${question.slice(0, 57)}...` : question;
  }
}

export function createSafeFallbackAdvisorAnswer({
  question,
  intent,
  extracted,
  sources,
}: {
  question: string;
  intent: AdvisorIntent;
  extracted: Record<string, unknown>;
  template: AdvisorQuestionTemplate | null;
  values?: AdvisorTemplateValues;
  sources: AdvisorPromptSource[];
}): AdvisorAnswer {
  return {
    title: buildFallbackTitle(intent, extracted, question),
    summary: "ZPath tạm thời không thể kết nối AI để phân tích chi tiết. Dưới đây là hướng dẫn sơ bộ dựa trên câu hỏi của bạn. Hãy thử lại sau ít phút để nhận tư vấn đầy đủ hơn.",
    answerType: intent,
    confidence: "low",
    dataStatus: sources.length ? "limited_data" : "general_advice",
    sections: buildFallbackSections(question, intent, extracted),
    warnings: [
      "ZPath đang gặp sự cố kết nối AI nên câu trả lời chưa đầy đủ. Hãy thử lại sau ít phút.",
    ],
    sources,
    followUpQuestions: buildFallbackFollowUpQuestions(intent, extracted),
  };
}

export async function generateAdvisorAnswerWithGemini(
  input: GeminiAdvisorInput,
): Promise<AdvisorAnswer> {
  const prompt = buildAdvisorGeminiPrompt(input);
  const config: GenerateContentConfig = {
    responseMimeType: "application/json",
    temperature: 0.2,
    maxOutputTokens: 2048,
  };

  const text = await generateGeminiText({
    prompt,
    config,
  });

  const raw = parseGeminiJson(text);
  const validation = validateAdvisorAnswerJson({
    raw,
    expectedIntent: input.intent,
    allowedSources: input.sources,
  });

  if (!validation.success) {
    throw new Error("GEMINI_INVALID_ADVISOR_ANSWER");
  }

  return validation.answer;
}
