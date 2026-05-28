import type { WebSearchResult } from "@/lib/advisor/retrieval/webSearch";

type RankSourceInput = {
  title: string;
  url: string;
  snippet?: string;
  publisher?: string;
  publishedAt?: string;
};

export type SourceRankOptions = {
  preferOfficialSources?: boolean;
  schoolName?: string;
  year?: number;
};

const GOVERNMENT_DOMAIN_PATTERNS = [
  ".gov.vn",
  "moet.gov.vn",
  "moet.edu.vn",
  "thisinh.thitotnghiepthpt.edu.vn",
];

const OFFICIAL_EDUCATION_DOMAIN_PATTERNS = [
  ".edu.vn",
  ".edu",
  "admissions.",
  "tuyensinh.",
  "daotao.",
];

const NEWS_DOMAIN_PATTERNS = [
  "vnexpress.net",
  "tuoitre.vn",
  "thanhnien.vn",
  "dantri.com.vn",
  "vietnamnet.vn",
  "laodong.vn",
  "giaoduc.net.vn",
  "baochinhphu.vn",
];

const LOW_QUALITY_DOMAIN_PATTERNS = [
  "facebook.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "forum",
  "voz.vn",
  "reddit.com",
  "blogspot.",
  "wordpress.",
  "medium.com",
  "quora.com",
];

const ADMISSION_TERMS = [
  "tuyen-sinh",
  "tuyensinh",
  "admission",
  "de-an-tuyen-sinh",
  "de_an_tuyen_sinh",
  "diem-chuan",
  "hoc-phi",
  "thong-bao",
  "pdf",
];

const SEO_SPAM_TERMS = [
  "toplist",
  "reviewtruong",
  "chontruong",
  "kenhtuyensinh",
  "tuyensinhso",
  "tuyensinh247",
  "diemthi",
  "diem-chuan.com",
  "blog",
];

function getHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeText(value?: string) {
  return value?.toLowerCase().normalize("NFC") ?? "";
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function isLowQualitySource(input: RankSourceInput) {
  const hostname = getHostname(input.url);
  const haystack = normalizeText(
    [hostname, input.title, input.url, input.snippet].join(" "),
  );

  return (
    includesAny(hostname, LOW_QUALITY_DOMAIN_PATTERNS) ||
    includesAny(haystack, SEO_SPAM_TERMS) ||
    haystack.includes("diễn đàn") ||
    haystack.includes("dien dan")
  );
}

function hasRequestedYear(input: RankSourceInput, year?: number) {
  if (!year) return false;

  const yearText = String(year);
  const haystack = normalizeText(
    [input.title, input.url, input.snippet, input.publishedAt].join(" "),
  );

  return haystack.includes(yearText);
}

function inferPublisher(input: RankSourceInput) {
  return input.publisher?.trim() || getHostname(input.url) || undefined;
}

export function classifyWebSource(
  input: Pick<RankSourceInput, "url" | "title" | "snippet">,
): WebSearchResult["sourceType"] {
  const hostname = getHostname(input.url);
  const haystack = normalizeText([hostname, input.title, input.snippet].join(" "));

  if (includesAny(hostname, GOVERNMENT_DOMAIN_PATTERNS)) {
    return "government_site";
  }

  if (includesAny(hostname, OFFICIAL_EDUCATION_DOMAIN_PATTERNS)) {
    return "official_school_site";
  }

  if (includesAny(hostname, NEWS_DOMAIN_PATTERNS)) {
    return "news";
  }

  if (haystack.includes("bộ giáo dục") || haystack.includes("bo giao duc")) {
    return "government_site";
  }

  return "other";
}

export function scoreWebSource(
  input: RankSourceInput,
  options: SourceRankOptions = {},
) {
  const hostname = getHostname(input.url);
  const title = normalizeText(input.title);
  const snippet = normalizeText(input.snippet);
  const url = normalizeText(input.url);
  const sourceType = classifyWebSource(input);
  const haystack = [hostname, title, snippet, url].join(" ");
  let score = 40;

  if (sourceType === "government_site") score = 90;
  if (sourceType === "official_school_site") score = 84;
  if (sourceType === "news") score = 58;

  if (options.preferOfficialSources) {
    if (sourceType === "government_site") score += 8;
    if (sourceType === "official_school_site") score += 10;
    if (sourceType === "news") score -= 4;
  }

  if (includesAny(haystack, ADMISSION_TERMS)) score += 8;
  if (url.endsWith(".pdf") || url.includes(".pdf")) score += 4;
  if (hasRequestedYear(input, options.year)) score += 8;
  if (options.year && !hasRequestedYear(input, options.year)) score -= 10;

  if (options.schoolName) {
    const schoolTokens = normalizeText(options.schoolName)
      .split(/\s+/)
      .filter((token) => token.length >= 3);
    const tokenHits = schoolTokens.filter((token) => haystack.includes(token));
    if (tokenHits.length >= Math.min(2, schoolTokens.length)) score += 6;
  }

  if (includesAny(hostname, LOW_QUALITY_DOMAIN_PATTERNS)) score -= 30;
  if (includesAny(haystack, SEO_SPAM_TERMS)) score -= 18;
  if (haystack.includes("diễn đàn") || haystack.includes("dien dan")) score -= 18;
  if (!hostname || !input.title.trim()) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function rankWebSearchResults(
  results: RankSourceInput[],
  options: SourceRankOptions & { maxResults?: number } = {},
): WebSearchResult[] {
  const accessedAt = new Date().toISOString();
  const seenUrls = new Set<string>();
  const maxResults = options.maxResults ?? 5;

  const rankedResults = results
    .filter((result) => result.url.trim())
    .filter((result) => !isLowQualitySource(result))
    .map((result) => ({
      title: result.title.trim() || inferPublisher(result) || result.url,
      url: result.url.trim(),
      snippet: result.snippet?.trim() || undefined,
      publisher: inferPublisher(result),
      publishedAt: result.publishedAt,
      accessedAt,
      sourceType: classifyWebSource(result),
      credibilityScore: scoreWebSource(result, options),
    }))
    .filter((result) => {
      if (seenUrls.has(result.url)) return false;
      seenUrls.add(result.url);
      return result.credibilityScore >= 45;
    })
    .sort((left, right) => right.credibilityScore - left.credibilityScore);

  if (options.preferOfficialSources) {
    const officialResults = rankedResults.filter(
      (result) =>
        result.sourceType === "official_school_site" ||
        result.sourceType === "government_site",
    );

    if (officialResults.length) {
      return officialResults.slice(0, maxResults);
    }

    const reputableNewsResults = rankedResults.filter(
      (result) => result.sourceType === "news",
    );

    if (reputableNewsResults.length) {
      return reputableNewsResults.slice(0, maxResults);
    }

    return rankedResults
      .filter((result) => result.credibilityScore >= 60)
      .slice(0, maxResults);
  }

  return rankedResults.slice(0, maxResults);
}
