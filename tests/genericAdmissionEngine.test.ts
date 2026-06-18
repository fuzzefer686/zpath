import assert from "node:assert/strict";

import {
  compareScoreWithCutoff,
  interpretAdmission,
  migrateAdmissionConfig,
  validateAdmissionConfig,
  validateGenericPayload,
  convertScale,
  convertCertificate,
  applyMaxOfInputs,
  applyWeightedCombination,
  evaluateGenericEligibility,
  type GenericAdmissionConfig,
} from "@/src/lib/admission-engine/generic";

const SAMPLE_CONFIG: GenericAdmissionConfig = {
  schoolCode: "TEST",
  schoolName: "Trường Thử Nghiệm",
  year: 2026,
  schemaVersion: 2,
  programSource: "db",
  benchmarkSource: "method_default",
  methods: [
    {
      methodCode: "THPT",
      methodName: "Điểm thi THPT",
      description: "Xét điểm tổ hợp THPT quy đổi về thang 30.",
      note: "Yêu cầu thí sinh đối chiếu thông báo chính thức trước khi nộp hồ sơ.",
      requirements: ["Toán >= 5.0", "IELTS >= 5.5 hoặc điểm tiếng Anh tương đương"],
      sources: [
        {
          url: "https://example.edu.vn/de-an",
          label: "Đề án tuyển sinh",
          excerpt: "Mục 2.1 quy định điều kiện ngưỡng đầu vào.",
        },
      ],
      uiTemplate: "thpt_combination",
      programInputKey: "programCode",
      combinationInputKey: "combinationCode",
      inputs: [
        { key: "math", label: "Toán", type: "number", required: true, min: 0, max: 10 },
        { key: "physics", label: "Vật lý", type: "number", required: true, min: 0, max: 10 },
        { key: "chemistry", label: "Hóa học", type: "number", required: true, min: 0, max: 10 },
        {
          key: "subjects",
          label: "Điểm môn",
          type: "subject_group",
          required: true,
          combinations: [
            {
              code: "A00",
              label: "A00",
              subjects: [
                { key: "math", label: "Toán", required: true, type: "number", weight: 2 },
                { key: "physics", label: "Lý", required: true, type: "number" },
                { key: "chemistry", label: "Hóa", required: true, type: "number" },
              ],
            },
          ],
        },
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
      combinations: [
        {
          code: "A00",
          label: "A00",
          subjects: [
            { key: "math", label: "Toán", required: true, type: "number", weight: 2 },
            { key: "physics", label: "Lý", required: true, type: "number" },
            { key: "chemistry", label: "Hóa", required: true, type: "number" },
          ],
        },
        {
          code: "K01",
          label: "K01",
          subjects: [
            { key: "math", label: "Toán", required: true, type: "number" },
            { key: "literature", label: "Văn", required: true, type: "number" },
            { key: "physics", label: "Lý", required: false, type: "number" },
            { key: "chemistry", label: "Hóa", required: false, type: "number" },
          ],
        },
      ],
      formula: {
        type: "weighted_combination",
        terms: [
          { inputKey: "math", weight: 2 },
          { inputKey: "physics", weight: 1 },
          { inputKey: "chemistry", weight: 1 },
        ],
        targetScale: 30,
      },
      priorityInputKey: "priority",
      benchmark30: 25,
      eligibilityRules: [
        {
          type: "min_score",
          inputKey: "math",
          min: 5,
          message: "Toán phải >= 5",
        },
      ],
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
    {
      methodCode: "CERT_A",
      methodName: "Xét chứng chỉ - bảng A",
      inputs: [
        {
          key: "ielts",
          label: "IELTS",
          type: "certificate",
          required: true,
          certificateLevels: [
            { band: 5.5, convertedScore: 7.5 },
            { band: 6.5, convertedScore: 8.5 },
            { band: 7.5, convertedScore: 9.5 },
          ],
        },
      ],
      formula: {
        type: "weighted_combination",
        terms: [{ inputKey: "ielts", weight: 3 }],
        targetScale: 30,
      },
      benchmark30: null,
    },
    {
      methodCode: "CERT_B",
      methodName: "Xét chứng chỉ - bảng B",
      inputs: [
        {
          key: "ielts",
          label: "IELTS",
          type: "certificate",
          required: true,
          certificateLevels: [
            { band: 5.5, convertedScore: 6.5 },
            { band: 6.5, convertedScore: 7.5 },
            { band: 7.5, convertedScore: 8.5 },
          ],
        },
      ],
      formula: {
        type: "weighted_combination",
        terms: [{ inputKey: "ielts", weight: 3 }],
        targetScale: 30,
      },
      benchmark30: null,
    },
  ],
};

const validated = validateAdmissionConfig(SAMPLE_CONFIG);
assert.equal(validated.ok, true, "Sample config should be valid");
if (validated.ok) {
  assert.deepEqual(validated.config.methods[0]?.requirements, [
    "Toán >= 5.0",
    "IELTS >= 5.5 hoặc điểm tiếng Anh tương đương",
  ]);
  assert.equal(validated.config.methods[0]?.sources?.[0]?.url, "https://example.edu.vn/de-an");
}

const thptResult = interpretAdmission({
  config: SAMPLE_CONFIG,
  methodCode: "THPT",
  payload: {
    programCode: "IT001",
    combinationCode: "A00",
    math: 9,
    physics: 8,
    chemistry: 7,
    english: { band: 6.5 },
    priority: 0.5,
    subjects: { math: 9, physics: 8, chemistry: 7 },
  },
});
assert.equal(thptResult.originalScore, 30, "THPT weighted score capped at target scale");
assert.equal(thptResult.normalizedScore30, 30, "Scale 30 capped");
assert.equal(thptResult.benchmark30, 25, "Benchmark carried through");
assert.equal(thptResult.eligible, true, "Should be eligible");

const k01MaxTerm = applyWeightedCombination(
  [{ inputKey: "science", weight: 1, maxOfInputKeys: ["physics", "chemistry"] }],
  new Map([
    ["physics", 7],
    ["chemistry", 9],
  ]),
);
assert.equal(k01MaxTerm.score, 9, "maxOfInputKeys uses max value");

assert.equal(
  applyMaxOfInputs(["physics", "chemistry"], new Map([["physics", 7], ["chemistry", 9]])),
  9,
);

const comparison = compareScoreWithCutoff({
  schoolCode: "TEST",
  year: 2026,
  programCode: "IT001",
  method: "THPT",
  score: 26,
  previousYearCutoff: 25,
});
assert.equal(comparison.status, "above");
assert.equal(comparison.difference, 1);

const migrated = migrateAdmissionConfig({
  ...SAMPLE_CONFIG,
  schemaVersion: 1,
  methods: SAMPLE_CONFIG.methods.map((m) => ({ ...m, uiTemplate: undefined })),
});
assert.equal(migrated.schemaVersion, 2);
assert.equal(migrated.methods[0]?.uiTemplate, "flat");

const eligibility = evaluateGenericEligibility(SAMPLE_CONFIG.methods[0]!, {
  math: 4,
});
assert.equal(eligibility.eligible, false, "Missing required fields when partial payload");
assert.ok(eligibility.warnings.length >= 1, "min_score rule adds warning");

const payloadValidation = validateGenericPayload(SAMPLE_CONFIG.methods[0]!, {
  math: 9,
  physics: 8,
  chemistry: 7,
  english: { band: 7.5 },
  subjects: { math: 9, physics: 8, chemistry: 7 },
});
assert.equal(payloadValidation.ok, true);

assert.equal(convertScale(15, 30, 30), 15);
assert.equal(convertCertificate([{ band: 6.5, convertedScore: 9 }], 7), 9);

const certAResult = interpretAdmission({
  config: SAMPLE_CONFIG,
  methodCode: "CERT_A",
  payload: { ielts: { band: 6.5 } },
});
const certBResult = interpretAdmission({
  config: SAMPLE_CONFIG,
  methodCode: "CERT_B",
  payload: { ielts: { band: 6.5 } },
});
assert.equal(certAResult.normalizedScore30, 25.5, "CERT_A uses method-specific IELTS table");
assert.equal(certBResult.normalizedScore30, 22.5, "CERT_B uses different IELTS table");
assert.notEqual(
  certAResult.normalizedScore30,
  certBResult.normalizedScore30,
  "Different methods should support different IELTS conversion rules",
);

const malformedMethod = {
  ...(SAMPLE_CONFIG.methods[0] as unknown as Record<string, unknown>),
  requirements: ["  ", "Giữ bản gốc học bạ"],
  sources: [{}, { label: "Thông báo phụ" }, "invalid"],
};
const malformedMeta = validateAdmissionConfig({
  ...SAMPLE_CONFIG,
  methods: [malformedMethod, SAMPLE_CONFIG.methods[1] as unknown],
});
assert.equal(malformedMeta.ok, true, "Invalid metadata entries should be sanitized");
if (malformedMeta.ok) {
  assert.deepEqual(malformedMeta.config.methods[0]?.requirements, ["Giữ bản gốc học bạ"]);
  assert.deepEqual(malformedMeta.config.methods[0]?.sources, [{ label: "Thông báo phụ" }]);
}

const directAdmissionNormalized = validateAdmissionConfig({
  ...SAMPLE_CONFIG,
  methods: [
    ...(SAMPLE_CONFIG.methods as unknown[]),
    {
      methodCode: "PT_TT",
      methodName: "Xét tuyển thẳng",
      uiTemplate: "direct_admission",
      description: "Xét tuyển thẳng theo quy định của trường.",
    },
  ],
});
assert.equal(
  directAdmissionNormalized.ok,
  true,
  "direct_admission should be auto-normalized with synthetic placeholder",
);
if (directAdmissionNormalized.ok) {
  const method = directAdmissionNormalized.config.methods.find((item) => item.methodCode === "PT_TT");
  assert.ok(method, "Normalized method should exist");
  assert.equal(method?.inputs.length, 1);
  assert.equal(method?.inputs[0]?.key, "synthetic_score");
  assert.equal(method?.formula.type, "scale_conversion");
}

const incompleteMethodNormalized = validateAdmissionConfig({
  ...SAMPLE_CONFIG,
  methods: [
    ...(SAMPLE_CONFIG.methods as unknown[]),
    {
      methodCode: "PT_INCOMPLETE",
      methodName: "Phương thức AI trích xuất thiếu",
      description: "Thiếu inputs và formula trong bản nháp AI.",
      uiTemplate: "flat",
    },
  ],
});
assert.equal(
  incompleteMethodNormalized.ok,
  true,
  "methods thiếu inputs/formula nên được auto-fallback để không vỡ schema",
);
if (incompleteMethodNormalized.ok) {
  const method = incompleteMethodNormalized.config.methods.find(
    (item) => item.methodCode === "PT_INCOMPLETE",
  );
  assert.ok(method, "Fallback method should exist");
  assert.equal(method?.inputs.length, 1);
  assert.equal(method?.inputs[0]?.key, "synthetic_score");
  assert.equal(method?.formula.type, "scale_conversion");
}

console.log("genericAdmissionEngine.test.ts: all assertions passed");
