import assert from "node:assert/strict";
import {
  __setFTULanguageCertificateConversionRowsForTest,
  calculateFTUAdmissionScore,
  roundFTUScore,
  type FTUProgramGroup,
  type FTUScoringInput,
  type FTUScoringResult,
} from "@/src/lib/admission";
import {
  FTU_AWARD_BONUS_30,
  computeFtuBonus30,
} from "@/src/lib/admission-data/ftu-priority-2026";
import { createConversionRow, createFTUInput } from "./ftuTestHelpers";

type ExpectedScore = {
  officialRawScore: number | null;
  officialMaxScore: 30 | 40 | null;
  normalizedScore30: number | null;
};

type Official2025Case = {
  name: string;
  input: Partial<FTUScoringInput> & {
    method: FTUScoringInput["method"];
    programGroup: FTUProgramGroup;
  };
  expected: ExpectedScore;
};

function createFTU2025Input(
  input: Official2025Case["input"],
): FTUScoringInput {
  return createFTUInput({
    admissionYear: 2025,
    ...input,
  });
}

function assertScore(
  actual: FTUScoringResult,
  expected: ExpectedScore,
  message: string,
) {
  assert.equal(actual.officialRawScore, expected.officialRawScore, message);
  assert.equal(actual.officialMaxScore, expected.officialMaxScore, message);
  assert.equal(actual.normalizedScore30, expected.normalizedScore30, message);
}

async function assertOfficialFormulaExamples() {
  const cases: Official2025Case[] = [
    {
      name: "FTU 2025 - method 6.1 normal academic transcript formula",
      input: {
        method: "ACADEMIC_TRANSCRIPT_3_SUBJECTS",
        programGroup: "STANDARD_INTEGRATED",
        subjects: { m1: 9.1, m2: 8.8, m3: 9 },
        bonusPoint: 2,
        priorityPoint: 0.25,
      },
      expected: {
        officialRawScore: 29.15,
        officialMaxScore: 30,
        normalizedScore30: 29.15,
      },
    },
    {
      name: "FTU 2025 - method 6.1 math coefficient is converted to 30 before policy priority",
      input: {
        method: "ACADEMIC_TRANSCRIPT_3_SUBJECTS",
        programGroup: "TECH_DATA_AI",
        subjects: { m1: 9.2, m2: 8.7, m3: 8.5 },
        bonusPoint: 1.5,
        priorityPoint: 0.25,
      },
      expected: {
        officialRawScore: 37.1,
        officialMaxScore: 40,
        normalizedScore30: 28.08,
      },
    },
    {
      name: "FTU 2025 - method 6.1 language coefficient uses foreign language as M3",
      input: {
        method: "ACADEMIC_TRANSCRIPT_3_SUBJECTS",
        programGroup: "COMMERCIAL_LANGUAGE",
        subjects: { m1: 8.5, m2: 8.7, m3: 9.4 },
        bonusPoint: 1,
        priorityPoint: 0,
      },
      expected: {
        officialRawScore: 37,
        officialMaxScore: 40,
        normalizedScore30: 27.75,
      },
    },
    {
      name: "FTU 2025 - method 6.2 normal THPT score",
      input: {
        method: "THPT_3_SUBJECTS",
        programGroup: "STANDARD_INTEGRATED",
        subjects: { m1: 8.6, m2: 9, m3: 8.8 },
        bonusPoint: 0,
        priorityPoint: 0.5,
      },
      expected: {
        officialRawScore: 26.9,
        officialMaxScore: 30,
        normalizedScore30: 26.9,
      },
    },
    {
      name: "FTU 2025 - method 6.2 THPT math coefficient",
      input: {
        method: "THPT_3_SUBJECTS",
        programGroup: "TECH_DATA_AI",
        subjects: { m1: 8.8, m2: 8.4, m3: 8.9 },
        bonusPoint: 0,
        priorityPoint: 0.25,
      },
      expected: {
        officialRawScore: 34.9,
        officialMaxScore: 40,
        normalizedScore30: 26.43,
      },
    },
    {
      name: "FTU 2025 - method 6.1.2 certificate normal program",
      input: {
        method: "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT",
        programGroup: "STANDARD_INTEGRATED",
        subjects: { m1: 8.8, m2: 9 },
        certificate: { type: "IELTS", convertedScore: 9.5 },
        bonusPoint: 0,
        priorityPoint: 0.25,
      },
      expected: {
        officialRawScore: 27.55,
        officialMaxScore: 30,
        normalizedScore30: 27.55,
      },
    },
    {
      name: "FTU 2025 - method 6.2.2 language coefficient uses converted certificate score as M3",
      input: {
        method: "THPT_WITH_LANGUAGE_CERT",
        programGroup: "COMMERCIAL_LANGUAGE",
        subjects: { m1: 8.6, m2: 8.9 },
        certificate: { type: "IELTS", convertedScore: 9.7 },
        bonusPoint: 0,
        priorityPoint: 0.25,
      },
      expected: {
        officialRawScore: 36.9,
        officialMaxScore: 40,
        normalizedScore30: 27.93,
      },
    },
  ];

  for (const item of cases) {
    const result = await calculateFTUAdmissionScore(createFTU2025Input(item.input));
    assertScore(result, item.expected, item.name);
    assert.equal(result.admissionYear, 2025, item.name);
    assert.ok(result.formulaCode.startsWith("FTU_2025_"), item.name);
  }
}

