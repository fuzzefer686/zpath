import { NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

import {
  createMockAdvisorAnswer,
  generateVietnameseQuestion,
} from "@/lib/advisor/answer";
import {
  classifyAdvisorQuestion,
  type AdvisorClassification,
} from "@/lib/advisor/classifier";
import {
  createSafeFallbackAdvisorAnswer,
  generateAdvisorAnswerWithGemini,
} from "@/lib/advisor/gemini";
import { AdvisorIntent } from "@/lib/advisor/intents";
import {
  classifyMajorKnowledgeIntentWithGemini,
  mapMajorKnowledgeIntentToAdvisorIntent,
} from "@/lib/advisor/majorKnowledgeClassifier";
import { buildMajorKnowledgeContext } from "@/lib/advisor/majorKnowledge";
import {
  buildAdvisorPromptSources,
  type AdvisorPromptSource,
} from "@/lib/advisor/prompts";
import {
  persistAdvisorClarificationAnswers,
  persistAdvisorClarificationPrompt,
  persistAdvisorExchange,
} from "@/lib/advisor/persistence";
import { buildVerifiedAdvisorFacts } from "@/lib/advisor/verifiedFacts";
import {
  getAdmissionData,
  getBenchmarkScores,
  getMajorProfile,
  getSchoolProfile,
  getTuitionData,
  searchMajors,
  searchSchools,
  suggestMajorsByScore,
} from "@/lib/advisor/retrieval/internal";
import {
  buildAdvisorWebSearchQueries,
  queryPrefersOfficialSources,
  shouldUseAdvisorWebSearch,
} from "@/lib/advisor/retrieval/queryBuilder";
import type {
  AdvisorInternalSource,
  AdvisorRetrievalStatus,
} from "@/lib/advisor/retrieval/types";
import {
  getAdvisorWebSearchProvider,
  searchWebForAdvisorQueries,
  type WebSearchResult,
} from "@/lib/advisor/retrieval/webSearch";
import {
  parseAdvisorAnswerRequest,
  validateAdvisorTemplateFields,
} from "@/lib/advisor/schemas";
import { canonicalizeAdvisorProgramCode } from "@/lib/advisor/programCodes";
import { getAdvisorTemplateById } from "@/lib/advisor/templates";
import type {
  AdvisorAnswer,
  AdvisorClarificationAnswer,
  AdvisorClarificationQuestion,
  AdvisorQuestionTemplate,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";
import { getAuthContext } from "@/lib/zpath-auth";
import {
  getHustAdmissionProgram2026,
  HUST_PROGRAM_GROUP_LABELS,
} from "@/src/lib/admission-data/hust-programs-2026";

type ExtractedAdvisorEntities = AdvisorClassification["extracted"];

const PERSONAL_FIT_CLARIFICATION_QUESTIONS: AdvisorClarificationQuestion[] = [
  {
    id: "interests",
    label: "Bạn thích lĩnh vực nào?",
    placeholder: "VD: công nghệ, kinh doanh, ngôn ngữ",
    required: true,
  },
  {
    id: "strengths",
    label: "Bạn mạnh môn/kỹ năng nào?",
    placeholder: "VD: Toán, tiếng Anh, giao tiếp",
    required: true,
  },
  {
    id: "academicLevel",
    label: "Điểm hoặc học lực hiện tại?",
    placeholder: "VD: 24 A00, học lực khá",
    required: true,
  },
  {
    id: "priority",
    label: "Bạn ưu tiên điều gì?",
    placeholder: "VD: dễ xin việc, thu nhập tốt",
    required: true,
  },
  {
    id: "dislikes",
    label: "Bạn không thích điều gì?",
    placeholder: "VD: ít code, không làm ca đêm",
    required: false,
  },
];

const PERSONAL_FIT_CLARIFICATION_LABELS: Record<string, string> = Object.fromEntries(
  PERSONAL_FIT_CLARIFICATION_QUESTIONS.map((question) => [
    question.id,
    question.label,
  ]),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readField(fields: AdvisorTemplateValues | undefined, name: string) {
  return fields?.[name]?.trim() ?? "";
}

function readNumberField(fields: AdvisorTemplateValues | undefined, name: string) {
  const rawValue = readField(fields, name);
  const value = rawValue ? Number(rawValue) : undefined;
  return Number.isFinite(value) ? value : undefined;
}

function readYear(fields: AdvisorTemplateValues | undefined) {
  const year = readNumberField(fields, "year");
  return Number.isInteger(year) ? year : undefined;
}

function matchesAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function asksForPersonalMajorAdvice(question: string, classification: AdvisorClassification) {
  if (classification.intent === AdvisorIntent.PERSONAL_FIT) return true;

  return matchesAnyPattern(question, [
    /\btư vấn ngành\b/iu,
    /\btu van nganh\b/iu,
    /\btư vấn chọn ngành\b/iu,
    /\btu van chon nganh\b/iu,
    /\bnên học ngành nào\b/iu,
    /\bnen hoc nganh nao\b/iu,
    /\bnên chọn ngành nào\b/iu,
    /\bnen chon nganh nao\b/iu,
    /\bngành nào phù hợp\b/iu,
    /\bnganh nao phu hop\b/iu,
    /\bngành phù hợp với em\b/iu,
    /\bnganh phu hop voi em\b/iu,
    /\btìm ngành phù hợp\b/iu,
    /\btim nganh phu hop\b/iu,
  ]);
}

function getPersonalFitSignalIds(
  question: string,
  classification: AdvisorClassification,
) {
  const signals = new Set<string>();
  const pref = classification.extracted.preferenceSignals;

  if (classification.extracted.interests?.length || classification.interests?.length) {
    signals.add("interests");
  }

  if (
    matchesAnyPattern(question, [
      /\b(thích|thich|quan tâm|quan tam|đam mê|dam me)\b/iu,
      /\b(công nghệ|cong nghe|kinh doanh|marketing|thiết kế|thiet ke|y dược|y duoc)\b/iu,
    ])
  ) {
    signals.add("interests");
  }

  if (
    matchesAnyPattern(question, [
      /\b(mạnh|manh|giỏi|gioi|học tốt|hoc tot|khá|kha|kỹ năng|ky nang)\b/iu,
      /\b(toán|toan|văn|van|anh|tiếng anh|tieng anh|lý|ly|hóa|hoa|sinh)\b/iu,
      /\b(giao tiếp|giao tiep|viết lách|viet lach|thuyết trình|thuyet trinh|sáng tạo|sang tao)\b/iu,
    ])
  ) {
    signals.add("strengths");
  }

  // If preferenceSignals already encode high communication/writing preference, treat as strengths provided
  if (pref?.communicationPreference === "high" || pref?.writingPreference === "high") {
    signals.add("strengths");
  }

  if (
    classification.extracted.score !== undefined ||
    classification.extracted.combination ||
    matchesAnyPattern(question, [
      /\b(điểm|diem|học lực|hoc luc|gpa|ielts|sat|act)\b/iu,
      /\b(A00|A01|B00|C00|D01|D07|D14|D15)\b/u,
    ])
  ) {
    signals.add("academicLevel");
  }

  if (
    matchesAnyPattern(question, [
      /\b(ưu tiên|uu tien|thu nhập|thu nhap|dễ xin việc|de xin viec)\b/iu,
      /\b(ổn định|on dinh|ít áp lực|it ap luc|đi nước ngoài|di nuoc ngoai)\b/iu,
    ])
  ) {
    signals.add("priority");
  }

  // Detect explicit dislikes/aversions as the "dislikes" clarification field
  if (
    matchesAnyPattern(question, [
      /\b(không thích|khong thich|không muốn|khong muon|không thể|khong the)\b/iu,
      /\b(ngại|ngai|sợ|so)\s+\S/iu,
    ]) ||
    pref?.codingTolerance === "low" ||
    pref?.mathTolerance === "low"
  ) {
    signals.add("dislikes");
  }

  return signals;
}

function buildPersonalFitClarificationQuestions({
  question,
  classification,
}: {
  question: string;
  classification: AdvisorClassification;
}) {
  const presentSignals = getPersonalFitSignalIds(question, classification);
  const questions = PERSONAL_FIT_CLARIFICATION_QUESTIONS.filter(
    (clarificationQuestion) => !presentSignals.has(clarificationQuestion.id),
  );

  for (const clarificationQuestion of PERSONAL_FIT_CLARIFICATION_QUESTIONS) {
    if (questions.length >= 3) break;
    if (!questions.some((questionItem) => questionItem.id === clarificationQuestion.id)) {
      questions.push(clarificationQuestion);
    }
  }

  return questions.slice(0, 5);
}

function shouldRequestPersonalFitClarification({
  question,
  classification,
  conversationId,
}: {
  question: string;
  classification: AdvisorClassification;
  conversationId?: string;
}) {
  if (conversationId) return false;
  if (classification.extracted.score !== undefined && classification.extracted.combination) {
    return false;
  }
  if (!asksForPersonalMajorAdvice(question, classification)) return false;

  const presentSignals = getPersonalFitSignalIds(question, classification);
  return presentSignals.size < 3;
}

function formatClarificationAnswers(answers: AdvisorClarificationAnswer[]) {
  return answers
    .map((answer) => {
      const label = PERSONAL_FIT_CLARIFICATION_LABELS[answer.id] ?? answer.id;
      return `- ${label}: ${answer.value}`;
    })
    .join("\n");
}

function buildClarifiedQuestion({
  originalQuestion,
  answers,
}: {
  originalQuestion: string;
  answers: AdvisorClarificationAnswer[];
}) {
  return [
    `Câu hỏi gốc: ${originalQuestion}`,
    "Thông tin trả lời nhanh của học sinh:",
    formatClarificationAnswers(answers),
    "Hãy tư vấn các nhóm ngành phù hợp nhất dựa trên thông tin này.",
  ].join("\n");
}

function formatAdvisorHistoryMessage(message: {
  role: string | null;
  content: string | null;
}): { role: "user" | "assistant"; content: string } {
  const role: "user" | "assistant" = message.role === "assistant" ? "assistant" : "user";
  const content = message.content ?? "";

  try {
    const parsed = JSON.parse(content) as unknown;

    if (isRecord(parsed) && parsed.type === "clarification_prompt") {
      const questions = Array.isArray(parsed.questions)
        ? parsed.questions
            .map((question) =>
              isRecord(question) && typeof question.label === "string"
                ? question.label
                : "",
            )
            .filter(Boolean)
        : [];

      return {
        role,
        content: `Advisor đã hỏi nhanh: ${questions.join("; ")}`,
      };
    }

    if (isRecord(parsed) && parsed.type === "clarification_answers") {
      const answers = Array.isArray(parsed.answers)
        ? parsed.answers
            .map((answer) => {
              if (!isRecord(answer)) return "";
              const label = typeof answer.label === "string" ? answer.label : answer.id;
              const value = typeof answer.value === "string" ? answer.value : "";
              return label && value ? `- ${label}: ${value}` : "";
            })
            .filter(Boolean)
        : [];

      return {
        role,
        content: `User đã trả lời nhanh:\n${answers.join("\n")}`,
      };
    }

    if (isRecord(parsed) && typeof parsed.summary === "string") {
      const sections = Array.isArray(parsed.sections)
        ? parsed.sections
            .map((section) => {
              if (!isRecord(section)) return "";
              const heading = typeof section.heading === "string" ? section.heading : "";
              const sectionContent =
                typeof section.content === "string" ? section.content : "";
              return heading && sectionContent
                ? `${heading}: ${sectionContent}`
                : "";
            })
            .filter(Boolean)
        : [];

      return {
        role,
        content: [parsed.summary, ...sections].filter(Boolean).join("\n"),
      };
    }
  } catch {
    return { role, content };
  }

  return { role, content };
}

function getVerifiedProgramContext(extracted: ExtractedAdvisorEntities) {
  if (!extracted.programCode) return undefined;
  if (extracted.schoolCode && extracted.schoolCode !== "HUST") return undefined;

  const programCode = canonicalizeAdvisorProgramCode(extracted.programCode);
  const program = programCode ? getHustAdmissionProgram2026(programCode) : null;
  if (!program) return undefined;

  return {
    status: "success",
    data: {
      schoolCode: "HUST",
      schoolName: "Đại học Bách khoa Hà Nội",
      programCode: program.code,
      programName: program.name,
      quota: program.quota,
      group: HUST_PROGRAM_GROUP_LABELS[program.group],
      methods: program.methods,
    },
    sources: [
      {
        sourceType: "zpath_database",
        title: `ZPath verified HUST program: ${program.code} ${program.name}`,
        url: "https://ts.hust.edu.vn/",
        table: "hust_admission_programs_2026",
        recordId: program.code,
      },
    ],
  };
}

function entitiesFromTemplateFields(
  fields: AdvisorTemplateValues,
): ExtractedAdvisorEntities {
  const extracted: ExtractedAdvisorEntities = {};
  const stringFields: Array<keyof ExtractedAdvisorEntities> = [
    "schoolName",
    "schoolCode",
    "programCode",
    "majorName",
    "majorA",
    "majorB",
    "schoolA",
    "schoolB",
    "combination",
    "region",
  ];

  for (const field of stringFields) {
    const value = readField(fields, field);
    if (value) {
      extracted[field] =
        field === "programCode"
          ? (canonicalizeAdvisorProgramCode(value) as never)
          : (value as never);
    }
  }

  const score = readNumberField(fields, "score");
  if (score !== undefined) extracted.score = score;

  const interestValues = [readField(fields, "interest"), readField(fields, "interests")]
    .filter(Boolean)
    .flatMap((value) =>
      value
        .split(/[,;]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    );
  if (interestValues.length) {
    extracted.interests = Array.from(new Set(interestValues));
  }

  const year = readYear(fields);
  if (year !== undefined) extracted.year = year;

  return extracted;
}

async function getInternalContextForAdvisor({
  intent,
  extracted,
  message,
  majorKnowledgeMatchedMajors = [],
}: {
  intent: AdvisorIntent;
  extracted: ExtractedAdvisorEntities;
  message: string;
  majorKnowledgeMatchedMajors?: string[];
}) {
  const schoolName = extracted.schoolName;
  const schoolCode = extracted.schoolCode;
  const programCode = extracted.programCode;
  const majorName = extracted.majorName;
  const year = extracted.year;
  const verifiedProgram = getVerifiedProgramContext(extracted);

  switch (intent) {
    case AdvisorIntent.REVIEW_MAJOR: {
      const matchedMajors = [
        ...majorKnowledgeMatchedMajors,
        majorName,
        programCode,
      ].filter((value): value is string => Boolean(value));
      return {
        verifiedProgram,
        advisorMajorKnowledge: await buildMajorKnowledgeContext({
          intent,
          matchedMajors: matchedMajors.length ? matchedMajors : [message],
          secondaryIntent: AdvisorIntent.PERSONAL_FIT,
          decisionQuestion: message,
          studentPreferenceSignals: extracted.preferenceSignals,
        }),
        majorProfile: majorName
          ? await getMajorProfile({ majorName, programCode, schoolName, schoolCode })
          : programCode
            ? await getMajorProfile({ programCode, schoolName, schoolCode })
          : await searchMajors(message),
      };
    }

    case AdvisorIntent.CAREER_PATH:
    case AdvisorIntent.STUDY_PLAN:
      return {
        verifiedProgram,
        majorProfile: majorName
          ? await getMajorProfile({ majorName, programCode, schoolName, schoolCode })
          : programCode
            ? await getMajorProfile({ programCode, schoolName, schoolCode })
          : await searchMajors(message),
      };

    case AdvisorIntent.COMPARE_MAJORS: {
      const matchedMajors = [
        ...majorKnowledgeMatchedMajors,
        extracted.majorA,
        extracted.majorB,
      ].filter((value): value is string => Boolean(value));
      return {
        verifiedProgram,
        advisorMajorKnowledge: await buildMajorKnowledgeContext({
          intent,
          matchedMajors: matchedMajors.length ? matchedMajors : [message],
          secondaryIntent: AdvisorIntent.PERSONAL_FIT,
          decisionQuestion: message,
          studentPreferenceSignals: extracted.preferenceSignals,
        }),
        majorA: extracted.majorA
          ? await getMajorProfile({
              majorName: extracted.majorA,
              programCode,
              schoolName,
              schoolCode,
            })
          : undefined,
        majorB: extracted.majorB
          ? await getMajorProfile({
              majorName: extracted.majorB,
              programCode,
              schoolName,
              schoolCode,
            })
          : undefined,
        benchmarkA:
          extracted.majorA && questionAsksForBenchmark(message)
            ? await getBenchmarkScores({
                schoolName,
                schoolCode,
                programCode,
                majorName: extracted.majorA,
                year,
              })
            : undefined,
        benchmarkB:
          extracted.majorB && questionAsksForBenchmark(message)
            ? await getBenchmarkScores({
                schoolName,
                schoolCode,
                programCode,
                majorName: extracted.majorB,
                year,
              })
            : undefined,
      };
    }

    case AdvisorIntent.COMPARE_SCHOOLS:
      return {
        verifiedProgram,
        schoolA: await getSchoolProfile({
          schoolName: extracted.schoolA,
        }),
        schoolB: await getSchoolProfile({
          schoolName: extracted.schoolB,
        }),
        majorProfile: majorName
          ? await getMajorProfile({ majorName })
          : undefined,
      };

    case AdvisorIntent.ADMISSION_CHANCE:
      return {
        verifiedProgram,
        admissionData: await getAdmissionData({
          schoolName,
          schoolCode,
          programCode,
          majorName,
          year,
        }),
        benchmarkScores: await getBenchmarkScores({
          schoolName,
          schoolCode,
          programCode,
          majorName,
          year,
        }),
      };

    case AdvisorIntent.SCORE_SUGGESTION:
      return {
        verifiedProgram,
        scoreSuggestions:
          extracted.score === undefined
            ? undefined
            : await suggestMajorsByScore({
                score: extracted.score,
                combination: extracted.combination,
                region: extracted.region,
              }),
      };

    case AdvisorIntent.TUITION:
      return {
        verifiedProgram,
        tuitionData: await getTuitionData({
          schoolName,
          schoolCode,
          programCode,
          majorName,
          year,
        }),
      };

    case AdvisorIntent.LATEST_ADMISSION_INFO:
      return {
        verifiedProgram,
        schoolProfile: await getSchoolProfile({ schoolName, schoolCode }),
        admissionData: await getAdmissionData({
          schoolName,
          schoolCode,
          programCode,
          majorName,
          year,
        }),
      };

    case AdvisorIntent.PERSONAL_FIT:
      return {
        verifiedProgram,
        advisorMajorKnowledge: await buildMajorKnowledgeContext({
          intent,
          matchedMajors: majorKnowledgeMatchedMajors,
          decisionQuestion: message,
          studentPreferenceSignals: extracted.preferenceSignals,
          categoryKeywords: extracted.interests,
        }),
        majors: await searchMajors(message),
      };

    case AdvisorIntent.GENERAL_ADVICE:
    case AdvisorIntent.UNKNOWN:
    default:
      return {
        verifiedProgram,
        schools: await searchSchools(message),
        majors: await searchMajors(message),
      };
  }
}

function collectInternalSources(value: unknown): AdvisorInternalSource[] {
  const sources: AdvisorInternalSource[] = [];

  function walk(current: unknown) {
    if (!current || typeof current !== "object") return;

    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }

    const record = current as Record<string, unknown>;
    if (Array.isArray(record.sources)) {
      for (const source of record.sources) {
        if (
          source &&
          typeof source === "object" &&
          (source as AdvisorInternalSource).sourceType === "zpath_database"
        ) {
          sources.push(source as AdvisorInternalSource);
        }
      }
    }

    Object.values(record).forEach(walk);
  }

  walk(value);

  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.table ?? ""}:${source.recordId ?? ""}:${source.url ?? ""}:${source.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getInternalDataStatus(value: unknown): AdvisorRetrievalStatus {
  const statuses: AdvisorRetrievalStatus[] = [];

  function walk(current: unknown) {
    if (!current || typeof current !== "object") return;

    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }

    const record = current as Record<string, unknown>;
    if (
      record.status === "success" ||
      record.status === "empty" ||
      record.status === "unavailable" ||
      record.status === "error"
    ) {
      statuses.push(record.status);
    }

    Object.values(record).forEach(walk);
  }

  walk(value);

  if (!statuses.length) return "empty";
  if (statuses.includes("success")) return "success";
  if (statuses.includes("error")) return "error";
  if (statuses.includes("unavailable")) return "unavailable";
  return "empty";
}

function countInternalResults(value: unknown): number {
  let count = 0;

  function walk(current: unknown) {
    if (!current || typeof current !== "object") return;

    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }

    const record = current as Record<string, unknown>;
    if (
      record.status === "success" ||
      record.status === "empty" ||
      record.status === "unavailable" ||
      record.status === "error"
    ) {
      if (Array.isArray(record.data)) {
        count += record.data.length;
      } else if (record.data !== null && record.data !== undefined) {
        count += 1;
      }
    }

    for (const [key, child] of Object.entries(record)) {
      if (key === "data" || key === "sources") continue;
      walk(child);
    }
  }

  walk(value);
  return count;
}

function buildWebSearchQueries({
  intent,
  extracted,
  question,
}: {
  intent: AdvisorIntent;
  extracted: ExtractedAdvisorEntities;
  question: string;
}) {
  return buildAdvisorWebSearchQueries({
    intent,
    schoolName: extracted.schoolName ?? extracted.schoolCode,
    schoolA: extracted.schoolA,
    schoolB: extracted.schoolB,
    majorName: extracted.majorName,
    programCode: extracted.programCode,
    majorA: extracted.majorA,
    majorB: extracted.majorB,
    score: extracted.score,
    combination: extracted.combination,
    region: extracted.region,
    interests: extracted.interests,
    year: extracted.year,
    message: question,
  });
}

function questionAsksForBenchmark(question: string) {
  return /\b(điểm chuẩn|diem chuan|benchmark|benchmarks|admission scores?)\b/i.test(
    question,
  );
}

function canUseWebSearchForMissingInternalData(intent: AdvisorIntent) {
  const webEligibleIntents: AdvisorIntent[] = [
    AdvisorIntent.LATEST_ADMISSION_INFO,
    AdvisorIntent.TUITION,
    AdvisorIntent.ADMISSION_CHANCE,
    AdvisorIntent.SCORE_SUGGESTION,
    AdvisorIntent.SCORE_CALCULATION,
    AdvisorIntent.COMPARE_SCHOOLS,
    AdvisorIntent.COMPARE_MAJORS,
    AdvisorIntent.REVIEW_MAJOR,
  ];

  return webEligibleIntents.includes(intent);
}

async function tryWebSearch({
  allowWebSearch,
  classification,
  intent,
  extracted,
  internalDataStatus,
  question,
}: {
  allowWebSearch: boolean;
  classification?: AdvisorClassification;
  intent: AdvisorIntent;
  extracted: ExtractedAdvisorEntities;
  internalDataStatus: AdvisorRetrievalStatus;
  question: string;
}) {
  const asksForLatest =
    classification?.shouldUseWebSearch ||
    intent === AdvisorIntent.LATEST_ADMISSION_INFO;
  const asksForBenchmark = questionAsksForBenchmark(question);
  const broadQuestion = intent === AdvisorIntent.SCORE_SUGGESTION;
  const effectiveInternalDataStatus =
    asksForLatest || canUseWebSearchForMissingInternalData(intent)
      ? internalDataStatus
      : "success";
  const shouldSearch = shouldUseAdvisorWebSearch({
    intent,
    allowWebSearch,
    asksForLatest,
    asksForBenchmark,
    internalDataStatus: effectiveInternalDataStatus,
    broadQuestion,
  });

  if (!shouldSearch) {
    return {
      shouldSearch,
      searchAttempted: false,
      query: "",
      queries: [] as string[],
      provider: getAdvisorWebSearchProvider(),
      results: [] as WebSearchResult[],
      reason:
        !allowWebSearch && (asksForLatest || asksForBenchmark)
          ? "Người dùng đã tắt tìm kiếm web cho câu hỏi cần thông tin cập nhật hoặc điểm chuẩn."
          : undefined,
    };
  }

  const queries = buildWebSearchQueries({ intent, extracted, question });
  const query = queries[0] ?? "";
  const provider = getAdvisorWebSearchProvider();

  if (provider === "none") {
    return {
      shouldSearch: false,
      searchAttempted: false,
      query,
      queries,
      provider,
      results: [] as WebSearchResult[],
      reason:
        "Tìm kiếm web chưa được cấu hình cho ZPath lúc này. Câu trả lời chỉ dùng dữ liệu nội bộ hoặc tư vấn tổng quan.",
    };
  }

  const results = await searchWebForAdvisorQueries(queries, {
    maxResults: 5,
    preferOfficialSources: queryPrefersOfficialSources(intent),
    schoolName: extracted.schoolName ?? extracted.schoolCode,
    programCode: extracted.programCode,
    year: extracted.year,
  });

  return {
    shouldSearch,
    searchAttempted: true,
    query,
    queries,
    provider,
    results,
    reason:
      classification?.reasonForWebSearch ??
      "Nội bộ ZPath chưa đủ dữ liệu hoặc câu hỏi cần thông tin cập nhật.",
  };
}

function normalizeAnswerForWebSearch({
  answer,
  webSearch,
  internalDataStatus,
}: {
  answer: AdvisorAnswer;
  webSearch: Awaited<ReturnType<typeof tryWebSearch>>;
  internalDataStatus: AdvisorRetrievalStatus;
}): AdvisorAnswer {
  const webSearchDisabledWarning =
    "Bạn đã tắt tìm kiếm web, nên thông tin mới nhất hoặc dữ liệu tuyển sinh hiện tại có thể còn hạn chế.";

  if (!webSearch.shouldSearch) {
    if (!webSearch.reason) {
      return {
        ...answer,
        dataStatus:
          internalDataStatus === "success" ? "internal_data" : answer.dataStatus,
      };
    }

    const warning = webSearch.reason.includes("tắt tìm kiếm web")
      ? webSearchDisabledWarning
      : webSearch.reason;

    return {
      ...answer,
      dataStatus:
        internalDataStatus === "success" ? "internal_data" : answer.dataStatus,
      warnings: answer.warnings.includes(warning)
        ? answer.warnings
        : [...answer.warnings, warning],
    };
  }

  const noReliableSourceWarning =
    "ZPath chưa tìm thấy nguồn web đủ tin cậy cho phần này. Bạn nên kiểm tra website chính thức của trường.";
  const verificationWarning =
    "Bạn nên kiểm tra lại trên website chính thức khi đăng ký.";
  const warnings = [...answer.warnings];

  if (!webSearch.results.length && !warnings.includes(noReliableSourceWarning)) {
    warnings.push(noReliableSourceWarning);
  }

  if (webSearch.results.length && !warnings.includes(verificationWarning)) {
    warnings.push(verificationWarning);
  }

  return {
    ...answer,
    dataStatus: webSearch.results.length
      ? "web_augmented"
      : internalDataStatus === "success"
        ? "internal_data"
        : answer.dataStatus,
    warnings,
  };
}

function normalizeAnswerForVerifiedFacts({
  answer,
  verifiedFacts,
}: {
  answer: AdvisorAnswer;
  verifiedFacts: ReturnType<typeof buildVerifiedAdvisorFacts>;
}): AdvisorAnswer {
  const ftuIelts = verifiedFacts?.ftuIeltsConversion?.data;
  if (!ftuIelts || ftuIelts.band === null || ftuIelts.convertedScoreOutOf10 === null) {
    return answer;
  }

  const exactSentence = `Với **FTU**, **IELTS Academic ${ftuIelts.band}** được quy đổi thành **${ftuIelts.convertedScoreOutOf10}/10**; IELTS Academic từ **8.0** trở lên mới được quy đổi **10/10**.`;
  const alreadyStatesExactRule = [
    answer.summary,
    ...answer.sections.map((section) => section.content),
  ].some(
    (content) =>
      content.includes(`${ftuIelts.convertedScoreOutOf10}`) &&
      /8\.0|8,0|8\s*ielts/iu.test(content),
  );

  if (alreadyStatesExactRule) return answer;

  return {
    ...answer,
    summary: exactSentence,
    confidence: "high",
    dataStatus: "internal_data",
    sections: [
      {
        heading: "Quy đổi IELTS tại FTU",
        content: `- ${exactSentence}\n- Không nên dùng bảng quy đổi của trường khác cho **Đại học Ngoại thương**, vì mỗi trường có thang quy đổi chứng chỉ ngoại ngữ riêng.`,
      },
      ...answer.sections,
    ].slice(0, 3),
  };
}

// ---------------------------------------------------------------------------
// Mock-only gating: only used when ADVISOR_USE_MOCK=true in env.
// In production, the real pipeline is ALWAYS attempted first.
// ---------------------------------------------------------------------------
function shouldUseMock() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.ADVISOR_USE_MOCK === "true";
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json(
        {
          error: {
            code: "AUTH_REQUIRED",
            message: "Bạn cần đăng nhập để dùng Advisor.",
          },
        },
        { status: 401 },
      );
    }

    if (!auth.user.phone) {
      return NextResponse.json(
        {
          error: {
            code: "PHONE_REQUIRED",
            message: "Bạn cần bổ sung số điện thoại trước khi dùng Advisor.",
          },
        },
        { status: 403 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_JSON",
            message: "Body JSON không hợp lệ.",
          },
        },
        { status: 400 },
      );
    }

    const parsed = parseAdvisorAnswerRequest(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: parsed.error.code,
            message: parsed.error.message,
          },
        },
        { status: parsed.error.status },
      );
    }

    const requestData = parsed.data;
    const allowWebSearch = requestData.allowWebSearch !== false;
    let resolvedConversationId = requestData.conversationId;
    let question: string;
    let template: AdvisorQuestionTemplate | null = null;
    let fields: AdvisorTemplateValues | undefined;
    let intent: AdvisorIntent;
    let classification: AdvisorClassification | undefined;
    let majorKnowledgeClassification: Awaited<ReturnType<typeof classifyMajorKnowledgeIntentWithGemini>> | undefined;
    let extracted: ExtractedAdvisorEntities;

    if (requestData.mode === "template") {
      template = getAdvisorTemplateById(requestData.templateId);

      if (!template) {
        return NextResponse.json(
          {
            error: {
              code: "UNKNOWN_TEMPLATE",
              message: "Không tìm thấy mẫu câu hỏi này.",
            },
          },
          { status: 400 },
        );
      }

      const fieldValidation = validateAdvisorTemplateFields(
        template,
        requestData.fields,
      );

      if (!fieldValidation.success) {
        return NextResponse.json(
          {
            error: {
              code: fieldValidation.error.code,
              message: fieldValidation.error.message,
            },
          },
          { status: fieldValidation.error.status },
        );
      }

      fields = fieldValidation.data;
      intent = template.defaultIntent;
      extracted = entitiesFromTemplateFields(fieldValidation.data);
      question = generateVietnameseQuestion(template, fieldValidation.data);
    } else if (requestData.mode === "free_text") {
      question = requestData.message;
      classification = classifyAdvisorQuestion(question);
      try {
        majorKnowledgeClassification = await classifyMajorKnowledgeIntentWithGemini(question);
      } catch (error) {
        console.warn("Advisor major knowledge intent classification failed:", error);
      }
      intent = majorKnowledgeClassification
        ? mapMajorKnowledgeIntentToAdvisorIntent(
            majorKnowledgeClassification.intent,
            classification.intent,
          )
        : classification.intent;
      extracted = classification.extracted;
      if (majorKnowledgeClassification?.matchedMajors.length) {
        if (intent === AdvisorIntent.REVIEW_MAJOR && !extracted.majorName) {
          extracted.majorName = majorKnowledgeClassification.matchedMajors[0];
        }
        if (intent === AdvisorIntent.COMPARE_MAJORS) {
          extracted.majorA ??= majorKnowledgeClassification.matchedMajors[0];
          extracted.majorB ??= majorKnowledgeClassification.matchedMajors[1];
        }
      }
    } else {
      question = buildClarifiedQuestion({
        originalQuestion: requestData.originalQuestion,
        answers: requestData.clarificationAnswers,
      });
      classification = classifyAdvisorQuestion(question);
      intent = AdvisorIntent.PERSONAL_FIT;
      extracted = classification.extracted;

      const clarificationPersistence = await persistAdvisorClarificationAnswers({
        conversationId: requestData.conversationId,
        anonymousId: requestData.anonymousId,
        originalQuestion: requestData.originalQuestion,
        intent,
        answers: requestData.clarificationAnswers,
        answerLabels: PERSONAL_FIT_CLARIFICATION_LABELS,
      });
      resolvedConversationId = clarificationPersistence.conversationId;
    }

    if (
      requestData.mode === "free_text" &&
      classification &&
      shouldRequestPersonalFitClarification({
        question,
        classification,
        conversationId: requestData.conversationId,
      })
    ) {
      const questions = buildPersonalFitClarificationQuestions({
        question,
        classification,
      });
      const clarificationPersistence = await persistAdvisorClarificationPrompt({
        conversationId: requestData.conversationId,
        anonymousId: requestData.anonymousId,
        originalQuestion: question,
        intent: AdvisorIntent.PERSONAL_FIT,
        questions,
      });

      return NextResponse.json({
        clarification: {
          conversationId: clarificationPersistence.conversationId,
          originalQuestion: question,
          intent: AdvisorIntent.PERSONAL_FIT,
          questions,
        },
        conversationId: clarificationPersistence.conversationId,
        userMessageId: clarificationPersistence.userMessageId,
        assistantMessageId: clarificationPersistence.assistantMessageId,
        ...(process.env.NODE_ENV === "development"
          ? {
              debug: {
                usedMock: false,
                usedGemini: false,
                usedInternalRetrieval: false,
                usedWebSearch: false,
                intent: AdvisorIntent.PERSONAL_FIT,
                extracted,
                majorKnowledgeClassification,
                webSearchProvider: getAdvisorWebSearchProvider(),
                webSearchResultCount: 0,
                internalResultCount: 0,
                fallbackReason: "clarification_required",
              },
            }
          : {}),
      });
    }

    // -----------------------------------------------------------------------
    // Mock-only path: skip the real pipeline entirely when ADVISOR_USE_MOCK
    // is explicitly set to "true". This is for dev/testing only.
    // -----------------------------------------------------------------------
    if (shouldUseMock()) {
      const mockAnswer = createMockAdvisorAnswer({ template, question, values: fields });
      return NextResponse.json({
        answer: mockAnswer,
        ...(process.env.NODE_ENV === "development"
          ? {
              debug: {
                usedMock: true,
                usedGemini: false,
                usedInternalRetrieval: false,
                usedWebSearch: false,
                intent,
                extracted,
                majorKnowledgeClassification,
                webSearchProvider: getAdvisorWebSearchProvider(),
                webSearchResultCount: 0,
                internalResultCount: 0,
                fallbackReason: "ADVISOR_USE_MOCK=true",
              },
            }
          : {}),
      });
    }

    // -----------------------------------------------------------------------
    // Production pipeline: internal data → web search → Gemini → fallback
    // -----------------------------------------------------------------------
    let internalContext: unknown;
    const usedInternalRetrieval = true;
    try {
      internalContext = await getInternalContextForAdvisor({
        intent,
        extracted,
        message: question,
        majorKnowledgeMatchedMajors: majorKnowledgeClassification?.matchedMajors,
      });
    } catch (error) {
      console.warn("Advisor internal retrieval failed:", error);
      internalContext = {
        status: "error",
        reason: "Không thể đọc dữ liệu nội bộ ZPath ở thời điểm này.",
      };
    }

    const internalDataStatus = getInternalDataStatus(internalContext);
    const webSearch = await tryWebSearch({
      allowWebSearch,
      classification,
      intent,
      extracted,
      internalDataStatus,
      question,
    });

    let chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (resolvedConversationId) {
      try {
        const { data: conversation } = await supabaseServer
          .from("advisor_conversations")
          .select("id")
          .eq("id", resolvedConversationId)
          .eq("user_id", auth.user.id)
          .maybeSingle();

        if (conversation?.id) {
          const { data: messages } = await supabaseServer
            .from("advisor_messages")
            .select("role, content")
            .eq("conversation_id", resolvedConversationId)
            .order("created_at", { ascending: true })
            .limit(12);

          if (messages) {
            chatHistory = messages.map((message) =>
              formatAdvisorHistoryMessage(message),
            );
          }
        }
      } catch (dbErr) {
        console.warn("Failed to retrieve chat history:", dbErr);
      }
    }

    const verifiedFacts = buildVerifiedAdvisorFacts({
      question,
      chatHistory,
    });
    if (verifiedFacts) {
      internalContext = {
        advisorRetrieval: internalContext,
        verifiedFacts,
      };
    }

    const effectiveInternalDataStatus = getInternalDataStatus(internalContext);
    const sources: AdvisorPromptSource[] = buildAdvisorPromptSources({
      internalSources: collectInternalSources(internalContext),
      webResults: webSearch.results,
    });

    let answer: AdvisorAnswer;
    let usedFallback = false;
    let usedGemini = false;
    let fallbackReason: string | null = null;

    try {
      usedGemini = true;
      answer = await generateAdvisorAnswerWithGemini({
        question,
        intent,
        classification,
        extracted,
        internalContext,
        webResults: webSearch.results,
        sources,
        template,
        values: fields,
        chatHistory,
      });
    } catch (error) {
      usedFallback = true;
      fallbackReason = error instanceof Error ? error.message : "unknown";
      console.warn(
        "Advisor Gemini fallback:",
        fallbackReason,
      );
      answer = createSafeFallbackAdvisorAnswer({
        question,
        intent,
        extracted,
        template,
        values: fields,
        sources,
      });
    }

    answer = normalizeAnswerForVerifiedFacts({
      answer,
      verifiedFacts,
    });

    answer = normalizeAnswerForWebSearch({
      answer,
      webSearch,
      internalDataStatus: effectiveInternalDataStatus,
    });

    let persistence:
      | Awaited<ReturnType<typeof persistAdvisorExchange>>
      | undefined;

    try {
      persistence = await persistAdvisorExchange({
        conversationId: resolvedConversationId,
        anonymousId: requestData.anonymousId,
        question,
        answer,
        intent,
        webSearchAllowed: allowWebSearch,
        webSearchUsed: webSearch.shouldSearch,
        sourceUrls: answer.sources
          .map((source) => source.url)
          .filter((url): url is string => Boolean(url)),
      });
    } catch (error) {
      console.warn("Advisor persistence failed:", error);
    }

    return NextResponse.json({
      answer,
      conversationId: persistence?.conversationId,
      userMessageId: persistence?.userMessageId,
      assistantMessageId: persistence?.assistantMessageId,
      ...(process.env.NODE_ENV === "development"
        ? {
            debug: {
              usedMock: false,
              usedGemini,
              usedInternalRetrieval,
              usedWebSearch: webSearch.searchAttempted,
              intent,
              extracted,
              majorKnowledgeClassification,
              webSearchProvider: webSearch.provider,
              webSearchResultCount: webSearch.results.length,
              internalResultCount: countInternalResults(internalContext),
              fallbackReason: usedFallback ? fallbackReason : null,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error("Advisor answer API error:", error);

    return NextResponse.json(
      {
        error: {
          code: "ADVISOR_ANSWER_FAILED",
          message: "Không thể tạo câu trả lời lúc này.",
        },
      },
      { status: 500 },
    );
  }
}
