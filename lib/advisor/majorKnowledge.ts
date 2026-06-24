import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

import { AdvisorIntent } from "@/lib/advisor/intents";
import type { AdvisorPreferenceSignals } from "@/lib/advisor/classifier";

export type MajorProfile = {
  majorId: string;
  canonicalName: string;
  aliases: string[];
  category: string;
  tags: string[];
  searchKeywords: string[];
  scope: string;
  status: string;
  version: number;
  oneLineDefinition: string;
  overview: string;
  difficultyLevel: number;
  mathIntensity: number;
  codingIntensity: number;
  englishIntensity: number;
  foundationSubjects: string[];
  advancedSubjects: string[];
  toolsAndTechnologies: string[];
  typicalProjects: string[];
  requiredSkills: string[];
  suitableFor: string[];
  notSuitableFor: string[];
  keyTakeaways: string[];
  cautionNotes: string[];
  careerPaths: string[];
  marketDemand: string;
  salaryOutlook: string;
  futureTrend: string;
  commonMisconceptions: string[];
  relatedMajors: Array<{ major: string; relationship: string }>;
  faq: Array<{ question: string; answer: string }>;
  sources: Array<{
    title: string;
    url?: string;
    type: string;
    retrievedAt?: string;
  }>;
  confidenceLevel: "high" | "medium" | "low";
  lastUpdated: string;
};

export type MajorKnowledgeIntentClassification = {
  intent: "REVIEW_MAJOR" | "COMPARE_MAJORS" | "CHOOSE_MAJOR" | "UNKNOWN";
  matchedMajors: string[];
  confidence: number;
  needClarification: boolean;
};

type MajorIndexEntry = {
  filePath: string;
  profile: MajorProfile;
};

export type ResolvedMajorProfile = {
  majorId: string;
  canonicalName: string;
  matchConfidence: number;
  matchedBy: "canonical" | "alias" | "keyword" | "majorId";
  profile: MajorProfile;
};

export type MajorDecisionHint = {
  factor: "mathTolerance" | "codingTolerance" | "englishPreference" | "communicationPreference" | "writingPreference" | "stabilityPreference";
  preferredMajorId?: string;
  preferredMajorName?: string;
  reason: string;
};

export type MajorKnowledgeContext = {
  status: "success" | "empty" | "error";
  source: "advisor_major_profiles";
  intent: AdvisorIntent;
  secondaryIntent?: AdvisorIntent;
  decisionQuestion?: string;
  studentPreferenceSignals?: AdvisorPreferenceSignals;
  decisionHints?: MajorDecisionHint[];
  requestedClusters?: string[];
  data?: {
    profiles: Array<ReturnType<typeof selectReviewMajorFields>>;
    comparisonProfiles?: Array<ReturnType<typeof selectCompareMajorFields>>;
  };
  resolvedMajors?: Array<Omit<ResolvedMajorProfile, "profile">>;
  reason?: string;
};

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");
let cachedMajorIndex: MajorIndexEntry[] | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function readJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return readJsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
  });
}

function parseMajorProfile(filePath: string): MajorProfile | null {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    if (!isRecord(parsed)) return null;
    if (typeof parsed.majorId !== "string" || typeof parsed.canonicalName !== "string") {
      return null;
    }
    return parsed as MajorProfile;
  } catch {
    return null;
  }
}

export function loadMajorProfiles() {
  if (cachedMajorIndex) return cachedMajorIndex;

  cachedMajorIndex = readJsonFiles(KNOWLEDGE_ROOT)
    .map((filePath) => {
      const profile = parseMajorProfile(filePath);
      return profile ? { filePath, profile } : null;
    })
    .filter((entry): entry is MajorIndexEntry => Boolean(entry));

  return cachedMajorIndex;
}

