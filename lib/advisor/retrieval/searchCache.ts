import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { fetchWithSupabaseTimeout } from "@/lib/supabase-fetch";
import type {
  WebSearchProvider,
  WebSearchResult,
} from "@/lib/advisor/retrieval/webSearch";

export type SearchCacheTtlKind =
  | "latest_admission"
  | "current_official"
  | "general";

type SearchCacheRow = {
  results: unknown;
  expires_at: string;
};

let cachedClient: SupabaseClient | null = null;

function getSearchCacheClient() {
  if (cachedClient) return cachedClient;

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithSupabaseTimeout,
    },
  });

  return cachedClient;
}

export function normalizeAdvisorSearchQuery(query: string) {
  return query
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\b(em|mình|minh|tôi|toi|con|cháu|chau)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export function canCacheAdvisorSearchQuery(query: string) {
  const normalizedQuery = normalizeAdvisorSearchQuery(query);

  if (!normalizedQuery) return false;

  return !/\b(em thich|em gioi|em khong thich|so thich cua em|diem manh cua em|phu hop voi em|hop voi em)\b/i.test(
    normalizedQuery,
  );
}

export function getAdvisorSearchCacheTtlMs(kind: SearchCacheTtlKind) {
  if (kind === "latest_admission") return 6 * 60 * 60 * 1000;
  if (kind === "current_official") return 24 * 60 * 60 * 1000;
  return 7 * 24 * 60 * 60 * 1000;
}

function isWebSearchResult(value: unknown): value is WebSearchResult {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.title === "string" &&
    typeof record.url === "string" &&
    typeof record.accessedAt === "string" &&
    typeof record.credibilityScore === "number" &&
    (record.sourceType === "official_school_site" ||
      record.sourceType === "government_site" ||
      record.sourceType === "news" ||
      record.sourceType === "other")
  );
}

function parseCachedResults(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(isWebSearchResult);
}

export async function getCachedAdvisorSearchResults({
  normalizedQuery,
  provider,
}: {
  normalizedQuery: string;
  provider: WebSearchProvider;
}) {
  const client = getSearchCacheClient();
  if (!client || !normalizedQuery || provider === "none") return null;

  const { data, error } = await client
    .from("advisor_search_cache")
    .select("results, expires_at")
    .eq("normalized_query", normalizedQuery)
    .eq("provider", provider)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  const row = data as SearchCacheRow;
  const results = parseCachedResults(row.results);
  return results.length ? results : null;
}

export async function setCachedAdvisorSearchResults({
  normalizedQuery,
  provider,
  results,
  ttlKind,
}: {
  normalizedQuery: string;
  provider: WebSearchProvider;
  results: WebSearchResult[];
  ttlKind: SearchCacheTtlKind;
}) {
  const client = getSearchCacheClient();
  if (!client || !normalizedQuery || provider === "none" || !results.length) {
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + getAdvisorSearchCacheTtlMs(ttlKind));

  const { error } = await client
    .from("advisor_search_cache")
    .upsert(
      {
        query: normalizedQuery,
        normalized_query: normalizedQuery,
        provider,
        results,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: "provider,normalized_query",
      },
    );

  if (error) {
    console.warn("Advisor search cache write failed:", error.message);
  }
}

export function inferAdvisorSearchCacheTtlKind(query: string): SearchCacheTtlKind {
  const normalizedQuery = normalizeAdvisorSearchQuery(query);

  if (
    /\b(tuyen sinh|thong tin tuyen sinh|de an tuyen sinh|diem chuan moi nhat|moi nhat|nam nay|2026)\b/i.test(
      normalizedQuery,
    )
  ) {
    return "latest_admission";
  }

  if (
    /\b(hoc phi|diem chuan|chinh thuc|current|official|hien nay)\b/i.test(
      normalizedQuery,
    )
  ) {
    return "current_official";
  }

  return "general";
}
