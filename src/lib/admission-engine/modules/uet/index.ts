import type {
  AdmissionInput,
  AdmissionMethod,
  AdmissionScoreResult,
  SchoolAdmissionModule,
} from "../../core/types";
import { uetSpec } from "./uet.config";
import { roundHalfUp } from "./uet.helpers";
import {
  InvalidCombinationException,
  assertCombinationAllowed,
  computeMethod1Bonus,
  computePriorityBonus,
  normalizeScore,
  validateCertificate,
  validateUetApplicationPayload,
} from "./uet.validators";
import type { UetApplication, UetAdmissionMethodCode } from "./uet.types";

function createResult(
  input: AdmissionInput,
  methodCode: UetAdmissionMethodCode,
  app: UetApplication,
  baseScore: number,
  bonusScore: number,
  details: Record<string, unknown>,
  warnings: string[] = [],
): AdmissionScoreResult {
  const originalScore = normalizeScore(baseScore + bonusScore);
  return {
    schoolCode: input.schoolCode,
    method: input.method,
    year: input.year,
    originalScore,
    originalScale: 30,
    normalizedScore30: originalScore,
    targetScale: 30,
    formulaUsed: `${methodCode}:${app.combinationCode}`,
    details: {
      methodCode,
      programCode: app.programCode,
      combinationCode: app.combinationCode,
      baseScore: normalizeScore(baseScore),
      bonusScore: normalizeScore(bonusScore),
      totalScore: originalScore,
      ...details,
    },
    warnings,
  };
}

function calculateMethod1(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload);
  const baseScore = 0;
  const bonusScore = computeMethod1Bonus(app.awards, app.programCode);
  return createResult(input, "METHOD_1", app, baseScore, bonusScore, {
    awardBonus: bonusScore,
    selectedAwards: app.awards ?? [],
  });
}

function calculateMethod25(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload);
  const bonusScore = computePriorityBonus(app.awards, app.programCode, app.usedMethod1);
  const cappedBonus = roundHalfUp(Math.min(bonusScore, uetSpec.scoringRules.bonusPoints.maxTotalBonus), 2);
  return createResult(input, "METHOD_2_5", app, 0, cappedBonus, {
    priorityBonus: cappedBonus,
    usedMethod1: Boolean(app.usedMethod1),
    awardSubjects: app.awards?.map((award) => award.subject) ?? [],
    maxComponentBonus: uetSpec.scoringRules.bonusPoints.maxComponentBonus,
  });
}

function calculateMethod21(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload);
  assertCombinationAllowed(app.programCode, app.combinationCode);
  const combination = uetSpec.combinations.find((c) => c.code === app.combinationCode)!;
  const scores = app.scores;
  const certificateWarnings = validateCertificate(app.certificate);

  const english = scores.english ?? 0;
  const certificate = app.certificate;
  const certificateScore = certificate?.replacementEnglishScore ?? 0;
  let baseScore = 0;
  if (app.combinationCode === "A01") {
    if (certificate && combination.englishReplacementAllowed) {
      baseScore = scores.math + scores.physics + certificateScore;
    } else {
      baseScore = scores.math + scores.physics + english;
    }
  } else {
    const third = app.combinationCode === "A00"
      ? (scores.chemistry ?? 0)
      : app.combinationCode === "X06"
        ? (scores.informatics ?? 0)
        : (scores.biology ?? 0);
    baseScore = scores.math + scores.physics + third;
    if (certificate && ["A00", "X06", "A02"].includes(app.combinationCode) && certificate.bonusPoints) {
      baseScore += certificate.bonusPoints;
    }
  }
  return createResult(input, "METHOD_2_1", app, baseScore, 0, {
    combination: app.combinationCode,
    certificate: certificate ? { type: certificate.type } : null,
    certificateWarnings,
  });
}

function calculateMethod22(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload);
  if (app.hsaScore === undefined || !Number.isFinite(app.hsaScore)) {
    throw new Error("HSA score is required.");
  }
  const baseScore = app.hsaScore;
  return createResult(input, "METHOD_2_2", app, baseScore, 0, {
    thresholdSource: "infor_md",
    scoreType: "HSA",
  });
}

function calculateMethod23(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload);
  if (app.satScore === undefined || !Number.isFinite(app.satScore)) {
    throw new Error("SAT score is required.");
  }
  const baseScore = app.satScore;
  return createResult(input, "METHOD_2_3", app, baseScore, 0, {
    thresholdSource: "infor_md",
    scoreType: "SAT",
  });
}

function calculateMethod26(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload);
  if (!app.preUniversityCompleted || app.preUniversityGraduatedYear !== 2025) {
    throw new Error("Dự bị đại học không hợp lệ.");
  }
  if (app.thpt2025Score === undefined || !Number.isFinite(app.thpt2025Score)) {
    throw new Error("THPT 2025 score is required.");
  }
  const thresholdConfig: Record<string, number> = {
    CN10: 22,
    CN14: 24,
  };
  return createResult(input, "METHOD_2_6", app, app.thpt2025Score, 0, {
    thresholdYear: 2025,
    thresholdConfig,
    sortingMetric: "THPT_2025_score_desc",
  });
}

function calculate(input: AdmissionInput): AdmissionScoreResult {
  switch (input.method as AdmissionMethod) {
    case "METHOD_1":
      return calculateMethod1(input);
    case "METHOD_2_1":
      return calculateMethod21(input);
    case "METHOD_2_2":
      return calculateMethod22(input);
    case "METHOD_2_3":
      return calculateMethod23(input);
    case "METHOD_2_5":
      return calculateMethod25(input);
    case "METHOD_2_6":
      return calculateMethod26(input);
    default:
      throw new Error(`Unsupported UET admission method: ${input.method}`);
  }
}

export const uetModule: SchoolAdmissionModule = {
  schoolCode: "UET",
  schoolName: uetSpec.summary.university,
  supportedMethods: ["METHOD_1", "METHOD_2_1", "METHOD_2_2", "METHOD_2_3", "METHOD_2_5", "METHOD_2_6"],
  calculate,
};

export { InvalidCombinationException };