function scoreProfileMatch(query: string, profile: MajorProfile): ResolvedMajorProfile | null {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  if (normalizeText(profile.majorId) === normalizedQuery) {
    return {
      majorId: profile.majorId,
      canonicalName: profile.canonicalName,
      matchConfidence: 1,
      matchedBy: "majorId",
      profile,
    };
  }

  if (normalizeText(profile.canonicalName) === normalizedQuery) {
    return {
      majorId: profile.majorId,
      canonicalName: profile.canonicalName,
      matchConfidence: 0.98,
      matchedBy: "canonical",
      profile,
    };
  }

  if ((profile.aliases ?? []).some((alias) => normalizeText(alias) === normalizedQuery)) {
    return {
      majorId: profile.majorId,
      canonicalName: profile.canonicalName,
      matchConfidence: 0.93,
      matchedBy: "alias",
      profile,
    };
  }

  if ((profile.searchKeywords ?? []).some((keyword) => normalizeText(keyword) === normalizedQuery)) {
    return {
      majorId: profile.majorId,
      canonicalName: profile.canonicalName,
      matchConfidence: 0.86,
      matchedBy: "keyword",
      profile,
    };
  }

  const terms = [
    profile.canonicalName,
    ...(profile.aliases ?? []),
    ...(profile.searchKeywords ?? []),
  ].map(normalizeText);

  if (terms.some((term) => term && (normalizedQuery.includes(term) || term.includes(normalizedQuery)))) {
    return {
      majorId: profile.majorId,
      canonicalName: profile.canonicalName,
      matchConfidence: 0.72,
      matchedBy: "keyword",
      profile,
    };
  }

  return null;
}

export function resolveMajorProfiles(queries: string[], maxResults = 2): ResolvedMajorProfile[] {
  const results = new Map<string, ResolvedMajorProfile>();
  const profiles = loadMajorProfiles();

  for (const query of queries.filter(Boolean)) {
    const matches = profiles
      .map(({ profile }) => scoreProfileMatch(query, profile))
      .filter((match): match is ResolvedMajorProfile => Boolean(match))
      .sort((left, right) => right.matchConfidence - left.matchConfidence);

    for (const match of matches.slice(0, maxResults)) {
      const existing = results.get(match.majorId);
      if (!existing || existing.matchConfidence < match.matchConfidence) {
        results.set(match.majorId, match);
      }
    }
  }

  return Array.from(results.values())
    .sort((left, right) => right.matchConfidence - left.matchConfidence)
    .slice(0, maxResults);
}

export function selectReviewMajorFields(profile: MajorProfile) {
  return {
    majorId: profile.majorId,
    canonicalName: profile.canonicalName,
    overview: profile.overview,
    difficulty: {
      difficultyLevel: profile.difficultyLevel,
      mathIntensity: profile.mathIntensity,
      codingIntensity: profile.codingIntensity,
      englishIntensity: profile.englishIntensity,
    },
    studyContent: {
      foundationSubjects: profile.foundationSubjects,
      advancedSubjects: profile.advancedSubjects,
      toolsAndTechnologies: profile.toolsAndTechnologies,
      typicalProjects: profile.typicalProjects,
    },
    fit: {
      requiredSkills: profile.requiredSkills,
      suitableFor: profile.suitableFor,
      notSuitableFor: profile.notSuitableFor,
    },
    career: {
      careerPaths: profile.careerPaths,
      marketDemand: profile.marketDemand,
      salaryOutlook: profile.salaryOutlook,
      futureTrend: profile.futureTrend,
    },
    notes: {
      keyTakeaways: profile.keyTakeaways,
      cautionNotes: profile.cautionNotes,
      commonMisconceptions: profile.commonMisconceptions,
    },
    metadata: {
      confidenceLevel: profile.confidenceLevel,
      lastUpdated: profile.lastUpdated,
    },
  };
}

export function selectCompareMajorFields(profile: MajorProfile) {
  return {
    majorId: profile.majorId,
    canonicalName: profile.canonicalName,
    overview: profile.overview,
    difficulty: {
      difficultyLevel: profile.difficultyLevel,
      mathIntensity: profile.mathIntensity,
      codingIntensity: profile.codingIntensity,
      englishIntensity: profile.englishIntensity,
    },
    foundationSubjects: profile.foundationSubjects,
    advancedSubjects: profile.advancedSubjects,
    typicalProjects: profile.typicalProjects,
    careerPaths: profile.careerPaths,
    suitableFor: profile.suitableFor,
    notSuitableFor: profile.notSuitableFor,
    cautionNotes: profile.cautionNotes,
  };
}

