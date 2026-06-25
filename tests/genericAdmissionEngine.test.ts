import assert from "node:assert/strict";

import {
  interpretAdmission,
  validateAdmissionConfig,
  validateGenericPayload,
  convertScale,
  convertCertificate,
  type GenericAdmissionConfig,
} from "@/src/lib/admission-engine/generic";

// ---------------------------------------------------------------------------
// Sample config: a fictional school with a THPT-style weighted method (scale 30,
// IELTS certificate conversion + priority points) and a TSA-style 100-scale
// method. Exercises every primitive.
// ---------------------------------------------------------------------------
const SAMPLE_CONFIG: GenericAdmissionConfig = {
  schoolCode: "TEST",
  schoolName: "Trường Thử Nghiệm",
  year: 2026,
  methods: [
    {
      methodCode: "THPT",
      methodName: "Điểm thi THPT",
      inputs: [
        { key: "math", label: "Toán", type: "number", required: true, min: 0, max: 10 },
        { key: "physics", label: "Vật lý", type: "number", required: true, min: 0, max: 10 },
        {
          key: "english",
          label: "Tiếng Anh / IELTS",
          type: "certificate",
          required: true,
          certificateLevels: [
            { band: 5.5, convertedScore: 8 },
            { band: 6.5, convertedScore: 9 },
            { band: 7.5, convertedScore: 10 },
          ],
        },
        { key: "priority", label: "Điểm ưu tiên", type: "number", required: false, min: 0, max: 3 },
      ],
      formula: {
        type: "weighted_combination",
        terms: [
          { inputKey: "math", weight: 1 },
          { inputKey: "physics", weight: 1 },
          { inputKey: "english", weight: 1 },
        ],
        targetScale: 30,
      },
      priorityInputKey: "priority",
      benchmark30: 25,
    },
    {
      methodCode: "TSA",
      methodName: "Đánh giá tư duy",
      inputs: [
        { key: "tsa", label: "Điểm TSA", type: "number", required: true, min: 0, max: 100 },
      ],
      formula: { type: "scale_conversion", inputKey: "tsa", fromScale: 100 },
      benchmark30: null,
    },
  ],
};

// --- validateAdmissionConfig: a hand-built config validates ---
const validated = validateAdmissionConfig(SAMPLE_CONFIG);
assert.equal(validated.ok, true, "Sample config should be valid");

// --- happy path: weighted combination + certificate + priority ---
const thptResult = interpretAdmission({
  config: SAMPLE_CONFIG,
  methodCode: "THPT",
  payload: { math: 9, physics: 8, english: { band: 6.5 }, priority: 0.5 },
});
// 9 + 8 + 9 (IELTS 6.5 -> 9) + 0.5 priority = 26.5
assert.equal(thptResult.originalScore, 26.5, "THPT weighted score with priority");
assert.equal(thptResult.normalizedScore30, 26.5, "Scale 30 stays the same");
assert.equal(thptResult.benchmark30, 25, "Benchmark carried through");

// --- priority/bonus is capped at the original scale ---
const cappedResult = interpretAdmission({
  config: SAMPLE_CONFIG,
  methodCode: "THPT",
  payload: { math: 10, physics: 10, english: { band: 7.5 }, priority: 3 },
});
// 10 + 10 + 10 + 3 = 33 -> capped at 30
assert.equal(cappedResult.originalScore, 30, "Score is capped at scale max (30)");

// --- scale conversion (TSA 100 -> 30) ---
const tsaResult = interpretAdmission({
  config: SAMPLE_CONFIG,
  methodCode: "TSA",
  payload: { tsa: 75 },
});
assert.equal(tsaResult.originalScore, 75, "TSA original score preserved");
assert.equal(tsaResult.originalScale, 100, "TSA original scale is 100");
assert.equal(tsaResult.normalizedScore30, 22.5, "TSA 75/100 -> 22.5/30");

// --- missing required field is rejected ---
const missing = validateGenericPayload(SAMPLE_CONFIG.methods[0], {
  math: 9,
  physics: 8,
});
assert.equal(missing.ok, false, "Missing required english should fail");

// --- wrong type is rejected ---
const wrongType = validateGenericPayload(SAMPLE_CONFIG.methods[1], {
  tsa: "not-a-number",
});
assert.equal(wrongType.ok, false, "Non-numeric TSA should fail");

// --- out of range is rejected ---
const outOfRange = validateGenericPayload(SAMPLE_CONFIG.methods[0], {
  math: 99,
  physics: 8,
  english: { band: 6.5 },
});
assert.equal(outOfRange.ok, false, "Math 99 exceeds max 10");

// --- certificate below lowest band converts to 0 with a warning ---
const lowCert = interpretAdmission({
  config: SAMPLE_CONFIG,
  methodCode: "THPT",
  payload: { math: 9, physics: 8, english: { band: 4.0 } },
});
assert.equal(lowCert.details.priority, 0, "No priority provided");
assert.ok(lowCert.warnings.length >= 1, "Low certificate emits a warning");
assert.equal(lowCert.originalScore, 17, "9 + 8 + 0 (cert too low) = 17");

// --- validateAdmissionConfig surfaces errors for malformed configs ---
const invalidConfig = validateAdmissionConfig({
  schoolCode: "X",
  schoolName: "X",
  year: 2026,
  methods: [
    {
      methodCode: "M",
      methodName: "M",
      inputs: [{ key: "a", label: "A", type: "number", required: true }],
      formula: {
        type: "weighted_combination",
        terms: [{ inputKey: "missing", weight: 1 }],
        targetScale: 30,
      },
    },
  ],
});
assert.equal(invalidConfig.ok, false, "Formula referencing unknown input is invalid");

// --- primitive sanity checks ---
assert.equal(convertScale(80, 100, 30), 24, "convertScale 80/100 -> 24");
assert.equal(convertCertificate([{ band: 6, convertedScore: 9 }], 5), null, "Below band -> null");
assert.equal(convertCertificate([{ band: 6, convertedScore: 9 }], 6.5), 9, "At/above band -> score");

console.log("genericAdmissionEngine.test.ts: all assertions passed");
