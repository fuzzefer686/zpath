import { AdvisorIntent } from "@/lib/advisor/intents";
import { canonicalizeAdvisorProgramCode } from "@/lib/advisor/programCodes";

export type AdvisorClassification = {
  intent: AdvisorIntent;
  confidence: number;
  extracted: {
    schoolName?: string;
    schoolCode?: string;
    programCode?: string;
    majorName?: string;
    majorA?: string;
    majorB?: string;
    schoolA?: string;
    schoolB?: string;
    score?: number;
    combination?: string;
    region?: string;
    year?: number;
    interests?: string[];
  };
  secondaryIntents?: AdvisorIntent[];
  interests?: string[];
  score?: number;
  combination?: string;
  region?: string;
  needsMoreInfo: boolean;
  missingFields: string[];
  shouldUseWebSearch: boolean;
  reasonForWebSearch?: string;
};

type PatternRule = {
  intent: AdvisorIntent;
  weight: number;
  patterns: RegExp[];
};

const SCHOOL_CODE_ALIASES: Record<string, string> = {
  "bách khoa": "HUST",
  "bach khoa": "HUST",
  "bkhn": "HUST",
  "đại học bách khoa hà nội": "HUST",
  "dai hoc bach khoa ha noi": "HUST",
  "hanoi university science and technology": "HUST",
  hust: "HUST",
  bka: "HUST",
  neu: "NEU",
  ftu: "FTU",
  vinuni: "VINUNI",
  hanu: "HANU",
  ulis: "ULIS",
  ueh: "UEH",
  uel: "UEL",
  hcmut: "HCMUT",
  uit: "UIT",
  ussh: "USSH",
  vnu: "VNU",
  ptit: "PTIT",
};

const KNOWN_SCHOOL_CODES = new Set(Object.values(SCHOOL_CODE_ALIASES));
const ADMISSION_COMBINATION_CODES = new Set([
  "A00",
  "A01",
  "B00",
  "C00",
  "D01",
  "D07",
  "D14",
  "D15",
  "H00",
  "V00",
]);