export function selectChooseMajorFields(profile: MajorProfile) {
  return {
    majorId: profile.majorId,
    canonicalName: profile.canonicalName,
    oneLineDefinition: profile.oneLineDefinition,
    category: profile.category,
    tags: profile.tags,
    difficulty: {
      mathIntensity: profile.mathIntensity,
      codingIntensity: profile.codingIntensity,
      englishIntensity: profile.englishIntensity,
    },
    suitableFor: profile.suitableFor,
    notSuitableFor: profile.notSuitableFor,
    careerPaths: profile.careerPaths,
    marketDemand: profile.marketDemand,
    relatedMajors: profile.relatedMajors,
  };
}

// Maps user interest labels (from INTERESTS_MAP in classifier) → knowledge category strings.
// This prevents "Kinh tế" (cluster label) from being matched to Economics.json alias
// and instead loads ALL profiles in the relevant category cluster.
const INTEREST_TO_CATEGORY_CLUSTER: Record<string, string[]> = {
  "Kinh tế": ["Business & Economics", "Business & Management"],
  "Kinh doanh": ["Business & Economics", "Business & Management"],
  "Marketing": ["Business & Management"],
  "Logistics": ["Business & Management"],
  "Ngôn ngữ": ["Social Sciences & Humanities"],
  "Truyền thông": ["Business & Management", "Social Sciences & Humanities"],
  "IT": ["Technology & Computing"],
  "AI": ["Technology & Computing"],
  "Dữ liệu": ["Technology & Computing"],
  "Công nghệ": ["Technology & Computing"],
  "Thiết kế": ["Arts & Design"],
  "Cơ khí": ["Engineering"],
  "Điện tử": ["Engineering"],
  "Tự động hóa": ["Engineering"],
};

function resolveTargetCategories(interestLabels: string[]): Set<string> {
  const categories = new Set<string>();
  for (const label of interestLabels) {
    const mapped = INTEREST_TO_CATEGORY_CLUSTER[label];
    if (mapped) mapped.forEach((c) => categories.add(c));
  }
  return categories;
}

function scoreProfileBySignals(
  profile: MajorProfile,
  signals?: AdvisorPreferenceSignals,
): number {
  if (!signals) return 0;
  let score = 0;

  if (signals.codingTolerance === "low") score -= profile.codingIntensity * 2;
  if (signals.mathTolerance === "low") score -= profile.mathIntensity;
  if (signals.communicationPreference === "high") {
    const comm = [...(profile.tags ?? []), ...(profile.suitableFor ?? [])].join(" ").toLowerCase();
    if (/communication|giao tiếp|social|presentation|client|customer/.test(comm)) score += 3;
  }
  if (signals.writingPreference === "high") {
    const write = [...(profile.tags ?? []), ...(profile.suitableFor ?? [])].join(" ").toLowerCase();
    if (/writing|language|literature|media|content|editorial|translation/.test(write)) score += 3;
  }
  if (signals.englishPreference === "high") score += profile.englishIntensity;

  return score;
}

