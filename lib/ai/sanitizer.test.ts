/**
 * T13 sanitizer tests. Run: `npx tsx lib/ai/sanitizer.test.ts`
 * (No test framework in this repo — self-running with node:assert.)
 */
import assert from "node:assert";
import { sanitizeForAI, type FullProfile } from "./sanitizer";

// Local fold mirroring the sanitizer's internal normalization (for assertions).
const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`✗ ${name}\n   ${e?.message ?? e}`);
    failed++;
  }
}

const NAME = "Nguyễn Văn An";
const SCHOOL = "THPT Chuyên Hà Nội - Amsterdam";
const ORG = "CLB Tin học FPT";

function baseProfile(over: Partial<FullProfile> = {}): FullProfile {
  return {
    fullName: NAME,
    dateOfBirth: "2008-05-01",
    phone: "0901234567",
    email: "an.nguyen@gmail.com",
    address: "123 Lê Lợi, Quận 1, TP.HCM",
    avatarUrl: "https://cdn.example.com/avatars/an.png",
    targetMajorCode: "7480201",
    targetCareer: "Kỹ sư phần mềm",
    objective: "Em tên Nguyễn Văn An, muốn theo ngành CNTT.",
    headline: "Học sinh lớp 12",
    education: [
      { level: "THPT", gpa: 9.2, grade10: 8.8, grade11: 9.0, grade12: 9.5, subjects: { Toán: 9.5, Lý: 9.0 }, schoolName: SCHOOL },
    ],
    skills: [{ name: "Python", category: "technical", proficiency: 4 }],
    certificates: [{ certTypeCode: "IELTS_ACADEMIC", score: "7.5", evidenceUrl: "an/ielts.pdf" }],
    awards: [{ title: "Giải Nhì HSG Tin", level: "province", rank: "Nhì", year: 2025, issuer: "Nguyễn Văn An" }],
    experiences: [],
    activities: [
      { type: "volunteer", role: "Trưởng nhóm", hours: 40, title: "Dạy lập trình", description: "Liên hệ 0901234567 hoặc an.nguyen@gmail.com", organization: ORG },
    ],
    ...over,
  };
}

// 1. PII-leak: hard PII absent; school/org become placeholders.
test("1 PII-leak: no name/dob/phone/email/address in payload", () => {
  const { payload } = sanitizeForAI(baseProfile(), "enrich_summary", { isUnder16: false });
  const json = JSON.stringify(payload);
  for (const pii of [NAME, "2008-05-01", "0901234567", "an.nguyen@gmail.com", "123 Lê Lợi", "cdn.example.com", SCHOOL, ORG, "an/ielts.pdf"]) {
    assert.ok(!json.includes(pii), `payload leaked: "${pii}"`);
  }
  // organization is sent as a placeholder token, not the real name.
  assert.ok(json.includes("[ORG_1]"), "expected [ORG_1] placeholder for organization");
});

// 2. Round-trip: model output placeholders restore to real values.
test("2 round-trip: restore() re-injects real name + school", () => {
  const { restore } = sanitizeForAI(baseProfile(), "enrich_summary", { isUnder16: false });
  const out = restore("Tôi là [STUDENT] học tại [SCHOOL_1], sinh hoạt ở [ORG_1].");
  assert.ok(out.includes(NAME), "name not restored");
  assert.ok(out.includes(SCHOOL), "school not restored");
  assert.ok(out.includes(ORG), "org not restored");
  assert.ok(!out.includes("[STUDENT]") && !out.includes("[SCHOOL_1]"), "tokens remained");
});

// 3. Scrub: phone/email inside free text are redacted.
test("3 scrub: phone/email removed from activity description", () => {
  const { payload } = sanitizeForAI(baseProfile(), "enrich_summary", { isUnder16: false });
  const acts = (payload as any).activities;
  const desc = acts[0].description as string;
  assert.ok(!desc.includes("0901234567"), "phone survived");
  assert.ok(!desc.includes("an.nguyen@gmail.com"), "email survived");
  assert.ok(desc.includes("[REDACTED]"), "expected [REDACTED] marker");
});