async function assertPolicyPriorityAppliedAfterCoefficientConversion() {
  const result = await calculateFTUAdmissionScore(
    createFTU2025Input({
      method: "THPT_3_SUBJECTS",
      programGroup: "TECH_DATA_AI",
      subjects: { m1: 8, m2: 8, m3: 8 },
      bonusPoint: 1,
      priorityPoint: 1,
    }),
  );

  const raw = 8 * 2 + 8 + 8 + 1;
  const correct = roundFTUScore((raw * 3) / 4 + 1);
  const incorrect = roundFTUScore(((raw + 1) * 3) / 4);

  assert.equal(result.normalizedScore30, correct);
  assert.notEqual(result.normalizedScore30, incorrect);
}

function assertAwardPriorityTable() {
  assert.equal(FTU_AWARD_BONUS_30.NATIONAL_FIRST, 3);
  assert.equal(FTU_AWARD_BONUS_30.NATIONAL_SECOND, 2);
  assert.equal(FTU_AWARD_BONUS_30.NATIONAL_THIRD, 1.5);
  assert.equal(FTU_AWARD_BONUS_30.NATIONAL_CONSOLATION, 1);
  assert.equal(
    computeFtuBonus30({
      awards: ["NATIONAL_SECOND", "NATIONAL_CONSOLATION"],
    }),
    2,
    "Only the highest eligible award should be counted once.",
  );
}

async function assertCertificateConversionUsesFTUTableFor2025() {
  __setFTULanguageCertificateConversionRowsForTest([
    createConversionRow({
      id: "hust-ielts-65",
      school_code: "HUST",
      effective_year: 2025,
      certificate_type: "IELTS",
      min_score: 6.5,
      max_score: 6.5,
      converted_subject_score_out_of_10: 10,
    }),
    createConversionRow({
      id: "ftu-ielts-65",
      effective_year: 2025,
      certificate_type: "IELTS",
      min_score: 6.5,
      max_score: 6.5,
      converted_subject_score_out_of_10: 9.5,
    }),
  ]);

  const result = await calculateFTUAdmissionScore(
    createFTU2025Input({
      method: "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT",
      programGroup: "STANDARD_INTEGRATED",
      subjects: { m1: 8.8, m2: 9 },
      certificate: { type: "IELTS", rawScore: 6.5 },
      priorityPoint: 0.25,
    }),
  );

  assert.equal(result.certificateConvertedScore, 9.5);
  assert.equal(result.normalizedScore30, 27.55);
}

async function assertEligibilityAndMissingDataPaths() {
  const missingSubject = await calculateFTUAdmissionScore(
    createFTU2025Input({
      method: "THPT_3_SUBJECTS",
      programGroup: "STANDARD_INTEGRATED",
      subjects: { m1: 8.6, m2: 9 },
    }),
  );
  assert.equal(missingSubject.eligibilityStatus, "unknown");
  assert.equal(missingSubject.officialRawScore, null);
  assert.ok(missingSubject.missingFields.includes("subjects.m3"));

  const missingCertificate = await calculateFTUAdmissionScore(
    createFTU2025Input({
      method: "THPT_WITH_LANGUAGE_CERT",
      programGroup: "STANDARD_INTEGRATED",
      subjects: { m1: 8.8, m2: 9 },
    }),
  );
  assert.equal(missingCertificate.eligibilityStatus, "unknown");
  assert.equal(missingCertificate.officialRawScore, null);
  assert.ok(missingCertificate.missingFields.includes("certificate.rawScore"));

  const unsupportedProgram = await calculateFTUAdmissionScore(
    createFTUInput({
      admissionYear: 2025,
      method: "THPT_3_SUBJECTS",
      programName: "Unsupported FTU 2025 program",
      subjects: { m1: 8, m2: 8, m3: 8 },
    }),
  );
  assert.equal(unsupportedProgram.eligibilityStatus, "unknown");
  assert.ok(unsupportedProgram.missingFields.includes("programGroup"));
}

async function main() {
  assert.equal(roundFTUScore(27.666), 27.67);
  assert.equal(roundFTUScore(27.664), 27.66);

  await assertOfficialFormulaExamples();
  await assertPolicyPriorityAppliedAfterCoefficientConversion();
  assertAwardPriorityTable();
  await assertCertificateConversionUsesFTUTableFor2025();
  await assertEligibilityAndMissingDataPaths();

  __setFTULanguageCertificateConversionRowsForTest(null);
  console.log("ftuAdmissionScoringOfficial2025.test.ts passed");
}

main().catch((error) => {
  __setFTULanguageCertificateConversionRowsForTest(null);
  console.error(error);
  process.exit(1);
});