function resolveMajorProfilesByCategory(
  categoryKeywords: string[],
  maxResults = 6,
  signals?: AdvisorPreferenceSignals,
): { profiles: ResolvedMajorProfile[]; requestedClusters: string[] } {
  const allProfiles = loadMajorProfiles();

  // Step 1: try cluster-based resolution first (prevents alias confusion)
  const targetCategories = resolveTargetCategories(categoryKeywords);
  const requestedClusters = Array.from(targetCategories);

  if (targetCategories.size > 0) {
    const byCategory = new Map<string, MajorIndexEntry[]>();
    for (const entry of allProfiles) {
      if (!targetCategories.has(entry.profile.category)) continue;
      const bucket = byCategory.get(entry.profile.category) ?? [];
      bucket.push(entry);
      byCategory.set(entry.profile.category, bucket);
    }

    if (byCategory.size > 0) {
      // Sort each cluster bucket by student signal relevance before sampling
      for (const [cat, bucket] of byCategory.entries()) {
        byCategory.set(
          cat,
          bucket.sort((a, b) => scoreProfileBySignals(b.profile, signals) - scoreProfileBySignals(a.profile, signals)),
        );
      }

      // Round-robin across clusters to ensure every cluster is represented
      const perCluster = Math.max(1, Math.floor(maxResults / byCategory.size));
      const sampled: MajorIndexEntry[] = [];
      for (const bucket of byCategory.values()) {
        sampled.push(...bucket.slice(0, perCluster));
      }
      // Fill remaining slots if total < maxResults
      if (sampled.length < maxResults) {
        for (const bucket of byCategory.values()) {
          for (const entry of bucket.slice(perCluster)) {
            if (sampled.length >= maxResults) break;
            if (!sampled.includes(entry)) sampled.push(entry);
          }
        }
      }

      return {
        requestedClusters,
        profiles: sampled.slice(0, maxResults).map(({ profile }) => ({
          majorId: profile.majorId,
          canonicalName: profile.canonicalName,
          matchConfidence: 0.75,
          matchedBy: "keyword" as const,
          profile,
        })),
      };
    }
  }

  // Step 2: fallback — keyword match against tags/searchKeywords only (skip aliases/names
  // to avoid conflating cluster label with specific major name)
  if (!categoryKeywords.length) {
    return {
      requestedClusters: [],
      profiles: allProfiles.slice(0, maxResults).map(({ profile }) => ({
        majorId: profile.majorId,
        canonicalName: profile.canonicalName,
        matchConfidence: 0.5,
        matchedBy: "keyword" as const,
        profile,
      })),
    };
  }

  const normalizedKeywords = categoryKeywords.map(normalizeText);
  const scored: Array<{ entry: MajorIndexEntry; score: number }> = [];

  for (const entry of allProfiles) {
    const { profile } = entry;
    const fields = [
      profile.category,
      ...(profile.tags ?? []),
      ...(profile.searchKeywords ?? []),
    ].map(normalizeText);

    let score = 0;
    for (const kw of normalizedKeywords) {
      if (fields.some((f) => f.includes(kw) || kw.includes(f))) score += 1;
    }
    if (score > 0) scored.push({ entry, score });
  }

  return {
    requestedClusters: [],
    profiles: scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ entry, score }) => ({
        majorId: entry.profile.majorId,
        canonicalName: entry.profile.canonicalName,
        matchConfidence: Math.min(0.5 + score * 0.1, 0.8),
        matchedBy: "keyword" as const,
        profile: entry.profile,
      })),
  };
}

export function buildMajorKnowledgeContext({
  intent,
  matchedMajors,
  secondaryIntent,
  decisionQuestion,
  studentPreferenceSignals,
  categoryKeywords,
}: {
  intent: AdvisorIntent;
  matchedMajors: string[];
  secondaryIntent?: AdvisorIntent;
  decisionQuestion?: string;
  studentPreferenceSignals?: AdvisorPreferenceSignals;
  categoryKeywords?: string[];
}): MajorKnowledgeContext {
  // PERSONAL_FIT (CHOOSE_MAJOR): cluster-based retrieval — load ALL profiles
  // from the matching category cluster, not by alias/name match.
  if (intent === AdvisorIntent.PERSONAL_FIT) {
    const { profiles: resolved, requestedClusters } = resolveMajorProfilesByCategory(
      [...(categoryKeywords ?? []), ...(matchedMajors ?? [])],
      6,
      studentPreferenceSignals,
    );

    if (!resolved.length) {
      return {
        status: "empty",
        source: "advisor_major_profiles",
        intent,
        secondaryIntent,
        decisionQuestion,
        studentPreferenceSignals,
        reason: "No matching major profiles found for the given interests.",
      };
    }

    return {
      status: "success",
      source: "advisor_major_profiles",
      intent,
      secondaryIntent,
      decisionQuestion,
      studentPreferenceSignals,
      requestedClusters: requestedClusters.length ? requestedClusters : undefined,
      resolvedMajors: resolved.map(({ majorId, canonicalName, matchConfidence, matchedBy }) => ({
        majorId,
        canonicalName,
        matchConfidence,
        matchedBy,
      })),
      data: {
        profiles: resolved.map(({ profile }) => selectChooseMajorFields(profile) as unknown as ReturnType<typeof selectReviewMajorFields>),
      },
    };
  }

  if (intent !== AdvisorIntent.REVIEW_MAJOR && intent !== AdvisorIntent.COMPARE_MAJORS) {
    return {
      status: "empty",
      source: "advisor_major_profiles",
      intent,
      secondaryIntent,
      decisionQuestion,
      studentPreferenceSignals,
      reason: "Intent is not supported by major profile retrieval.",
    };
  }

  const maxResults = intent === AdvisorIntent.COMPARE_MAJORS ? 2 : 1;
  const resolved = resolveMajorProfiles(matchedMajors, maxResults);
  const decisionHints =
    intent === AdvisorIntent.COMPARE_MAJORS && studentPreferenceSignals
      ? buildDecisionHints({
          resolved,
          studentPreferenceSignals,
        })
      : undefined;

  if (!resolved.length) {
    return {
      status: "empty",
      source: "advisor_major_profiles",
      intent,
      reason: "No matching major profile found in knowledge.",
    };
  }

  const resolvedMajors = resolved.map((major) => ({
    majorId: major.majorId,
    canonicalName: major.canonicalName,
    matchConfidence: major.matchConfidence,
    matchedBy: major.matchedBy,
  }));

  return {
    status: "success",
    source: "advisor_major_profiles",
    intent,
    secondaryIntent,
    decisionQuestion,
    studentPreferenceSignals,
    decisionHints,
    resolvedMajors,
    data: {
      profiles: resolved.map(({ profile }) => selectReviewMajorFields(profile)),
      comparisonProfiles:
        intent === AdvisorIntent.COMPARE_MAJORS
          ? resolved.map(({ profile }) => selectCompareMajorFields(profile))
          : undefined,
    },
  };
}

