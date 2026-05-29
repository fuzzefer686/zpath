import "server-only";

import type { GenerateContentConfig } from "@google/genai";

import {
  canCacheAdvisorSearchQuery,
  getCachedAdvisorSearchResults,
  inferAdvisorSearchCacheTtlKind,
  normalizeAdvisorSearchQuery,
  setCachedAdvisorSearchResults,
} from "@/lib/advisor/retrieval/searchCache";
import { rankWebSearchResults } from "@/lib/advisor/retrieval/sourceRanker";
import {
  getGeminiClient,
  getGeminiModelName,
  isGeminiConfigured,
} from "@/src/lib/ai/geminiVertexClient";

export type WebSearchProvider =
  | "gemini_grounding"
  | "tavily"
  | "serper"
  | "none";

export type WebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  publisher?: string;
  publishedAt?: string;
  accessedAt: string;
  sourceType: "official_school_site" | "government_site" | "news" | "other";
  credibilityScore: number;
};

export type AdvisorWebSearchOptions = {
  maxResults?: number;
  preferOfficialSources?: boolean;
  forceRefresh?: boolean;
  schoolName?: string;
  programCode?: string;
  year?: number;
};

type RawWebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  publisher?: string;
  publishedAt?: string;
};

type TavilySearchResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    published_date?: string;
  }>;
};

type SerperSearchResponse = {
  organic?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    date?: string;
    source?: string;
  }>;
};

type GeminiGroundingResponse = {
  text?: string;
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          title?: string;
          uri?: string;
          domain?: string;
        };
      }>;
    };
  }>;
};

const DEFAULT_MAX_RESULTS = 8;
const SEARCH_TIMEOUT_MS = 12000;

function getConfiguredProvider(): WebSearchProvider {
  const configured = process.env.WEB_SEARCH_PROVIDER?.trim();

  if (
    configured === "gemini_grounding" ||
    configured === "tavily" ||
    configured === "serper" ||
    configured === "none"
  ) {
    return configured;
  }

  if (isGeminiConfigured()) return "gemini_grounding";
  if (process.env.TAVILY_API_KEY) return "tavily";
  if (process.env.SERPER_API_KEY) return "serper";

  return "none";
}

export function getAdvisorWebSearchProvider() {
  return getConfiguredProvider();
}

function getPublisher(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

async function postJson<T>({
  url,
  headers,
  body,
}: {
  url: string;
  headers: HeadersInit;
  body: unknown;
}): Promise<T | null> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

async function searchWithGeminiGrounding(
  query: string,
  options: AdvisorWebSearchOptions,
): Promise<RawWebSearchResult[]> {
  const config: GenerateContentConfig = {
    temperature: 0,
    maxOutputTokens: 4096,
    thinkingConfig: {
      thinkingBudget: -1,
      thinkingLevel: "HIGH",
    } as GenerateContentConfig["thinkingConfig"],
    tools: [{ googleSearch: {} }],
  };

  const response = (await getGeminiClient().models.generateContent({
    model: getGeminiModelName(),
    contents: [
      "Search the web for reliable sources for this Vietnamese university admission question.",
      "Return concise findings. Prefer official university, official admissions, PDF, and government sources.",
      `Query: ${query}`,
    ].join("\n"),
    config,
  })) as GeminiGroundingResponse;

  const chunks =
    response.candidates?.flatMap((candidate) =>
      candidate.groundingMetadata?.groundingChunks ?? [],
    ) ?? [];

  return chunks
    .map((chunk) => chunk.web)
    .filter((web): web is NonNullable<typeof web> => Boolean(web?.uri))
    .map((web) => ({
      title: web.title ?? web.domain ?? web.uri ?? "Nguồn web",
      url: web.uri ?? "",
      snippet: response.text,
      publisher: web.domain ?? getPublisher(web.uri ?? ""),
    }))
    .slice(0, options.maxResults ?? DEFAULT_MAX_RESULTS);
}

async function searchWithTavily(
  query: string,
  options: AdvisorWebSearchOptions,
): Promise<RawWebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const data = await postJson<TavilySearchResponse>({
    url: "https://api.tavily.com/search",
    headers: {},
    body: {
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: false,
      include_raw_content: false,
      max_results: Math.min(options.maxResults ?? DEFAULT_MAX_RESULTS, 10),
    },
  });

  return (
    data?.results?.map((result) => ({
      title: result.title ?? result.url ?? "Nguồn web",
      url: result.url ?? "",
      snippet: result.content,
      publisher: getPublisher(result.url ?? ""),
      publishedAt: result.published_date,
    })) ?? []
  );
}

