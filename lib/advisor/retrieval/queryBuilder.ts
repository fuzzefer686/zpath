import { AdvisorIntent } from "@/lib/advisor/intents";

export type AdvisorWebSearchQueryInput = {
  intent: AdvisorIntent;
  schoolName?: string;
  schoolA?: string;
  schoolB?: string;
  programCode?: string;
  majorName?: string;
  majorA?: string;
  majorB?: string;
  score?: number;
  combination?: string;
  region?: string;
  interests?: string[];
  year?: number;
  message?: string;
};

export type AdvisorWebSearchDecisionInput = {
  intent: AdvisorIntent;
  allowWebSearch?: boolean;
  asksForLatest?: boolean;
  asksForBenchmark?: boolean;
  internalDataStatus?: "success" | "empty" | "unavailable" | "error" | "stale";
  broadQuestion?: boolean;
};

function cleanPart(value?: string | number | null) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function joinQueryParts(parts: Array<string | number | undefined | null>) {
  return parts.map(cleanPart).filter(Boolean).join(" ");
}

function uniqueQueries(queries: string[]) {
  const seen = new Set<string>();

  return queries
    .map((query) => query.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((query) => {
      const key = query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function inferMajorSearchTerm(input: AdvisorWebSearchQueryInput) {
  if (input.programCode) return cleanPart(input.programCode);

  const explicitMajor = input.majorName ?? input.majorA ?? input.majorB ?? input.message;
  const interestText = input.interests?.join(" ").toLowerCase() ?? "";
  const haystack = [explicitMajor, interestText, input.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/công nghệ thông tin|cong nghe thong tin|cntt|it|phần mềm|phan mem|lập trình|lap trinh|công nghệ|cong nghe/.test(haystack)) {
    return "công nghệ thông tin";
  }
  if (/ai|trí tuệ nhân tạo|tri tue nhan tao/.test(haystack)) {
    return "trí tuệ nhân tạo";
  }
  if (/dữ liệu|du lieu|data/.test(haystack)) {
    return "khoa học dữ liệu";
  }
  if (/logistics|chuỗi cung ứng|chuoi cung ung/.test(haystack)) {
    return "logistics";
  }
  if (/marketing|quảng cáo|quang cao/.test(haystack)) {
    return "marketing";
  }
  if (/kinh tế|kinh te|kinh doanh|quản trị|quan tri/.test(haystack)) {
    return "kinh tế quản trị kinh doanh";
  }
  if (/ngôn ngữ|ngon ngu|tiếng anh|tieng anh|language/.test(haystack)) {
    return "ngôn ngữ";
  }
  if (/thiết kế|thiet ke|mỹ thuật|my thuat|design/.test(haystack)) {
    return "thiết kế";
  }
  if (/luật|luat|pháp luật|phap luat/.test(haystack)) {
    return "luật";
  }
  if (/y dược|y duoc|y khoa|dược học|duoc hoc/.test(haystack)) {
    return "y dược";
  }

  return cleanPart(explicitMajor);
}

function currentAdmissionYear() {
  return new Date().getFullYear();
}

function latestBenchmarkYear(input: AdvisorWebSearchQueryInput) {
  return input.year ?? currentAdmissionYear() - 1;
}

function buildScoreSuggestionQueries(input: AdvisorWebSearchQueryInput) {
  const majorTerm = inferMajorSearchTerm(input);
  const benchmarkYear = latestBenchmarkYear(input);
  const admissionYear = input.year ?? currentAdmissionYear();

  return uniqueQueries([
    joinQueryParts([
      "điểm chuẩn",
      majorTerm,
      input.region,
      input.combination,
      benchmarkYear,
    ]),
    joinQueryParts([
      "điểm chuẩn các trường đại học",
      majorTerm,
      input.region,
      benchmarkYear,
    ]),
    joinQueryParts([
      "tuyển sinh ngành",
      majorTerm,
      input.region,
      input.combination,
      admissionYear,
    ]),
    joinQueryParts([
      "đại học",
      input.region,
      "ngành",
      majorTerm,
      "điểm chuẩn",
    ]),
  ]);
}

export function buildAdvisorWebSearchQueries(input: AdvisorWebSearchQueryInput) {
  const year = input.year ?? currentAdmissionYear();

  switch (input.intent) {
    case AdvisorIntent.LATEST_ADMISSION_INFO:
      return uniqueQueries([
        joinQueryParts([
          input.schoolName,
          "thông tin tuyển sinh",
          year,
          "chính thức",
        ]),
        joinQueryParts([
          input.schoolName,
          "đề án tuyển sinh",
          year,
          "pdf",
        ]),
      ]);

    case AdvisorIntent.TUITION:
      return uniqueQueries([
        joinQueryParts([
          input.schoolName,
          "học phí",
          input.majorName,
          year,
          "chính thức",
        ]),
        joinQueryParts([
          input.schoolName,
          "mức thu học phí",
          input.majorName,
          year,
          "pdf",
        ]),
      ]);

    case AdvisorIntent.ADMISSION_CHANCE:
    case AdvisorIntent.SCORE_CALCULATION:
      return uniqueQueries([
        joinQueryParts([
          input.schoolName,
          "điểm chuẩn",
          inferMajorSearchTerm(input),
          input.combination,
          latestBenchmarkYear(input),
          "chính thức",
        ]),
        joinQueryParts([
          input.schoolName,
          "tuyển sinh",
          inferMajorSearchTerm(input),
          input.combination,
          year,
        ]),
      ]);

    case AdvisorIntent.SCORE_SUGGESTION:
      return buildScoreSuggestionQueries(input);

    case AdvisorIntent.REVIEW_MAJOR:
    case AdvisorIntent.CAREER_PATH:
    case AdvisorIntent.PERSONAL_FIT:
    case AdvisorIntent.STUDY_PLAN:
      return uniqueQueries([
        joinQueryParts([
          inferMajorSearchTerm(input),
          "học gì cơ hội việc làm",
        ]),
        joinQueryParts([
          "ngành",
          inferMajorSearchTerm(input),
          "chương trình đào tạo tuyển sinh",
        ]),
      ]);

    case AdvisorIntent.COMPARE_MAJORS:
      return uniqueQueries([
        joinQueryParts([
          input.majorA,
          input.majorB,
          "so sánh ngành học điểm chuẩn học phí cơ hội việc làm tuyển sinh",
        ]),
        joinQueryParts([
          "điểm chuẩn",
          input.majorA,
          input.majorB,
          latestBenchmarkYear(input),
        ]),
      ]);

    case AdvisorIntent.COMPARE_SCHOOLS:
      return uniqueQueries([
        joinQueryParts([
          input.schoolA,
          input.schoolB,
          "ngành",
          inferMajorSearchTerm(input),
          "tuyển sinh học phí điểm chuẩn",
        ]),
        joinQueryParts([
          input.schoolA,
          "tuyển sinh học phí điểm chuẩn",
          year,
        ]),
        joinQueryParts([
          input.schoolB,
          "tuyển sinh học phí điểm chuẩn",
          year,
        ]),
      ]);

    case AdvisorIntent.GENERAL_ADVICE:
    case AdvisorIntent.UNKNOWN:
    default:
      return uniqueQueries([
        joinQueryParts([
          input.message,
          "tuyển sinh đại học Việt Nam nguồn chính thức",
        ]),
        joinQueryParts([
          inferMajorSearchTerm(input),
          input.region,
          input.combination,
          "điểm chuẩn tuyển sinh đại học",
          latestBenchmarkYear(input),
        ]),
      ]);
  }
}

export function buildAdvisorWebSearchQuery(input: AdvisorWebSearchQueryInput) {
  return buildAdvisorWebSearchQueries(input)[0] ?? "";
}

export function queryPrefersOfficialSources(intent: AdvisorIntent) {
  const officialSourceIntents: AdvisorIntent[] = [
    AdvisorIntent.LATEST_ADMISSION_INFO,
    AdvisorIntent.TUITION,
    AdvisorIntent.ADMISSION_CHANCE,
    AdvisorIntent.SCORE_SUGGESTION,
    AdvisorIntent.SCORE_CALCULATION,
    AdvisorIntent.COMPARE_SCHOOLS,
    AdvisorIntent.COMPARE_MAJORS,
  ];

  return officialSourceIntents.includes(intent);
}

export function shouldUseAdvisorWebSearch(
  input: AdvisorWebSearchDecisionInput,
) {
  if (!input.allowWebSearch) return false;

  if (input.asksForLatest) return true;
  if (input.asksForBenchmark) return true;

  if (
    input.intent === AdvisorIntent.REVIEW_MAJOR &&
    input.internalDataStatus !== "success"
  ) {
    return true;
  }

  if (input.internalDataStatus === "empty") return true;
  if (input.internalDataStatus === "unavailable") return true;
  if (input.internalDataStatus === "error") return true;
  if (input.internalDataStatus === "stale") return true;

  return false;
}
