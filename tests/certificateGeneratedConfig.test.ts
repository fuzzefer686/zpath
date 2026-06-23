import assert from "node:assert/strict";

import {
  evaluateGeneratedCertificateConfig,
  validateGeneratedCertificateConfig,
} from "@/src/lib/certificate-converter";

const SAMPLE_CONFIG = {
  schoolCode: "ABC",
  schoolName: "ABC University",
  year: 2026,
  methods: [
    {
      methodCode: "THPT_WITH_CERT",
      methodName: "THPT + Cert",
      applicability: "direct",
      rules: [
        {
          certificateType: "IELTS_ACADEMIC",
          mode: "numeric_range",
          scoreField: "subject_score",
          reason: "Dùng làm điểm môn ngoại ngữ.",
          entries: [
            { minScore: 5.5, maxScore: 5.5, convertedScore: 8 },
            { minScore: 6.5, maxScore: 6.5, convertedScore: 9 },
          ],
        },
      ],
    },
    {
      methodCode: "TSA_BONUS",
      methodName: "TSA bonus cert",
      applicability: "conditional",
      rules: [
        {
          certificateType: "TOEIC",
          mode: "toeic_four_skills",
          scoreField: "bonus_score",
          reason: "Cộng bonus nếu đủ 4 kỹ năng TOEIC.",
          entries: [
            {
              skillName: "listening",
              minScore: 400,
              maxScore: 450,
              convertedScore: 8,
            },
            {
              skillName: "speaking",
              minScore: 150,
              maxScore: 170,
              convertedScore: 8,
            },
            {
              skillName: "reading",
              minScore: 400,
              maxScore: 450,
              convertedScore: 8,
            },
            {
              skillName: "writing",
              minScore: 150,
              maxScore: 170,
              convertedScore: 8,
            },
          ],
        },
      ],
    },
  ],
};

async function testValidateSuccess() {
  const validation = validateGeneratedCertificateConfig(SAMPLE_CONFIG);
  assert.equal(validation.ok, true);
}

async function testValidateFail() {
  const validation = validateGeneratedCertificateConfig({
    schoolCode: "",
    schoolName: "x",
    year: "2026",
    methods: [],
  });
  assert.equal(validation.ok, false);
}

async function testEvaluateNumericRange() {
  const validation = validateGeneratedCertificateConfig(SAMPLE_CONFIG);
  if (!validation.ok) throw new Error("Expected valid config");

  const results = evaluateGeneratedCertificateConfig(validation.config, {
    certificateType: "IELTS_ACADEMIC",
    score: 6.5,
  });

  const thpt = results.find((item) => item.methodCode === "THPT_WITH_CERT");
  assert.ok(thpt);
  assert.equal(thpt?.status, "applicable");
  assert.equal(thpt?.convertedScore, 9);
}

async function testEvaluateToeicConditional() {
  const validation = validateGeneratedCertificateConfig(SAMPLE_CONFIG);
  if (!validation.ok) throw new Error("Expected valid config");

  const missingSkills = evaluateGeneratedCertificateConfig(validation.config, {
    certificateType: "TOEIC",
    toeic: {
      listening: 420,
      reading: 420,
    },
  });
  const tsaMissing = missingSkills.find((item) => item.methodCode === "TSA_BONUS");
  assert.ok(tsaMissing);
  assert.equal(tsaMissing?.status, "conditional");
  assert.equal(tsaMissing?.convertedScore, null);

  const fullSkills = evaluateGeneratedCertificateConfig(validation.config, {
    certificateType: "TOEIC",
    toeic: {
      listening: 420,
      speaking: 160,
      reading: 420,
      writing: 160,
    },
  });
  const tsaFull = fullSkills.find((item) => item.methodCode === "TSA_BONUS");
  assert.ok(tsaFull);
  assert.equal(tsaFull?.status, "conditional");
  assert.equal(tsaFull?.convertedScore, 8);
}

async function main() {
  await testValidateSuccess();
  await testValidateFail();
  await testEvaluateNumericRange();
  await testEvaluateToeicConditional();
  console.log("certificateGeneratedConfig.test.ts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
