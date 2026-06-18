import assert from "node:assert/strict";

import { normalizeGeneratedConfig } from "@/src/lib/admission-config/normalizeGeneratedConfig";

const draft = {
  schemaVersion: 2,
  schoolCode: "TEST",
  schoolName: "Test University",
  year: 2026,
  methods: [
    {
      methodCode: "PT2_N1",
      methodName: "Xét kết hợp nhóm 1",
      requirements: ["Có IELTS >= 7.0 hoặc chứng chỉ khác tương đương"],
      inputs: [
        {
          key: "diem_quy_doi",
          label: "Điểm quy đổi chứng chỉ tiếng Anh",
          type: "number",
          required: true,
          min: 9.75,
          max: 10,
        },
      ],
      formula: {
        type: "weighted_combination",
        terms: [{ inputKey: "diem_quy_doi", weight: 1 }],
        targetScale: 30,
      },
    },
    {
      methodCode: "PT3",
      methodName: "THPT",
      requirements: ["Tốt nghiệp THPT"],
      inputs: [
        {
          key: "toan",
          label: "Toán",
          type: "number",
          required: true,
          min: 0,
          max: 10,
        },
      ],
      formula: {
        type: "weighted_combination",
        terms: [{ inputKey: "toan", weight: 1 }],
        targetScale: 30,
      },
    },
  ],
} as Record<string, unknown>;

const normalized = normalizeGeneratedConfig(draft);
const method0 = (normalized.draft.methods as Array<Record<string, unknown>>)[0]!;
const method1 = (normalized.draft.methods as Array<Record<string, unknown>>)[1]!;
const method0Input = (method0.inputs as Array<Record<string, unknown>>)[0]!;

assert.equal(method0Input.type, "certificate", "IELTS-like converted score should become certificate input");
assert.ok(
  Array.isArray((method0Input.certificateConfig as Record<string, unknown>)?.levels),
  "Certificate input should include conversion levels",
);
assert.equal(
  ((method0.formula as Record<string, unknown>).terms as Array<Record<string, unknown>>)[0]?.inputKey,
  "diem_quy_doi",
  "Formula inputKey should stay compatible after normalization",
);
assert.equal(
  ((method1.inputs as Array<Record<string, unknown>>)[0] as Record<string, unknown>).type,
  "number",
  "Methods without IELTS signal should stay unchanged",
);
assert.ok(normalized.warnings.length >= 1, "Normalization should produce a warning for admin review");

console.log("admissionGeneratedConfigNormalization.test.ts: all assertions passed");
