import assert from "node:assert/strict";
import {
  __setFTULanguageCertificateConversionRowsForTest,
  calculateFTUAdmissionScore,
  normalizeFTUScoreTo30,
  roundFTUScore,
  type FTUAdmissionMethod,
  type FTUAssessmentExamType,
  type FTUProgramGroup,
  type FTUScoringResult,
} from "@/src/lib/admission";
import { createConversionRow, createFTUInput } from "./ftuTestHelpers";

type ExpectedScore = {
  officialRawScore: number | null;
  officialMaxScore: 30 | 40 | null;
  normalizedScore30: number | null;
};

const PROGRAM_GROUPS: FTUProgramGroup[] = [
  "STANDARD_INTEGRATED",
  "TECH_DATA_AI",
  "COMMERCIAL_LANGUAGE",
];

const THREE_SUBJECT_METHODS: FTUAdmissionMethod[] = [
  "ACADEMIC_TRANSCRIPT_3_SUBJECTS",
  "THPT_3_SUBJECTS",
];

const LANGUAGE_CERT_METHODS: FTUAdmissionMethod[] = [
  "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT",
  "THPT_WITH_LANGUAGE_CERT",
];

const DOMESTIC_EXAMS: Extract<
  FTUAssessmentExamType,
  "HSA" | "V_ACT" | "TSA"
>[] = ["HSA", "V_ACT", "TSA"];

const INTERNATIONAL_EXAMS: Extract<
  FTUAssessmentExamType,
  "SAT" | "ACT" | "A_LEVEL"
>[] = ["SAT", "ACT", "A_LEVEL"];

