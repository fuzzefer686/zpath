import assert from "node:assert/strict";
import {
  __setFTULanguageCertificateConversionRowsForTest,
  calculateFTUAdmissionScore,
} from "@/src/lib/admission";
import { createConversionRow, createFTUInput } from "./ftuTestHelpers";

function assertScore(
  actual: Awaited<ReturnType<typeof calculateFTUAdmissionScore>>,
  expected: {
    officialRawScore: number;
    officialMaxScore: 30 | 40;
    normalizedScore30: number;
  },
) {
  assert.equal(actual.officialRawScore, expected.officialRawScore);
  assert.equal(actual.officialMaxScore, expected.officialMaxScore);
  assert.equal(actual.normalizedScore30, expected.normalizedScore30);
}

async function main() {
assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "THPT_3_SUBJECTS",
      programGroup: "STANDARD_INTEGRATED",
      subjects: { m1: 8, m2: 8.5, m3: 9 },
    }),
  ),
  { officialRawScore: 25.5, officialMaxScore: 30, normalizedScore30: 25.5 },
);

assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "THPT_3_SUBJECTS",
      programGroup: "TECH_DATA_AI",
      subjects: { m1: 8.5, m2: 8, m3: 9 },
    }),
  ),
  { officialRawScore: 34, officialMaxScore: 40, normalizedScore30: 25.5 },
);

assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "THPT_3_SUBJECTS",
      programGroup: "COMMERCIAL_LANGUAGE",
      subjects: { m1: 8, m2: 8.5, m3: 9 },
    }),
  ),
  { officialRawScore: 34.25, officialMaxScore: 40, normalizedScore30: 25.69 },
);

assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "DOMESTIC_ASSESSMENT",
      programGroup: "STANDARD_INTEGRATED",
      assessment: { examType: "HSA", examScore: 120 },
    }),
  ),
  { officialRawScore: 28.2, officialMaxScore: 30, normalizedScore30: 28.2 },
);

assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "DOMESTIC_ASSESSMENT",
      programGroup: "TECH_DATA_AI",
      assessment: { examType: "HSA", examScore: 120 },
    }),
  ),
  { officialRawScore: 37.6, officialMaxScore: 40, normalizedScore30: 28.2 },
);

assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "DOMESTIC_ASSESSMENT",
      programGroup: "TECH_DATA_AI",
      assessment: { examType: "TSA", examScore: 85 },
    }),
  ),
  { officialRawScore: 38, officialMaxScore: 40, normalizedScore30: 28.5 },
);

const invalidHsa = await calculateFTUAdmissionScore(
  createFTUInput({
    method: "DOMESTIC_ASSESSMENT",
    programGroup: "STANDARD_INTEGRATED",
    assessment: { examType: "HSA", examScore: 95 },
  }),
);
assert.equal(invalidHsa.eligibilityStatus, "ineligible");
assert.ok(invalidHsa.warnings.some((warning) => warning.includes("HSA")));

__setFTULanguageCertificateConversionRowsForTest([]);
const missingCertificate = await calculateFTUAdmissionScore(
  createFTUInput({
    method: "THPT_WITH_LANGUAGE_CERT",
    programGroup: "STANDARD_INTEGRATED",
    subjects: { m1: 8, m2: 8 },
    certificate: { type: "IELTS", rawScore: 6.5 },
  }),
);
assert.equal(missingCertificate.eligibilityStatus, "unknown");
assert.ok(
  missingCertificate.missingFields.includes(
    "language_certificate_conversions.converted_subject_score_out_of_10",
  ),
);
assert.ok(
  missingCertificate.warnings.includes(
    "Chưa có dữ liệu quy đổi chứng chỉ tương ứng cho FTU 2026.",
  ),
);

__setFTULanguageCertificateConversionRowsForTest([
  createConversionRow({
    certificate_type: "IELTS",
    min_score: 6.5,
    max_score: 6.5,
    converted_subject_score_out_of_10: 9.5,
  }),
]);
assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "THPT_WITH_LANGUAGE_CERT",
      programGroup: "STANDARD_INTEGRATED",
      subjects: { m1: 8, m2: 8 },
      certificate: { type: "IELTS", rawScore: 6.5 },
    }),
  ),
  { officialRawScore: 25.5, officialMaxScore: 30, normalizedScore30: 25.5 },
);

assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT",
      programGroup: "STANDARD_INTEGRATED",
      assessment: { examType: "SAT", convertedAssessmentScore: 18 },
      certificate: { type: "IELTS", convertedScore: 9 },
    }),
  ),
  { officialRawScore: 27, officialMaxScore: 30, normalizedScore30: 27 },
);

assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT",
      programGroup: "TECH_DATA_AI",
      assessment: { examType: "SAT", convertedAssessmentScore: 18 },
      certificate: { type: "IELTS", convertedScore: 9 },
    }),
  ),
  { officialRawScore: 36, officialMaxScore: 40, normalizedScore30: 27 },
);

assertScore(
  await calculateFTUAdmissionScore(
    createFTUInput({
      method: "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT",
      programGroup: "COMMERCIAL_LANGUAGE",
      assessment: { examType: "SAT", convertedAssessmentScore: 18 },
      certificate: { type: "IELTS", convertedScore: 9 },
    }),
  ),
  { officialRawScore: 36, officialMaxScore: 40, normalizedScore30: 27 },
);

__setFTULanguageCertificateConversionRowsForTest([
  createConversionRow({
    school_code: "HUST",
    certificate_type: "IELTS",
    min_score: 6.5,
    max_score: 6.5,
    converted_subject_score_out_of_10: 10,
  }),
]);
const noHustFallback = await calculateFTUAdmissionScore(
  createFTUInput({
    method: "THPT_WITH_LANGUAGE_CERT",
    programGroup: "STANDARD_INTEGRATED",
    subjects: { m1: 8, m2: 8 },
    certificate: { type: "IELTS", rawScore: 6.5 },
  }),
);
assert.equal(noHustFallback.eligibilityStatus, "unknown");
assert.equal(noHustFallback.certificateConvertedScore, undefined);

const unknownProgram = await calculateFTUAdmissionScore(
  createFTUInput({
    method: "THPT_3_SUBJECTS",
    programName: "Some unknown FTU program",
    subjects: { m1: 8, m2: 8, m3: 8 },
  }),
);
assert.equal(unknownProgram.eligibilityStatus, "unknown");
assert.ok(unknownProgram.missingFields.includes("programGroup"));

__setFTULanguageCertificateConversionRowsForTest(null);

console.log("ftuAdmissionScoring.test.ts passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
