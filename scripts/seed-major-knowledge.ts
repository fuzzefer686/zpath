/**
 * Seed major profile knowledge from /knowledge JSON files into public.major_profiles.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY — the table is RLS-locked for writes.
 * Run with: `npx tsx scripts/seed-major-knowledge.ts`
 *
 * Idempotent: uses upsert on major_id. Re-running updates existing rows.
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Env helpers (mirrors seed-mentors.ts pattern)
// ---------------------------------------------------------------------------

function readEnv(key: string): string {
  if (process.env[key]) return process.env[key]!;
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
    if (match) return match[1].trim();
  }
  return "";
}

const supabaseUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (env or .env.local).",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// File reader
// ---------------------------------------------------------------------------

function collectJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
  });
}

interface RawProfile {
  majorId: string;
  canonicalName: string;
  category: string;
  status?: string;
  scope?: string;
  version?: number;
  aliases?: string[];
  tags?: string[];
  searchKeywords?: string[];
  lastUpdated?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  const knowledgeRoot = path.resolve(process.cwd(), "knowledge");
  const files = collectJsonFiles(knowledgeRoot);

  if (!files.length) {
    console.error(`No JSON files found in ${knowledgeRoot}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} knowledge files. Upserting…\n`);

  let upserted = 0;
  let failed = 0;

  for (const filePath of files) {
    let raw: RawProfile;
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
      // Support both plain object and single-element array formats
      raw = Array.isArray(parsed) ? (parsed[0] as RawProfile) : (parsed as RawProfile);
    } catch (err) {
      console.warn(`  SKIP (parse error) ${path.relative(process.cwd(), filePath)}:`, err);
      failed++;
      continue;
    }

    if (!raw?.majorId || !raw?.canonicalName || !raw?.category) {
      console.warn(`  SKIP (missing required fields) ${path.relative(process.cwd(), filePath)}`);
      failed++;
      continue;
    }

    const row = {
      major_id: raw.majorId,
      canonical_name: raw.canonicalName,
      category: raw.category,
      status: raw.status ?? "approved",
      scope: raw.scope ?? "country_specific",
      version: raw.version ?? 1,
      aliases: raw.aliases ?? [],
      tags: raw.tags ?? [],
      search_keywords: raw.searchKeywords ?? [],
      profile_data: raw,
      last_updated: raw.lastUpdated ? new Date(raw.lastUpdated).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase
      .from("major_profiles")
      .upsert(row, { onConflict: "major_id" });

    if (error) {
      console.error(`  FAIL  ${raw.majorId} (${raw.canonicalName}):`, error.message);
      failed++;
    } else {
      console.log(`  OK    ${raw.majorId} — ${raw.canonicalName} [${raw.category}]`);
      upserted++;
    }
  }

  console.log(`\nDone. ${upserted} upserted, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

seed();