function expectedResult(rawScore: number, officialMaxScore: 30 | 40) {
  const officialRawScore = roundFTUScore(rawScore);
  return {
    officialRawScore,
    officialMaxScore,
    normalizedScore30: roundFTUScore(
      normalizeFTUScoreTo30(officialRawScore, officialMaxScore),
    ),
  };
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

function expectedThreeComponentScore(
  group: FTUProgramGroup,
  m1: number,
  m2: number,
  m3: number,
  priorityPoint = 0,
  bonusPoint = 0,
) {
  if (group === "TECH_DATA_AI") {
    return expectedResult(m1 * 2 + m2 + m3 + priorityPoint + bonusPoint, 40);
  }

  if (group === "COMMERCIAL_LANGUAGE") {
    return expectedResult(
      m1 + m2 * 1.5 + m3 * 1.5 + priorityPoint + bonusPoint,
      40,
    );
  }

  return expectedResult(m1 + m2 + m3 + priorityPoint + bonusPoint, 30);
}

function domesticBaseScore(examType: "HSA" | "V_ACT" | "TSA") {
  if (examType === "HSA") return 27 + ((125 - 100) * 3) / 50;
  if (examType === "V_ACT") return 27 + ((1025 - 850) * 3) / 350;
  return 27 + ((85 - 70) * 3) / 30;
}

function domesticExamScore(examType: "HSA" | "V_ACT" | "TSA") {
  if (examType === "HSA") return 125;
  if (examType === "V_ACT") return 1025;
  return 85;
}

function expectedDomesticScore(
  group: FTUProgramGroup,
  examType: "HSA" | "V_ACT" | "TSA",
): ExpectedScore {
  if (examType === "TSA" && group !== "TECH_DATA_AI") {
    return {
      officialRawScore: null,
      officialMaxScore: group === "STANDARD_INTEGRATED" ? 30 : 40,
      normalizedScore30: null,
    };
  }

  if (examType === "V_ACT" && group === "COMMERCIAL_LANGUAGE") {
    return {
      officialRawScore: null,
      officialMaxScore: 40,
      normalizedScore30: null,
    };
  }

  const baseScore = domesticBaseScore(examType);
  return group === "STANDARD_INTEGRATED"
    ? expectedResult(baseScore, 30)
    : expectedResult((baseScore * 4) / 3, 40);
}

function expectedInternationalScore(
  group: FTUProgramGroup,
  examType: "SAT" | "ACT" | "A_LEVEL",
) {
  const assessmentScore = examType === "A_LEVEL" ? 10 : 18;
  const aLevelOtherScore = 8;
  const certificateScore = 9;

  if (examType === "A_LEVEL") {
    if (group === "COMMERCIAL_LANGUAGE") {
      return expectedResult(
        assessmentScore + aLevelOtherScore + certificateScore * 2,
        40,
      );
    }

    return expectedResult(
      (group === "TECH_DATA_AI" ? assessmentScore * 2 : assessmentScore) +
        aLevelOtherScore +
        certificateScore,
      group === "TECH_DATA_AI" ? 40 : 30,
    );
  }

  if (group === "TECH_DATA_AI") {
    return expectedResult(((assessmentScore + certificateScore) * 4) / 3, 40);
  }

  if (group === "COMMERCIAL_LANGUAGE") {
    return expectedResult(assessmentScore + certificateScore * 2, 40);
  }

  return expectedResult(assessmentScore + certificateScore, 30);
}

async function assertThreeSubjectMatrix() {
  for (const method of THREE_SUBJECT_METHODS) {
    for (const group of PROGRAM_GROUPS) {
      const result = await calculateFTUAdmissionScore(
        createFTUInput({
          method,
          programGroup: group,
          subjects: { m1: 8, m2: 8.5, m3: 9 },
        }),
      );

      assertScore(
        result,
        expectedThreeComponentScore(group, 8, 8.5, 9),
        `${method}/${group}`,
      );
    }
  }
}

async function assertLanguageCertificateMatrix() {
  for (const method of LANGUAGE_CERT_METHODS) {
    for (const group of PROGRAM_GROUPS) {
      const result = await calculateFTUAdmissionScore(
        createFTUInput({
          method,
          programGroup: group,
          subjects: { m1: 8, m2: 8.5 },
          certificate: { type: "IELTS", convertedScore: 9 },
        }),
      );

      assert.equal(result.certificateConvertedScore, 9, `${method}/${group}`);
      assertScore(
        result,
        expectedThreeComponentScore(group, 8, 8.5, 9),
        `${method}/${group}`,
      );
    }
  }
}

async function assertDomesticAssessmentMatrix() {
  for (const group of PROGRAM_GROUPS) {
    for (const examType of DOMESTIC_EXAMS) {
      const result = await calculateFTUAdmissionScore(
        createFTUInput({
          method: "DOMESTIC_ASSESSMENT",
          programGroup: group,
          assessment: {
            examType,
            examScore: domesticExamScore(examType),
          },
        }),
      );

      assertScore(
        result,
        expectedDomesticScore(group, examType),
        `DOMESTIC_ASSESSMENT/${group}/${examType}`,
      );

      if (examType === "TSA" && group !== "TECH_DATA_AI") {
        assert.equal(result.eligibilityStatus, "unknown");
      }
      if (examType === "V_ACT" && group === "COMMERCIAL_LANGUAGE") {
        assert.equal(result.eligibilityStatus, "unknown");
      }
    }
  }
}

async function assertInternationalAssessmentMatrix() {
  for (const group of PROGRAM_GROUPS) {
    for (const examType of INTERNATIONAL_EXAMS) {
      const result = await calculateFTUAdmissionScore(
        createFTUInput({
          method: "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT",
          programGroup: group,
          assessment: {
            examType,
            convertedAssessmentScore: examType === "A_LEVEL" ? undefined : 18,
            aLevelMathConvertedScore: examType === "A_LEVEL" ? 10 : undefined,
            aLevelOtherConvertedScore:
              examType === "A_LEVEL" ? 8 : undefined,
          },
          certificate: { type: "IELTS", convertedScore: 9 },
        }),
      );

      assert.equal(
        result.certificateConvertedScore,
        9,
        `INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT/${group}/${examType}`,
      );
      assertScore(
        result,
        expectedInternationalScore(group, examType),
        `INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT/${group}/${examType}`,
      );
    }
  }
}

async function assertRawScoreConversionPath() {
  __setFTULanguageCertificateConversionRowsForTest([
    createConversionRow({
      id: "ftu-sat-1550-1600",
      certificate_type: "SAT",
      min_score: 1550,
      max_score: 1600,
      converted_subject_score_out_of_10: 20,
    }),
    createConversionRow({
      id: "ftu-ielts-65",
      certificate_type: "IELTS",
      min_score: 6.5,
      max_score: 6.5,
      converted_subject_score_out_of_10: 8.5,
    }),
  ]);

  const result = await calculateFTUAdmissionScore(
    createFTUInput({
      method: "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT",
      programGroup: "STANDARD_INTEGRATED",
      assessment: { examType: "SAT", examScore: 1580 },
      certificate: { type: "IELTS", rawScore: 6.5 },
    }),
  );

  assert.equal(result.assessmentConvertedScore, 20);
  assert.equal(result.certificateConvertedScore, 8.5);
  assertScore(
    result,
    expectedResult(28.5, 30),
    "raw SAT and raw IELTS should resolve from language_certificate_conversions",
  );
}

async function assertMissingDataPaths() {
  const missingSubject = await calculateFTUAdmissionScore(
    createFTUInput({
      method: "THPT_3_SUBJECTS",
      programGroup: "STANDARD_INTEGRATED",
      subjects: { m1: 8, m2: 8.5 },
    }),
  );
  assert.equal(missingSubject.officialRawScore, null);
  assert.ok(missingSubject.missingFields.includes("subjects.m3"));

  __setFTULanguageCertificateConversionRowsForTest([]);
  const missingConversion = await calculateFTUAdmissionScore(
    createFTUInput({
      method: "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT",
      programGroup: "STANDARD_INTEGRATED",
      assessment: { examType: "SAT", examScore: 1580 },
      certificate: { type: "IELTS", rawScore: 6.5 },
    }),
  );
  assert.equal(missingConversion.officialRawScore, null);
  assert.ok(
    missingConversion.missingFields.includes(
      "language_certificate_conversions.converted_subject_score_out_of_10",
    ),
  );
}

async function main() {
  __setFTULanguageCertificateConversionRowsForTest(null);
  await assertThreeSubjectMatrix();
  await assertLanguageCertificateMatrix();
  await assertDomesticAssessmentMatrix();
  await assertInternationalAssessmentMatrix();
  await assertRawScoreConversionPath();
  await assertMissingDataPaths();
  __setFTULanguageCertificateConversionRowsForTest(null);

  console.log("ftuAdmissionScoringMatrix.test.ts passed");
}

main().catch((error) => {
  __setFTULanguageCertificateConversionRowsForTest(null);
  console.error(error);
  process.exit(1);
});
