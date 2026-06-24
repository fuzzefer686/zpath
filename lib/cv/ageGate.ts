// Server-only guard.
if (typeof window !== "undefined") {
  throw new Error("lib/cv/ageGate must only be imported from server-side code.");
}

/**
 * Returns true when the user has not yet reached their 16th birthday (or when
 * DOB is unknown — fail-closed for share/export operations).
 *
 * Uses cv_profiles.date_of_birth (stored as DATE, UTC midnight).
 * Called server-side only; service role bypasses RLS.
 */
export async function isUnder16(userId: string): Promise<boolean> {
  // Lazy import: keeps supabaseServer out of the module-level scope so
  // computeIsUnder16 can be imported in plain tsx tests without a DB env.
  const { supabaseServer } = await import("@/src/lib/db/supabaseServer");
  const { data } = await supabaseServer
    .from("cv_profiles")
    .select("date_of_birth")
    .eq("user_id", userId)
    .maybeSingle();

  return computeIsUnder16(data?.date_of_birth ?? null);
}

/**
 * Pure date calculation — exported for unit tests.
 * Returns true when age < 16, or when dateOfBirth is null (fail-closed).
 */
export function computeIsUnder16(dateOfBirth: string | null): boolean {
  if (!dateOfBirth) return true; // unknown DOB → block share (fail-closed)
  // Parse as LOCAL date (not UTC) — bare "YYYY-MM-DD" strings from the DB are
  // calendar dates without timezone; new Date("YYYY-MM-DD") treats them as UTC
  // midnight which shifts the day in UTC+ timezones.
  const parts = dateOfBirth.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return true;
  const [y, m, d] = parts as [number, number, number];
  const dob = new Date(y, m - 1, d);
  if (isNaN(dob.getTime())) return true;
  const now = new Date();
  const age =
    now.getFullYear() -
    dob.getFullYear() -
    (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  return age < 16;
}