async function searchWithSerper(
  query: string,
  options: AdvisorWebSearchOptions,
): Promise<RawWebSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const data = await postJson<SerperSearchResponse>({
    url: "https://google.serper.dev/search",
    headers: {
      "X-API-KEY": apiKey,
    },
    body: {
      q: query,
      gl: "vn",
      hl: "vi",
      num: Math.min(options.maxResults ?? DEFAULT_MAX_RESULTS, 10),
    },
  });

  return (
    data?.organic?.map((result) => ({
      title: result.title ?? result.link ?? "Nguồn web",
      url: result.link ?? "",
      snippet: result.snippet,
      publisher: result.source ?? getPublisher(result.link ?? ""),
      publishedAt: result.date,
    })) ?? []
  );
}

async function runProviderSearch(
  provider: WebSearchProvider,
  query: string,
  options: AdvisorWebSearchOptions,
) {
  if (provider === "gemini_grounding") {
    return searchWithGeminiGrounding(query, options);
  }

  if (provider === "tavily") {
    return searchWithTavily(query, options);
  }

  if (provider === "serper") {
    return searchWithSerper(query, options);
  }

  return [];
}

export async function searchWebForAdvisor(
  query: string,
  options: AdvisorWebSearchOptions = {},
): Promise<WebSearchResult[]> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return [];

  const provider = getConfiguredProvider();
  if (provider === "none") return [];
  const cacheKey = normalizeAdvisorSearchQuery(normalizedQuery);
  const canUseCache =
    !options.forceRefresh &&
    options.year === undefined &&
    canCacheAdvisorSearchQuery(normalizedQuery);
  const maxResults = Math.min(
    options.maxResults ?? DEFAULT_MAX_RESULTS,
    DEFAULT_MAX_RESULTS,
  );

  try {
    if (canUseCache) {
      const cachedResults = await getCachedAdvisorSearchResults({
        normalizedQuery: cacheKey,
        provider,
      });

      if (cachedResults) {
        return cachedResults.slice(0, maxResults);
      }
    }

    const rawResults = await runProviderSearch(provider, normalizedQuery, options);

    const rankedResults = rankWebSearchResults(rawResults, {
      maxResults,
      preferOfficialSources: options.preferOfficialSources,
      schoolName: options.schoolName,
      programCode: options.programCode,
      year: options.year,
    });

    if (canUseCache && rankedResults.length) {
      await setCachedAdvisorSearchResults({
        normalizedQuery: cacheKey,
        provider,
        results: rankedResults,
        ttlKind: inferAdvisorSearchCacheTtlKind(normalizedQuery),
      });
    }

    return rankedResults;
  } catch (error) {
    console.warn("Advisor web search failed:", error);
    return [];
  }
}

export async function searchWebForAdvisorQueries(
  queries: string[],
  options: AdvisorWebSearchOptions = {},
): Promise<WebSearchResult[]> {
  const normalizedQueries = Array.from(
    new Set(
      queries
        .map(normalizeQuery)
        .filter(Boolean)
        .map((query) => query.toLowerCase()),
    ),
  );

  if (!normalizedQueries.length) return [];

  const maxResults = Math.min(
    options.maxResults ?? DEFAULT_MAX_RESULTS,
    DEFAULT_MAX_RESULTS,
  );
  const perQueryMaxResults = Math.min(5, maxResults);
  const resultSets = await Promise.all(
    normalizedQueries.map((query) =>
      searchWebForAdvisor(query, {
        ...options,
        maxResults: perQueryMaxResults,
      }),
    ),
  );
  const seenUrls = new Set<string>();

  return resultSets
    .flat()
    .filter((result) => {
      const key = result.url.trim().toLowerCase();
      if (!key || seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    })
    .sort((left, right) => right.credibilityScore - left.credibilityScore)
    .slice(0, maxResults);
}