// A helper to construct a Unicode-aware word boundary pattern
function w(pattern: string): RegExp {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${pattern}(?:$|[^\\p{L}\\p{N}])`, "iu");
}

const COMBINATION_PATTERN =
  /(?:^|[^\p{L}\p{N}])(A00|A01|B00|C00|D01|D07|D14|D15|H00|V00)(?:$|[^\p{L}\p{N}])/iu;

const YEAR_PATTERN = /(?:^|[^\p{L}\p{N}])(20[2-3]\d)(?:$|[^\p{L}\p{N}])/u;

// Mapped interests for extraction
const INTERESTS_MAP: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "Công nghệ", patterns: [w("công nghệ"), w("technology"), w("tech")] },
  { label: "IT", patterns: [w("it"), w("phần mềm"), w("phan mem"), w("lập trình"), w("lap trinh")] },
  { label: "AI", patterns: [w("ai"), w("trí tuệ nhân tạo"), w("tri tue nhan tao")] },
  { label: "Dữ liệu", patterns: [w("dữ liệu"), w("du lieu"), w("data")] },
  { label: "Kinh tế", patterns: [w("kinh tế"), w("kinh te"), w("economics"), w("economic")] },
  { label: "Kinh doanh", patterns: [w("kinh doanh"), w("business"), w("quản trị"), w("quan tri")] },
  { label: "Marketing", patterns: [w("marketing"), w("quảng cáo"), w("quang cao")] },
  { label: "Y dược", patterns: [w("y dược"), w("y duoc"), w("y khoa"), w("dược học"), w("duoc hoc"), w("ngành y")] },
  { label: "Luật", patterns: [w("luật"), w("luat"), w("pháp luật"), w("phap luat"), w("law")] },
  { label: "Ngôn ngữ", patterns: [w("ngôn ngữ"), w("ngon ngu"), w("tiếng"), w("tieng"), w("language")] },
  { label: "Thiết kế", patterns: [w("thiết kế"), w("thiet ke"), w("design"), w("mỹ thuật"), w("my thuat")] },
  { label: "Truyền thông", patterns: [w("truyền thông"), w("truyen thong"), w("media"), w("communication")] },
  { label: "Logistics", patterns: [w("logistics"), w("chuỗi cung ứng"), w("chuoi cung ung")] },
  { label: "Cơ khí", patterns: [w("cơ khí"), w("co khi")] },
  { label: "Điện tử", patterns: [w("điện tử"), w("dien tu"), w("electronic")] },
  { label: "Tự động hóa", patterns: [w("tự động hóa"), w("tu dong hoa"), w("automation")] },
];

const REGION_PATTERNS: Array<[string, RegExp]> = [
  ["Miền Bắc", /(?:^|[^\p{L}\p{N}])(miền bắc|mien bac|phía bắc|phia bac|hà nội|ha noi|hn)(?:$|[^\p{L}\p{N}])/iu],
  ["Miền Trung", /(?:^|[^\p{L}\p{N}])(miền trung|mien trung|phía trung|phia trung|đà nẵng|da nang|đn|dn|huế|hue)(?:$|[^\p{L}\p{N}])/iu],
  ["Miền Nam", /(?:^|[^\p{L}\p{N}])(miền nam|mien nam|phía nam|phia nam|tp\.?\s*hcm|hồ chí minh|ho chi minh|sài gòn|sai gon|sg)(?:$|[^\p{L}\p{N}])/iu],
  ["Toàn quốc", /(?:^|[^\p{L}\p{N}])(toàn quốc|toan quoc|mọi trường|moi truong|cả nước|ca nuoc)(?:$|[^\p{L}\p{N}])/iu],
];

const WEB_SEARCH_PATTERNS = [
  w("mới nhất"),
  w("moi nhat"),
  w("năm nay"),
  w("nam nay"),
  w("chính thức"),
  w("chinh thuc"),
  w("hiện nay"),
  w("hien nay"),
  w("cập nhật"),
  w("cap nhat"),
  YEAR_PATTERN,
];

const BENCHMARK_PATTERNS = [
  w("điểm chuẩn"),
  w("diem chuan"),
  w("benchmark"),
  w("benchmarks"),
  w("admission score"),
  w("admission scores"),
];

const BROAD_SUGGESTION_PATTERNS = [
  w("trường nào"),
  w("truong nao"),
  w("nên chọn trường nào"),
  w("nen chon truong nao"),
  w("mọi trường"),
  w("moi truong"),
  w("ngành nào"),
  w("nganh nao"),
  w("vào được ngành nào"),
  w("vao duoc nganh nao"),
  w("gợi ý trường/ngành"),
  w("gợi ý trường ngành"),
  w("phù hợp với mức điểm"),
  w("phu hop voi muc diem"),
];

const INTENT_RULES: PatternRule[] = [
  {
    intent: AdvisorIntent.SCORE_SUGGESTION,
    weight: 5,
    patterns: [
      /(?:^|[^\p{L}\p{N}])\d{1,2}(?:[.,]\d{1,2})?\s*điểm\s+(?:nên chọn|chon|học|hoc|vào được|vao duoc)(?:$|[^\p{L}\p{N}])/iu,
      w("điểm này\\s+(?:vào được|nen chon|nên chọn)"),
      w("bao nhiêu điểm\\s+nên chọn"),
      w("trường nào"),
      w("ngành nào"),
      w("nên chọn trường nào"),
      w("nen chon truong nao"),
      w("vào được trường nào"),
      w("gợi ý trường/ngành"),
      w("phù hợp với mức điểm"),
    ],
  },
  {
    intent: AdvisorIntent.SCORE_CALCULATION,
    weight: 4,
    patterns: [
      w("tính điểm"),
      w("tinh diem"),
      w("quy đổi điểm"),
      w("quy doi diem"),
      w("ielts\\s+quy đổi"),
      w("ielts\\s+quy doi"),
      w("chứng chỉ\\s+quy đổi"),
      w("chung chi\\s+quy doi"),
    ],
  },
  {
    intent: AdvisorIntent.LATEST_ADMISSION_INFO,
    weight: 4,
    patterns: [
      w("tuyển sinh mới nhất"),
      w("tuyen sinh moi nhat"),
      w("thông tin tuyển sinh"),
      w("thong tin tuyen sinh"),
      w("đề án tuyển sinh"),
      w("de an tuyen sinh"),
    ],
  },
  {
    intent: AdvisorIntent.ADMISSION_CHANCE,
    weight: 3,
    patterns: [
      w("điểm chuẩn"),
      w("diem chuan"),
      w("benchmark"),
      w("benchmarks"),
      w("admission score"),
      w("admission scores"),
      w("bao nhiêu điểm"),
      w("bao nhieu diem"),
      w("cơ hội đỗ"),
      w("co hoi do"),
      w("có đỗ không"),
      w("co do khong"),
      w("khả năng đỗ"),
      w("kha nang do"),
    ],
  },
  {
    intent: AdvisorIntent.COMPARE_MAJORS,
    weight: 3,
    patterns: [
      w("so sánh ngành"),
      w("so sanh nganh"),
      /(?:^|[^\p{L}\p{N}])ngành\s+.+?\s+và\s+.+?\s+khác gì(?:$|[^\p{L}\p{N}])/iu,
      /(?:^|[^\p{L}\p{N}])nganh\s+.+?\s+va\s+.+?\s+khac gi(?:$|[^\p{L}\p{N}])/iu,
      w("nên chọn ngành\\s+.+?\\s+hay\\s+.+"),
      w("nen chon nganh\\s+.+?\\s+hay\\s+.+"),
      w("compare\\s+.+?\\s+(?:and|vs|versus)\\s+.+"),
    ],
  },
  {
    intent: AdvisorIntent.COMPARE_SCHOOLS,
    weight: 3,
    patterns: [
      w("so sánh trường"),
      w("so sanh truong"),
      w("trường nào tốt hơn"),
      w("truong nao tot hon"),
      /(?:^|[^\p{L}\p{N}]).+?\s+hay\s+.+?\s+(?:ngành|nganh|truong|trường|tốt hơn|tot hon)(?:$|[^\p{L}\p{N}])/iu,
    ],
  },
  {
    intent: AdvisorIntent.TUITION,
    weight: 4,
    patterns: [w("học phí"), w("hoc phi")],
  },
  {
    intent: AdvisorIntent.CAREER_PATH,
    weight: 3,
    patterns: [
      w("ra làm gì"),
      w("ra lam gi"),
      w("việc làm"),
      w("viec lam"),
      w("nghề nghiệp"),
      w("nghe nghiep"),
      w("cơ hội việc làm"),
      w("co hoi viec lam"),
    ],
  },
  {
    intent: AdvisorIntent.PERSONAL_FIT,
    weight: 3,
    patterns: [
      w("phù hợp với em"),
      w("phu hop voi em"),
      w("em thích"),
      w("em thich"),
      w("em giỏi"),
      w("em gioi"),
      w("em không thích"),
      w("em khong thich"),
      w("hợp với em"),
      w("hop voi em"),
    ],
  },
  {
    intent: AdvisorIntent.REVIEW_MAJOR,
    weight: 3,
    patterns: [
      w("review ngành"),
      w("review nganh"),
      /(?:^|[^\p{L}\p{N}])ngành\s+.+?\s+học gì(?:$|[^\p{L}\p{N}])/iu,
      /(?:^|[^\p{L}\p{N}])nganh\s+.+?\s+hoc gi(?:$|[^\p{L}\p{N}])/iu,
      /(?:^|[^\p{L}\p{N}])ngành\s+.+?\s+có khó không(?:$|[^\p{L}\p{N}])/iu,
      /(?:^|[^\p{L}\p{N}])nganh\s+.+?\s+co kho khong(?:$|[^\p{L}\p{N}])/iu,
      w("học ngành\\s+.+?\\s+có khó không"),
      w("hoc nganh\\s+.+?\\s+co kho khong"),
    ],
  },
];

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function stripPunctuation(value: string) {
  return normalizeWhitespace(value.replace(/[?.!,;:]+$/g, ""));
}

function titleCaseLike(value: string) {
  return stripPunctuation(value)
    .replace(/^(ngành|nganh|trường|truong|đại học|dai hoc)\s+/i, "")
    .trim();
}

function matchFirst(text: string, patterns: RegExp[]) {
  return patterns.find((pattern) => pattern.test(text));
}

function extractYear(text: string) {
  const match = text.match(YEAR_PATTERN);
  return match ? Number(match[1]) : undefined;
}

function extractScore(text: string): number | undefined {
  // Normalize commas to dots
  const normalizedText = text.replace(/,/g, ".");
  const textWithoutProgramCodes = normalizedText.replace(
    /\b[A-Z]{1,4}[\s-]?E[\s-]?\d{1,3}[A-Z]?\b|\b[A-Z]{2,4}\d{1,3}[A-Z]?\b/gi,
    " ",
  );

  // Check explicit range: "tầm 24-25" -> return 25
  const rangeMatch = normalizedText.match(/\btầm\s+(\d{1,2}(?:\.\d{1,2})?)\s*-\s*(\d{1,2}(?:\.\d{1,2})?)\b/i);
  if (rangeMatch) {
    const s2 = Number(rangeMatch[2]);
    if (s2 >= 0 && s2 <= 40) return s2;
  }

  // Check explicit "em được 25"
  const emDuocMatch = normalizedText.match(/\b(?:em được|em duoc|được|duoc)\s+(\d{1,2}(?:\.\d{1,2})?)\b/i);
  if (emDuocMatch) {
    const s = Number(emDuocMatch[1]);
    if (s >= 0 && s <= 40) return s;
  }

  // Check explicit score marker: "26.9 điểm", "26.9 diem"
  const diemMatch = normalizedText.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?:điểm|diem|\/\s*30)\b/i);
  if (diemMatch) {
    const s = Number(diemMatch[1]);
    if (s >= 0 && s <= 40) return s;
  }

  // Check score with combination or word context
  const contextMatch = normalizedText.match(/(\d{1,2}(?:\.\d{1,2})?)\s*(?=(?:A00|A01|B00|C00|D01|D07|D14|D15|H00|V00|nên|nen|vào|vao|chọn|chon)\b)/i);
  if (contextMatch) {
    const s = Number(contextMatch[1]);
    if (s >= 0 && s <= 40) return s;
  }

  // General standalone number between 10 and 40
  const standaloneMatch = textWithoutProgramCodes.match(/\b(\d{1,2}(?:\.\d{1,2})?)\b/);
  if (standaloneMatch) {
    const s = Number(standaloneMatch[1]);
    if (s >= 10 && s <= 40) return s;
  }

  return undefined;
}

function extractCombination(text: string) {
  const match = text.match(COMBINATION_PATTERN);
  return match?.[1]?.toUpperCase();
}

function extractRegion(text: string) {
  return REGION_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}

function extractInterests(text: string): string[] {
  const extracted: string[] = [];
  for (const { label, patterns } of INTERESTS_MAP) {
    if (patterns.some((pattern) => pattern.test(text))) {
      extracted.push(label);
    }
  }
  return extracted;
}

function extractSchoolCode(text: string) {
  const normalized = text.toLowerCase();
  const alias = Object.entries(SCHOOL_CODE_ALIASES).find(([key]) =>
    new RegExp(`(?:^|[^\\p{L}\\p{N}])${key}(?:$|[^\\p{L}\\p{N}])`, "iu").test(normalized),
  );

  if (alias) return alias[1];

  const explicitCodes = text.match(/\b[A-Z]{2,8}\b/g) ?? [];
  return explicitCodes.find((code) => KNOWN_SCHOOL_CODES.has(code));
}

function extractProgramCode(text: string) {
  const advancedProgramMatch = text.match(
    /(?:^|[^\p{L}\p{N}])([A-Z]{1,3}[\s-]?E[\s-]?\d{1,3}[A-Z]?)(?=$|[^\p{L}\p{N}])/iu,
  );
  const advancedProgramCode = canonicalizeAdvisorProgramCode(
    advancedProgramMatch?.[1],
  );
  if (advancedProgramCode && !ADMISSION_COMBINATION_CODES.has(advancedProgramCode)) {
    return advancedProgramCode;
  }

  const matches = text.match(
    /(?:^|[^\p{L}\p{N}])([A-Z]{1,4}(?:-[A-Z]{1,3})?\d{1,3}[A-Z]?)(?=$|[^\p{L}\p{N}])/gu,
  ) ?? [];

  for (const rawMatch of matches) {
    const code = canonicalizeAdvisorProgramCode(
      rawMatch.replace(/[^\p{L}\p{N}-]/gu, ""),
    );
    if (/^E\d{1,3}[A-Z]?$/.test(code ?? "")) continue;
    if (!code || ADMISSION_COMBINATION_CODES.has(code)) continue;
    return code;
  }

  return undefined;
}

function extractAfter(
  text: string,
  pattern: RegExp,
  stopPattern = /(?:^|[^\p{L}\p{N}])(tại|tai|ở|o|năm|nam|thì|thi|có|co|hiện nay|hien nay|nếu|neu|thích|thich|em|cho|chọn|chon)(?:$|[^\p{L}\p{N}])/iu,
) {
  const match = text.match(pattern);
  if (!match?.[1]) return undefined;

  const [value] = match[1].split(stopPattern);
  return titleCaseLike(value);
}

function extractMajorName(text: string) {
  return (
    extractAfter(text, /(?:^|[^\p{L}\p{N}])review\s+(?:ngành|nganh)\s+(.+)/iu) ??
    extractAfter(text, /(?:^|[^\p{L}\p{N}])(?:ngành|nganh)\s+(.+?)\s+(?:học gì|hoc gi|có khó không|co kho khong|ra làm gì|ra lam gi|cơ hội|co hoi)/iu) ??
    extractAfter(text, /(?:^|[^\p{L}\p{N}])học\s+(?:ngành\s+)?(.+?)\s+(?:ra làm gì|có dễ|có khó|hiện nay|hoc phi|học phí)/iu) ??
    extractAfter(text, /(?:^|[^\p{L}\p{N}])hoc\s+(?:nganh\s+)?(.+?)\s+(?:ra lam gi|co de|co kho|hien nay|hoc phi)/iu) ??
    extractAfter(text, /(?:^|[^\p{L}\p{N}])học phí\s+(?:ngành\s+)?(.+)/iu) ??
    extractAfter(text, /(?:^|[^\p{L}\p{N}])hoc phi\s+(?:nganh\s+)?(.+)/iu)
  );
}

function extractSchoolName(text: string) {
  return (
    extractAfter(text, /(?:^|[^\p{L}\p{N}])(?:tại|tai|ở|o)\s+(.+?)(?:\s+(?:ngành|nganh|năm|nam|với|voi|hiện nay|hien nay)|$)/iu) ??
    extractAfter(text, /(?:^|[^\p{L}\p{N}])(?:của|cua)\s+(.+?)(?:\s+(?:năm|nam|ngành|nganh)|$)/iu)
  );
}

function extractTwoItems(text: string, leadingPattern: RegExp) {
  const match = text.match(leadingPattern);
  if (!match?.[1] || !match?.[2]) return undefined;

  return [titleCaseLike(match[1]), titleCaseLike(match[2])] as const;
}

function extractComparedMajors(text: string) {
  return (
    extractTwoItems(text, /(?:^|[^\p{L}\p{N}])so sánh\s+(.+?)\s+và\s+(.+?)(?:\s+(?:ở|tại|neu|ftu|hust|ngành|năm)|$)/iu) ??
    extractTwoItems(text, /(?:^|[^\p{L}\p{N}])so sanh\s+(.+?)\s+va\s+(.+?)(?:\s+(?:o|tai|neu|ftu|hust|nganh|nam)|$)/iu) ??
    extractTwoItems(text, /(?:^|[^\p{L}\p{N}])nên chọn ngành\s+(.+?)\s+hay\s+(.+?)(?:\?|$)/iu) ??
    extractTwoItems(text, /(?:^|[^\p{L}\p{N}])nen chon nganh\s+(.+?)\s+hay\s+(.+?)(?:\?|$)/iu) ??
    extractTwoItems(text, /(?:^|[^\p{L}\p{N}])compare\s+(?:the\s+)?(?:benchmark(?:s)?\s+)?(?:of\s+|between\s+)?(.+?)\s+(?:and|vs|versus)\s+(.+?)(?:\?|$)/iu)
  );
}

function extractComparedSchools(text: string) {
  return (
    extractTwoItems(text, /(?:^|[^\p{L}\p{N}])so sánh\s+(.+?)\s+và\s+(.+?)(?:\s+(?:ngành|nganh|trường|truong)|$)/iu) ??
    extractTwoItems(text, /(?:^|[^\p{L}\p{N}])so sanh\s+(.+?)\s+va\s+(.+?)(?:\s+(?:nganh|truong)|$)/iu) ??
    extractTwoItems(text, /(?:^|[^\p{L}\p{N}])(.+?)\s+hay\s+(.+?)(?:\s+(?:ngành|nganh|trường|truong|tốt hơn|tot hon)|\?|$)/iu)
  );
}

function isBroadSuggestion(text: string) {
  return Boolean(matchFirst(text, BROAD_SUGGESTION_PATTERNS));
}

function asksForLatest(text: string) {
  return Boolean(matchFirst(text, WEB_SEARCH_PATTERNS));
}

function asksForBenchmark(text: string) {
  return Boolean(matchFirst(text, BENCHMARK_PATTERNS));
}

function scoreIntent(text: string) {
  const scores = new Map<AdvisorIntent, number>();

  for (const rule of INTENT_RULES) {
    const hits = rule.patterns.filter((pattern) => pattern.test(text)).length;
    if (hits) {
      scores.set(rule.intent, (scores.get(rule.intent) ?? 0) + hits * rule.weight);
    }
  }

  const sorted = Array.from(scores.entries()).sort((left, right) => right[1] - left[1]);
  const [topIntent, topScore] = sorted[0] ?? [AdvisorIntent.UNKNOWN, 0];
  const runnerUp = sorted[1]?.[1] ?? 0;

  if (!topScore) {
    return {
      intent: AdvisorIntent.UNKNOWN,
      confidence: 0.25,
    };
  }

  const margin = Math.max(0, topScore - runnerUp);
  const confidence = Math.min(0.95, 0.52 + topScore * 0.08 + margin * 0.03);

  return {
    intent: topIntent,
    confidence: Number(confidence.toFixed(2)),
  };
}

function determineMissingFields(
  intent: AdvisorIntent,
  extracted: AdvisorClassification["extracted"],
  broadSuggestion: boolean,
) {
  const missingFields: string[] = [];
  const majorRequiredIntents: AdvisorIntent[] = [
    AdvisorIntent.REVIEW_MAJOR,
    AdvisorIntent.CAREER_PATH,
    AdvisorIntent.TUITION,
  ];

  if (
    majorRequiredIntents.includes(intent) &&
    !extracted.majorName &&
    !broadSuggestion
  ) {
    missingFields.push("majorName");
  }

  if (intent === AdvisorIntent.COMPARE_MAJORS) {
    if (!extracted.majorA) missingFields.push("majorA");
    if (!extracted.majorB) missingFields.push("majorB");
  }

  if (intent === AdvisorIntent.COMPARE_SCHOOLS && !broadSuggestion) {
    if (!extracted.schoolA) missingFields.push("schoolA");
    if (!extracted.schoolB) missingFields.push("schoolB");
  }

  if (intent === AdvisorIntent.ADMISSION_CHANCE) {
    if (!extracted.score) missingFields.push("score");
  }

  if (intent === AdvisorIntent.SCORE_SUGGESTION) {
    if (!extracted.score) missingFields.push("score");
  }

  return missingFields;
}

export function classifyAdvisorQuestion(question: string): AdvisorClassification {
  const text = normalizeWhitespace(question);
  const lowerText = text.toLowerCase();
  const baseClassification = scoreIntent(text);
  const broadSuggestion = isBroadSuggestion(lowerText);
  const latest = asksForLatest(text);
  const benchmark = asksForBenchmark(text);

  let intent = baseClassification.intent;
  let confidence = baseClassification.confidence;

  const score = extractScore(text);
  const combination = extractCombination(text);
  const region = extractRegion(text);
  const interests = extractInterests(text);

  // If score + combination are present, prioritize admission recommendation (SCORE_SUGGESTION)
  if (score !== undefined && combination !== undefined) {
    intent = AdvisorIntent.SCORE_SUGGESTION;
    confidence = 0.95;
  } else if (broadSuggestion && score !== undefined) {
    intent = AdvisorIntent.SCORE_SUGGESTION;
    confidence = Math.max(confidence, 0.85);
  }

  if (latest && /tuyển sinh|tuyen sinh|chính thức|chinh thuc|mới nhất|moi nhat/i.test(text)) {
    intent = AdvisorIntent.LATEST_ADMISSION_INFO;
    confidence = Math.max(confidence, 0.76);
  }

  if (benchmark && /\b(compare|so sánh|so sanh)\b/i.test(text)) {
    intent = AdvisorIntent.COMPARE_MAJORS;
    confidence = Math.max(confidence, 0.78);
  }

  const extracted: AdvisorClassification["extracted"] = {
    score,
    combination,
    region,
    year: extractYear(text),
    interests: interests.length > 0 ? interests : undefined,
  };

  const schoolCode = extractSchoolCode(text);
  if (schoolCode) extracted.schoolCode = schoolCode;

  const programCode = extractProgramCode(text);
  if (programCode) extracted.programCode = programCode;

  const schoolName = extractSchoolName(text);
  // Clear schoolName if it duplicates the region to prevent confusion
  if (schoolName && schoolName !== region && !schoolCode) {
    extracted.schoolName = schoolName;
  }

  const majorName = extractMajorName(text);
  if (majorName) {
    extracted.majorName =
      programCode && canonicalizeAdvisorProgramCode(majorName) === programCode
        ? programCode
        : majorName;
  }

  if (intent === AdvisorIntent.COMPARE_MAJORS) {
    const majors = extractComparedMajors(text);
    if (majors) {
      extracted.majorA = majors[0];
      extracted.majorB = majors[1];
    }
  }

  if (intent === AdvisorIntent.COMPARE_SCHOOLS) {
    const schools = extractComparedSchools(text);
    if (schools) {
      extracted.schoolA = schools[0];
      extracted.schoolB = schools[1];
    }
  }

  let missingFields = determineMissingFields(intent, extracted, broadSuggestion);
  if (benchmark && intent === AdvisorIntent.ADMISSION_CHANCE) {
    missingFields = missingFields.filter((field) => field !== "score");
  }
  const shouldUseWebSearch = latest || benchmark || extracted.year !== undefined;
  const reasonForWebSearch = shouldUseWebSearch
    ? "Câu hỏi có dấu hiệu yêu cầu thông tin mới, theo năm hoặc nguồn chính thức."
    : undefined;

  // Extract secondaryIntents (e.g. PERSONAL_FIT if student interest is matched)
  const secondaryIntents: AdvisorIntent[] = [];
  if (interests.length > 0) {
    secondaryIntents.push(AdvisorIntent.PERSONAL_FIT);
  }

  return {
    intent,
    confidence,
    extracted,
    secondaryIntents: secondaryIntents.length > 0 ? secondaryIntents : undefined,
    interests: interests.length > 0 ? interests : undefined,
    score,
    combination,
    region,
    needsMoreInfo: missingFields.length > 0,
    missingFields,
    shouldUseWebSearch,
    reasonForWebSearch,
  };
}
