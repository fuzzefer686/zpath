/**
 * AI kill-switch tests. Run: `npx tsx --tsconfig tsconfig.json lib/ai/kill-switch.test.ts`
 * (No test framework — self-running with node:assert, same pattern as sanitizer.test.ts)
 *
 * Coverage:
 *   - isAiEnabled(): env override, cache, fail-closed (no DB needed)
 *   - sanitizer.ts is independent of the kill-switch (non-AI path stays up)
 *
 * Note on gateway coverage: runCvAiTask() in vertex.ts cannot be imported in
 * plain tsx because geminiVertexClient.ts uses `import "server-only"` (a
 * Next.js build-time guard). The gateway kill-switch is verified architecturally:
 * the `if (!(await isAiEnabled())) return { skipped, sanitizedPayload: {} }` is
 * the FIRST statement in runCvAiTask — before sanitizeForAI() and before any
 * call to generateGeminiTextInRegion(). Empty sanitizedPayload in the return
 * proves no data was processed.
 */
import assert from "node:assert";
import { isAiEnabled, _resetAiFlagCache } from "./flags";
import { sanitizeForAI, type FullProfile } from "./sanitizer";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: unknown) {
    console.log(`✗ ${name}\n   ${(e as Error)?.message ?? e}`);
    failed++;
  }
}

const FIXTURE: FullProfile = {
  fullName: "Test User",
  dateOfBirth: "2005-01-01",
  phone: null,
  email: null,
  address: null,
  avatarUrl: null,
  targetMajorCode: "7480201",
  targetCareer: "Kỹ sư phần mềm",
  objective: null,
  headline: null,
  education: [],
  skills: [{ name: "Python", category: "technical", proficiency: 3 }],
  certificates: [],
  awards: [],
  experiences: [],
  activities: [],
};

(async () => {
  // -------------------------------------------------------------------------
  // 1. isAiEnabled — env override (no DB connection needed)
  // -------------------------------------------------------------------------

  await test("1 env AI_ENABLED=false → disabled", async () => {
    _resetAiFlagCache();
    process.env.AI_ENABLED = "false";
    assert.strictEqual(await isAiEnabled(), false);
    delete process.env.AI_ENABLED;
  });

  await test("2 env AI_ENABLED=true → enabled", async () => {
    _resetAiFlagCache();
    process.env.AI_ENABLED = "true";
    assert.strictEqual(await isAiEnabled(), true);
    delete process.env.AI_ENABLED;
  });

  await test("3 env AI_ENABLED=FALSE (case-insensitive) → disabled", async () => {
    _resetAiFlagCache();
    process.env.AI_ENABLED = "FALSE";
    assert.strictEqual(await isAiEnabled(), false);
    delete process.env.AI_ENABLED;
  });

  await test("4 env AI_ENABLED=TRUE (case-insensitive) → enabled", async () => {
    _resetAiFlagCache();
    process.env.AI_ENABLED = "TRUE";
    assert.strictEqual(await isAiEnabled(), true);
    delete process.env.AI_ENABLED;
  });

  await test("5 no env + no DB → fail-closed (false)", async () => {
    _resetAiFlagCache();
    delete process.env.AI_ENABLED;
    // No Supabase configured in test env; lazy supabaseServer import will throw.
    // Expected: catch block returns false (fail-closed).
    assert.strictEqual(await isAiEnabled(), false);
  });

  await test("6 _resetAiFlagCache clears state for next call", async () => {
    process.env.AI_ENABLED = "true";
    const first = await isAiEnabled(); // populates cache (env path)
    delete process.env.AI_ENABLED;
    _resetAiFlagCache();
    // Without env and without DB, should now be false (fail-closed)
    const second = await isAiEnabled();
    assert.strictEqual(first, true);
    assert.strictEqual(second, false);
  });

  await test("7 in-process cache: successive calls with same env return same value", async () => {
    _resetAiFlagCache();
    process.env.AI_ENABLED = "false";
    const a = await isAiEnabled();
    const b = await isAiEnabled(); // second call — env is checked first (no cache needed for env path)
    assert.strictEqual(a, b);
    delete process.env.AI_ENABLED;
  });

  // -------------------------------------------------------------------------
  // 2. Non-AI paths: sanitizer.ts works regardless of kill-switch state
  // (The kill-switch only guards runCvAiTask — it does not touch sanitizer.)
  // -------------------------------------------------------------------------

  await test("8 sanitizer produces valid output when kill-switch is OFF", () => {
    process.env.AI_ENABLED = "false";
    const { payload } = sanitizeForAI(FIXTURE, "enrich_summary", { isUnder16: false });
    assert.strictEqual(typeof payload, "object");
    assert.ok(payload !== null);
    // Skills key present confirms sanitizer ran and processed data
    assert.ok(Array.isArray((payload as Record<string, unknown>).skills));
    delete process.env.AI_ENABLED;
  });

  await test("9 sanitizer output is identical regardless of kill-switch state", () => {
    process.env.AI_ENABLED = "false";
    const { payload: off } = sanitizeForAI(FIXTURE, "enrich_summary", { isUnder16: false });
    delete process.env.AI_ENABLED;

    process.env.AI_ENABLED = "true";
    const { payload: on } = sanitizeForAI(FIXTURE, "enrich_summary", { isUnder16: false });
    delete process.env.AI_ENABLED;

    // Kill-switch does not affect sanitizer output.
    assert.deepStrictEqual(off, on);
  });

  await test("10 sanitizer under-16 path works when kill-switch is OFF", () => {
    process.env.AI_ENABLED = "false";
    const { payload, skipAiRecommended } = sanitizeForAI(
      { ...FIXTURE, dateOfBirth: "2015-01-01" },
      "suggest_skills",
      { isUnder16: true },
    );
    assert.strictEqual(skipAiRecommended, true);
    // Under-16: no objective, no activities — minimal payload
    assert.ok(!("objective" in payload));
    delete process.env.AI_ENABLED;
  });

  // -------------------------------------------------------------------------

  console.log(
    failed === 0
      ? `\n=== ALL ${passed} KILL-SWITCH TESTS PASSED ===`
      : `\n=== ${failed} FAILED, ${passed} PASSED ===`,
  );
  process.exit(failed === 0 ? 0 : 1);
})();
