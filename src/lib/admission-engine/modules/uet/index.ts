import type {
  AdmissionInput,
  AdmissionMethod,
  AdmissionScoreResult,
  SchoolAdmissionModule,
} from "../../core/types";
import { uetSpec } from "./uet.config";
import {
  InvalidCombinationException,
  assertCombinationAllowed,
  convertHsaToThpt,
  convertSatToThpt,
  computeTotalPriorityBonus,
  getCombination,
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

function calculateMethod21(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload, input.method);
  assertCombinationAllowed(app.programCode, app.combinationCode);
  const combination = getCombination(app.combinationCode);
  const scores = app.scores;
  const certificateWarnings = validateCertificate(app.certificate);

  const SUBJECT_TO_SCORE_KEY: Record<string, keyof UetApplication["scores"]> = {
    "Toán": "math",
    "Vật lý": "physics",
    "Lý": "physics",
    "Hóa học": "chemistry",
    "Hóa": "chemistry",
    "Tiếng Anh": "english",
    "Anh": "english",
    "Tin học": "informatics",
    "Tin": "informatics",
    "Sinh học": "biology",
    "Sinh": "biology",
  };

  let baseScore = 0;
  for (const subjectName of combination.subjects) {
    const scoreKey = SUBJECT_TO_SCORE_KEY[subjectName];
    if (!scoreKey) {
      throw new Error(`Môn học không hỗ trợ tính điểm: ${subjectName}`);
    }
    // For English, check certificate replacement
    if (subjectName === "Anh" || subjectName === "Tiếng Anh") {
      const certificate = app.certificate;
      const certificateScore = certificate?.replacementEnglishScore ?? 0;
      if (certificate && combination.englishReplacementAllowed) {
        baseScore += certificateScore;
        continue;
      }
    }
    baseScore += scores[scoreKey] ?? 0;
  }

  const bonusScore = computeTotalPriorityBonus(app);

  return createResult(input, "METHOD_2_1", app, baseScore, bonusScore, {
    combination: app.combinationCode,
    certificate: app.certificate ? { type: app.certificate.type } : null,
    certificateWarnings,
    thirdSubject: combination.subjects[2],
    priorityBonus: bonusScore,
  });
}

function calculateMethod22(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload, input.method);
  if (app.hsaScore === undefined || !Number.isFinite(app.hsaScore)) {
    throw new Error("HSA score is required.");
  }
  const baseScore = convertHsaToThpt(app.hsaScore, app.hsaYear);
  const bonusScore = computeTotalPriorityBonus(app);

  return createResult(input, "METHOD_2_2", app, baseScore, bonusScore, {
    thresholdSource: "quydoi.md",
    scoreType: "HSA",
    rawHsaScore: app.hsaScore,
    hsaYear: app.hsaYear ?? 2025,
    convertedThptScore: baseScore,
    priorityBonus: bonusScore,
  });
}

function calculateMethod23(input: AdmissionInput): AdmissionScoreResult {
  const app = validateUetApplicationPayload(input.payload, input.method);
  if (app.satScore === undefined || !Number.isFinite(app.satScore)) {
    throw new Error("SAT score is required.");
  }
  const baseScore = convertSatToThpt(app.satScore);
  const bonusScore = computeTotalPriorityBonus(app);

  return createResult(input, "METHOD_2_3", app, baseScore, bonusScore, {
    thresholdSource: "infor_md",
    scoreType: "SAT",
    rawSatScore: app.satScore,
    convertedThptScore: baseScore,
    priorityBonus: bonusScore,
  });
}

function calculate(input: AdmissionInput): AdmissionScoreResult {
  switch (input.method as AdmissionMethod) {
    case "THPT":
    case "METHOD_2_1":
      return calculateMethod21(input);
    case "ĐGNL":
    case "DGNL":
    case "METHOD_2_2":
      return calculateMethod22(input);
    case "CCQT":
    case "SAT":
    case "METHOD_2_3":
      return calculateMethod23(input);
    default:
      throw new Error(`Unsupported UET admission method: ${input.method}`);
  }
}

export const uetModule: SchoolAdmissionModule = {
  schoolCode: "UET",
  schoolName: uetSpec.summary.university,
  supportedMethods: [
    "METHOD_2_1", "METHOD_2_2", "METHOD_2_3",
    "THPT", "ĐGNL", "DGNL", "CCQT", "SAT"
  ],
  calculate,
};

export { InvalidCombinationException };
