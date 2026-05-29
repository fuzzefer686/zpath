import { NextResponse } from "next/server";

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
  buildAdvisorPromptSources,
  type AdvisorPromptSource,
} from "@/lib/advisor/prompts";
import { persistAdvisorExchange } from "@/lib/advisor/persistence";
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
  AdvisorQuestionTemplate,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";
import {
  getHustAdmissionProgram2026,
  HUST_PROGRAM_GROUP_LABELS,
} from "@/src/lib/admission-data/hust-programs-2026";

type ExtractedAdvisorEntities = AdvisorClassification["extracted"];

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
}: {
  intent: AdvisorIntent;
  extracted: ExtractedAdvisorEntities;
  message: string;
}) {
  const schoolName = extracted.schoolName;
  const schoolCode = extracted.schoolCode;
  const programCode = extracted.programCode;
  const majorName = extracted.majorName;
  const year = extracted.year;
  const verifiedProgram = getVerifiedProgramContext(extracted);

  switch (intent) {
    case AdvisorIntent.REVIEW_MAJOR:
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

    case AdvisorIntent.COMPARE_MAJORS:
      return {
        verifiedProgram,
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
    let question: string;
    let template: AdvisorQuestionTemplate | null = null;
    let fields: AdvisorTemplateValues | undefined;
    let intent: AdvisorIntent;
    let classification: AdvisorClassification | undefined;
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
    } else {
      question = requestData.message;
      classification = classifyAdvisorQuestion(question);
      intent = classification.intent;
      extracted = classification.extracted;
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

    answer = normalizeAnswerForWebSearch({
      answer,
      webSearch,
      internalDataStatus,
    });

    let persistence:
      | Awaited<ReturnType<typeof persistAdvisorExchange>>
      | undefined;

    try {
      persistence = await persistAdvisorExchange({
        conversationId: requestData.conversationId,
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
