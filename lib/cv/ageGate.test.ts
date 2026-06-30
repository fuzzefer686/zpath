/**
 * T20 age-gate boundary tests.
 * Run: npx tsx --tsconfig tsconfig.json lib/cv/ageGate.test.ts
 *
 * Only tests computeIsUnder16() (pure function, no DB needed).
 * isUnder16() (DB path) is verified architecturally — it calls computeIsUnder16
 * with date_of_birth from cv_profiles and is guarded before any share operation.
 */
import assert from "node:assert";
import { computeIsUnder16 } from "./ageGate";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: unknown) {
    console.log(`✗ ${name}\n   ${(e as Error)?.message ?? e}`);
    failed++;
  }
}

// Helper: ISO date string for age exactly N years ago today (local date, no UTC shift).
function dobForAge(years: number, offsetDays = 0): string {
  const now = new Date();
  // Construct entirely in local-time arithmetic to avoid .toISOString() UTC shift.
  const result = new Date(now.getFullYear() - years, now.getMonth(), now.getDate() + offsetDays);
  const yyyy = result.getFullYear();
  const mm = String(result.getMonth() + 1).padStart(2, "0");
  const dd = String(result.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// -------------------------------------------------------------------------
// Null / invalid DOB — fail-closed (block share)
// -------------------------------------------------------------------------
test("1 null DOB → under-16 (fail-closed)", () => {
  assert.strictEqual(computeIsUnder16(null), true);
});

test("2 empty string DOB → under-16 (fail-closed)", () => {
  assert.strictEqual(computeIsUnder16(""), true);
});

test("3 invalid date string → under-16 (fail-closed)", () => {
  assert.strictEqual(computeIsUnder16("not-a-date"), true);
});

// -------------------------------------------------------------------------
// Boundary: exactly 16 today — should be allowed
// -------------------------------------------------------------------------
test("4 DOB exactly 16 years ago today → NOT under-16", () => {
  assert.strictEqual(computeIsUnder16(dobForAge(16, 0)), false);
});

// -------------------------------------------------------------------------
// Boundary: one day before 16th birthday — still blocked
// -------------------------------------------------------------------------
test("5 DOB 16 years ago + 1 day (birthday tomorrow) → under-16", () => {
  // offsetDays = +1 means DOB is 1 day in the future relative to exactly-16,
  // i.e. the person's 16th birthday is tomorrow → still 15.
  assert.strictEqual(computeIsUnder16(dobForAge(16, +1)), true);
});

// -------------------------------------------------------------------------
// Clearly under 16
// -------------------------------------------------------------------------
test("6 15-year-old → under-16", () => {
  assert.strictEqual(computeIsUnder16(dobForAge(15)), true);
});

test("7 10-year-old → under-16", () => {
  assert.strictEqual(computeIsUnder16(dobForAge(10)), true);
});

// -------------------------------------------------------------------------
// Clearly above 16
// -------------------------------------------------------------------------
test("8 17-year-old → NOT under-16", () => {
  assert.strictEqual(computeIsUnder16(dobForAge(17)), false);
});

test("9 18-year-old → NOT under-16", () => {
  assert.strictEqual(computeIsUnder16(dobForAge(18)), false);
});

test("10 25-year-old → NOT under-16", () => {
  assert.strictEqual(computeIsUnder16(dobForAge(25)), false);
});

// -------------------------------------------------------------------------
// Leap-year corner: Feb 29 DOB
// -------------------------------------------------------------------------
test("11 Feb 29 DOB (leap year) → treated as valid, 20-year-old is NOT under-16", () => {
  // Pick a known leap-year birthday: 2004-02-29
  assert.strictEqual(computeIsUnder16("2004-02-29"), false);
});

// -------------------------------------------------------------------------

console.log(
  failed === 0
    ? `\n=== ALL ${passed} AGE-GATE TESTS PASSED ===`
    : `\n=== ${failed} FAILED, ${passed} PASSED ===`,
);
process.exit(failed === 0 ? 0 : 1);