// 4. <16: no free text, no age band, minimal payload.
test("4 under-16: payload has no free text and no ageBand", () => {
  const { payload, skipAiRecommended } = sanitizeForAI(baseProfile(), "enrich_summary", { isUnder16: true });
  const json = JSON.stringify(payload);
  assert.ok(skipAiRecommended === true, "skipAiRecommended should be true for <16");
  assert.ok(!("objective" in payload) && !("activities" in payload) && !("awards" in payload), "free-text blocks present");
  assert.ok(!json.toLowerCase().includes("ageband") && !json.includes("2008"), "age info leaked");
  assert.deepStrictEqual((payload as any).certificateTypes, ["IELTS_ACADEMIC"]);
  assert.deepStrictEqual((payload as any).skills, [{ name: "Python", level: 4 }]);
});

// 5. Log guard: only the sanitized payload is logged; no PII in it.
test("5 log guard: logger receives sanitized payload, no PII", () => {
  const logged: unknown[] = [];
  sanitizeForAI(baseProfile(), "enrich_summary", { isUnder16: false, logger: (_e, d) => logged.push(d) });
  assert.ok(logged.length === 1, "logger should be called once");
  const json = JSON.stringify(logged[0]);
  for (const pii of [NAME, "0901234567", "an.nguyen@gmail.com", SCHOOL, ORG]) {
    assert.ok(!json.includes(pii), `log leaked: "${pii}"`);
  }
});

// 6. Adversarial: a name typed INTO free text is masked, not leaked.
test("6 adversarial: name embedded in objective is masked to [STUDENT]", () => {
  const { payload } = sanitizeForAI(baseProfile(), "enrich_summary", { isUnder16: false });
  const obj = (payload as any).objective as string;
  assert.ok(!obj.includes(NAME), "name leaked through objective free text");
  assert.ok(obj.includes("[STUDENT]"), "name should be replaced by [STUDENT]");
});

// 7. Adversarial: same org across entries dedupes to one placeholder.
test("7 adversarial: repeated organization reuses the same token", () => {
  const p = baseProfile({
    activities: [
      { type: "volunteer", role: "A", hours: 10, title: "x", description: "", organization: ORG },
      { type: "project", role: "B", hours: 20, title: "y", description: "", organization: ORG },
    ],
  });
  const { payload } = sanitizeForAI(p, "enrich_summary", { isUnder16: false });
  const acts = (payload as any).activities;
  assert.strictEqual(acts[0].organization, acts[1].organization, "same org must share token");
  assert.strictEqual(acts[0].organization, "[ORG_1]");
});

// 8. Adversarial: restore must not let [SCHOOL_1] eat [SCHOOL_10].
test("8 adversarial: token restore has no prefix collision", () => {
  const schools = Array.from({ length: 10 }, (_, i) => ({
    level: "THPT", gpa: null, grade10: null, grade11: null, grade12: null,
    subjects: null, schoolName: `Trường số ${i + 1}`,
  }));
  const { restore } = sanitizeForAI(baseProfile({ education: schools }), "suggest_career_direction", { isUnder16: false });
  const out = restore("[SCHOOL_10] và [SCHOOL_1]");
  assert.ok(out.includes("Trường số 10"), "SCHOOL_10 not restored");
  assert.ok(/(^|\s)Trường số 1( |$)/.test(out.replace("Trường số 10", "")), "SCHOOL_1 mis-restored");
  assert.ok(!out.includes("[SCHOOL_"), "tokens remained after restore");
});

// 9. Audit fix: phones with separators / international forms are scrubbed.
test("9 phone formats with separators and international are scrubbed", () => {
  const p = baseProfile({
    activities: [{ type: "volunteer", role: "x", hours: 1, title: "t",
      description: "Gọi 090 123 4567, 090.123.4567, +33612345678, 84912345678", organization: ORG }],
  });
  const { payload } = sanitizeForAI(p, "enrich_summary", { isUnder16: false });
  const desc = (payload as any).activities[0].description as string;
  for (const n of ["090 123 4567", "090.123.4567", "+33612345678", "84912345678"]) {
    assert.ok(!desc.includes(n), `phone leaked: ${n}`);
  }
});

// 10. Audit fix: schemeless URLs / shorteners / socials are scrubbed.
test("10 schemeless URLs and shorteners are scrubbed", () => {
  const p = baseProfile({
    objective: "Hồ sơ: www.linkedin.com/in/me, bit.ly/abc, fb.com/john.doe",
  });
  const { payload } = sanitizeForAI(p, "enrich_summary", { isUnder16: false });
  const obj = (payload as any).objective as string;
  for (const u of ["linkedin.com", "bit.ly", "fb.com"]) {
    assert.ok(!obj.includes(u), `URL leaked: ${u}`);
  }
});

