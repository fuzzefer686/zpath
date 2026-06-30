// Server-only guard.
if (typeof window !== "undefined") {
  throw new Error("lib/ai/flags must only be imported from server-side code.");
}

// In-memory cache: avoids a DB round-trip on every AI request within the
// same Node.js process instance (Vercel serverless / EC2 worker).
let _cache: { enabled: boolean; expiresAt: number } | null = null;
const CACHE_TTL_MS = 45_000; // 45 s — short enough to reflect DB changes promptly

/**
 * Returns true if the Vertex AI feature is currently enabled.
 *
 * Resolution order:
 *   1. AI_ENABLED env var — instant override, no DB call (set on Vercel for
 *      immediate effect without waiting for cache to expire).
 *      AI_ENABLED=true  → always enabled
 *      AI_ENABLED=false → always disabled
 *   2. system_flags row key='ai_enabled' in DB (cached 45 s in-process)
 *   3. Default false — fail-closed when the DB is unreachable.
 */
export async function isAiEnabled(): Promise<boolean> {
  const envOverride = process.env.AI_ENABLED?.trim().toLowerCase();
  if (envOverride === "true") return true;
  if (envOverride === "false") return false;

  const now = Date.now();
  if (_cache && now < _cache.expiresAt) return _cache.enabled;

  try {
    // Lazy import: supabaseServer is only loaded when no env override is set.
    const { supabaseServer } = await import("@/src/lib/db/supabaseServer");
    const { data } = await supabaseServer
      .from("system_flags")
      .select("enabled")
      .eq("key", "ai_enabled")
      .maybeSingle();

    const enabled = data?.enabled ?? false;
    _cache = { enabled, expiresAt: now + CACHE_TTL_MS };
    return enabled;
  } catch {
    // Fail-closed: DB unreachable → AI stays off.
    return false;
  }
}

/** Reset the in-process cache. Exported for tests only. */
export function _resetAiFlagCache(): void {
  _cache = null;
}