function buildDecisionHints({
  resolved,
  studentPreferenceSignals,
}: {
  resolved: ResolvedMajorProfile[];
  studentPreferenceSignals: AdvisorPreferenceSignals;
}): MajorDecisionHint[] {
  if (resolved.length < 2) return [];

  const [left, right] = resolved;
  const hints: MajorDecisionHint[] = [];

  const compareByLowerIntensity = (
    factor: MajorDecisionHint["factor"],
    getter: (profile: MajorProfile) => number,
    label: string,
  ) => {
    const leftValue = getter(left.profile);
    const rightValue = getter(right.profile);
    if (leftValue === rightValue) return;

    const preferred = leftValue < rightValue ? left : right;
    const lowerPreference = studentPreferenceSignals[factor];
    if (lowerPreference !== "low") return;

    hints.push({
      factor,
      preferredMajorId: preferred.majorId,
      preferredMajorName: preferred.canonicalName,
      reason: `${preferred.canonicalName} có ${label} thấp hơn (${leftValue} vs ${rightValue}), nên thường dễ tiếp cận hơn với bạn nếu bạn không thích ${label} nhiều.`,
    });
  };

  compareByLowerIntensity("mathTolerance", (profile) => profile.mathIntensity, "toán");
  compareByLowerIntensity("codingTolerance", (profile) => profile.codingIntensity, "code");
  compareByLowerIntensity("englishPreference", (profile) => profile.englishIntensity, "tiếng Anh");

  if (studentPreferenceSignals.communicationPreference === "high") {
    hints.push({
      factor: "communicationPreference",
      preferredMajorId: undefined,
      preferredMajorName: undefined,
      reason: "Bạn thiên về giao tiếp, nên ưu tiên ngành có nhiều hoạt động thuyết trình, trao đổi, khách hàng hoặc đối ngoại hơn.",
    });
  }

  if (studentPreferenceSignals.writingPreference === "high") {
    hints.push({
      factor: "writingPreference",
      preferredMajorId: undefined,
      preferredMajorName: undefined,
      reason: "Bạn thích viết lách, nên ưu tiên ngành có nhiều đọc - viết, biên tập, nội dung hoặc ngôn ngữ hơn.",
    });
  }

  if (studentPreferenceSignals.stabilityPreference === "high") {
    hints.push({
      factor: "stabilityPreference",
      preferredMajorId: undefined,
      preferredMajorName: undefined,
      reason: "Bạn ưu tiên ổn định, nên cân nhắc ngành có đầu ra rõ ràng và nhu cầu tuyển dụng đều hơn.",
    });
  }

  return hints;
}