// 11. Audit fix: structured string fields are scrubbed (cert.score, award.rank, skill.name, subjects key).
test("11 structured fields are scrubbed, not passed raw", () => {
  const p = baseProfile({
    certificates: [{ certTypeCode: "IELTS_ACADEMIC", score: "7.5 — examiner 0901234567" }],
    awards: [{ title: "Giải", level: "national", rank: "Nhất, liên hệ a@b.com", year: 2025, issuer: null }],
    skills: [{ name: "Python, gọi 0987654321", category: "technical", proficiency: 4 }],
    education: [{ level: "THPT", gpa: 9, grade10: null, grade11: null, grade12: null,
      subjects: { "Toán": 9.5, "Liên hệ 0901234567": 8 }, schoolName: SCHOOL }],
  });
  const { payload } = sanitizeForAI(p, "enrich_summary", { isUnder16: false });
  const json = JSON.stringify(payload);
  for (const leak of ["0901234567", "a@b.com", "0987654321"]) {
    assert.ok(!json.includes(leak), `structured field leaked: ${leak}`);
  }
  // the name-bearing subject key is dropped; the clean subject survives.
  const subj = (payload as any).education[0].subjects;
  assert.ok(subj["Toán"] === 9.5, "clean subject key dropped");
  assert.ok(!Object.keys(subj).some((k) => k.includes("0901234567")), "dirty subject key kept");
});

// 12. Audit fix: school == org string gets distinct tokens; restore round-trips both.
test("12 school/org name collision yields distinct tokens", () => {
  const p = baseProfile({
    education: [{ level: "THPT", gpa: null, grade10: null, grade11: null, grade12: null, subjects: null, schoolName: "FPT" }],
    activities: [{ type: "project", role: "dev", hours: 10, title: "x", description: "y", organization: "FPT" }],
  });
  const { payload, restore } = sanitizeForAI(p, "enrich_summary", { isUnder16: false });
  const org = (payload as any).activities[0].organization as string;
  assert.ok(org.startsWith("[ORG_"), `org should be an ORG token, got ${org}`);
  assert.strictEqual(restore(org), "FPT", "org token must restore to FPT");
});

// 13. Audit fix: diacritic-insensitive masking — name typed without diacritics is masked.
test("13 diacritic-insensitive masking of school name", () => {
  const p = baseProfile({
    objective: "Em học ở truong thpt chuyen ha noi - amsterdam, rất tự hào.",
    education: [{ level: "THPT", gpa: null, grade10: null, grade11: null, grade12: null, subjects: null, schoolName: SCHOOL }],
  });
  const { payload } = sanitizeForAI(p, "enrich_summary", { isUnder16: false });
  const obj = (payload as any).objective as string;
  assert.ok(!fold(obj).includes(fold(SCHOOL)), "de-accented school name leaked");
});

// 14. Audit fix: honorific-triggered third-party name → [PERSON].
test("14 honorific + third-party name is redacted to [PERSON]", () => {
  const p = baseProfile({
    activities: [{ type: "project", role: "thành viên", hours: 20, title: "Nghiên cứu",
      description: "Được thầy Trần Văn Bình hướng dẫn", organization: ORG }],
  });
  const { payload } = sanitizeForAI(p, "enrich_summary", { isUnder16: false });
  const desc = (payload as any).activities[0].description as string;
  assert.ok(!desc.includes("Trần Văn Bình"), "third-party name leaked");
  assert.ok(desc.includes("[PERSON]"), "expected [PERSON] marker");
});

// 15. Audit fix: DOB written in prose is redacted.
test("15 date of birth in prose is redacted", () => {
  const p = baseProfile({ objective: "Em sinh ngày 1/5/2008, học lớp 12." });
  const { payload } = sanitizeForAI(p, "enrich_summary", { isUnder16: false });
  assert.ok(!(payload as any).objective.includes("1/5/2008"), "prose DOB leaked");
});

// 16. Under-16 skill name is scrubbed too (strictest path).
test("16 under-16 path scrubs skill names", () => {
  const p = baseProfile({ skills: [{ name: "Mentoring, gọi 0901234567", category: "soft", proficiency: 3 }] });
  const { payload } = sanitizeForAI(p, "suggest_skills", { isUnder16: true });
  assert.ok(!JSON.stringify(payload).includes("0901234567"), "under-16 skill leaked phone");
});

console.log(failed === 0 ? `\n=== ALL ${passed} SANITIZER TESTS PASSED ===` : `\n=== ${failed} FAILED, ${passed} PASSED ===`);
process.exit(failed === 0 ? 0 : 1);
