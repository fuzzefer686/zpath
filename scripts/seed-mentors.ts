/**
 * Seed two test mentors (one lead_mentor, one regular mentor) into
 * public.zpath_users + public.mentor_profiles.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY because the mentor tables are RLS
 * service-role-only. Run with: `npx tsx scripts/seed-mentors.ts`
 *
 * Idempotent: re-running upserts the same fixed UUIDs.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const scryptAsync = promisify(scrypt);

// Mirrors lib/zpath-auth.ts hashPassword() so seeded mentors can log in.
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("base64url")}`;
}

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

// Fixed UUIDs so the seed is idempotent and easy to reference in tests.
const MENTORS = [
  {
    id: "00000000-0000-0000-0000-0000000000a1",
    username: "mentor_lead",
    email: "mentor_lead@mentor.zpath.test",
    phone: "0900000001",
    password: "Mentor@12345",
    display_name: "Lead Mentor (Test)",
    role: "lead_mentor" as const,
    show_identity_default: true,
    bio: "Test lead mentor seeded for local development.",
  },
  {
    id: "00000000-0000-0000-0000-0000000000a2",
    username: "mentor_one",
    email: "mentor_one@mentor.zpath.test",
    phone: "0900000002",
    password: "Mentor@12345",
    display_name: "Mentor One (Test)",
    role: "mentor" as const,
    show_identity_default: false,
    bio: "Test mentor seeded for local development.",
  },
];

async function seed() {
  for (const m of MENTORS) {
    const passwordHash = await hashPassword(m.password);

    const { error: userError } = await supabase.from("zpath_users").upsert(
      {
        id: m.id,
        username: m.username,
        email: m.email, // Required: verifyAuthToken() rejects tokens without an email.
        phone: m.phone,
        password_hash: passwordHash,
        role: "user", // App-level account role; mentor capability lives in mentor_profiles.
        auth_provider: "password",
      },
      { onConflict: "id" },
    );
    if (userError) {
      console.error(`Failed to upsert zpath_users for ${m.username}:`, userError);
      continue;
    }

    const { error: profileError } = await supabase.from("mentor_profiles").upsert(
      {
        user_id: m.id,
        display_name: m.display_name,
        role: m.role,
        show_identity_default: m.show_identity_default,
        is_active: true,
        bio: m.bio,
      },
      { onConflict: "user_id" },
    );
    if (profileError) {
      console.error(`Failed to upsert mentor_profiles for ${m.username}:`, profileError);
      continue;
    }

    console.log(`Seeded mentor ${m.username} (${m.role}) — password: ${m.password}`);
  }

  console.log("Mentor seed complete.");
}

seed();
