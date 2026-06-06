import { uetSpec } from "./uet.config";
import type {
  UetApplication,
  UetAward,
  UetCombination,
  UetCombinationCode,
  UetProgram,
  UetProgramCode,
} from "./uet.types";
import { isRecord, roundHalfUp, yearsBetween } from "./uet.helpers";

export class InvalidCombinationException extends Error {}

const MAX_TOTAL_BONUS = uetSpec.scoringRules.bonusPoints.maxTotalBonus;
const MAX_COMPONENT_BONUS = uetSpec.scoringRules.bonusPoints.maxComponentBonus;

export function getProgram(programCode: UetProgramCode): UetProgram {
  const program = uetSpec.programs.find((item) => item.code === programCode);
  if (!program) throw new Error(`Unknown UET program: ${programCode}`);
  return program;
}

export function getCombination(combinationCode: UetCombinationCode): UetCombination {
  const combination = uetSpec.combinations.find((item) => item.code === combinationCode);
  if (!combination) throw new Error(`Unknown UET combination: ${combinationCode}`);
  return combination;
}

export function assertCombinationAllowed(programCode: UetProgramCode, combinationCode: UetCombinationCode) {
  const program = getProgram(programCode);
  if (!program.allowedCombinations.includes(combinationCode)) {
    throw new InvalidCombinationException(`Tổ hợp ${combinationCode} không hợp lệ với ngành ${programCode}.`);
  }
  const combination = getCombination(combinationCode);
  if (combination.allowedPrograms !== "ALL" && !combination.allowedPrograms.includes(programCode)) {
    throw new InvalidCombinationException(`Tổ hợp ${combinationCode} không áp dụng cho ngành ${programCode}.`);
  }
}

function assertKnownMethodEligibility(payload: Record<string, unknown>) {
  if (payload.hsaScore !== undefined && (typeof payload.hsaScore !== "number" || !Number.isFinite(payload.hsaScore))) {
    throw new Error("hsaScore phải là số hợp lệ.");
  }
  if (payload.satScore !== undefined && (typeof payload.satScore !== "number" || !Number.isFinite(payload.satScore))) {
    throw new Error("satScore phải là số hợp lệ.");
  }
  if (payload.thpt2025Score !== undefined && (typeof payload.thpt2025Score !== "number" || !Number.isFinite(payload.thpt2025Score))) {
    throw new Error("thpt2025Score phải là số hợp lệ.");
  }
}

export function validateUetApplicationPayload(payload: unknown): UetApplication {
  if (!isRecord(payload)) throw new Error("UET payload không hợp lệ.");
  const record = payload as Record<string, unknown>;
  const { programCode, combinationCode, aspirationOrder } = record;
  if (typeof programCode !== "string" || typeof combinationCode !== "string") {
    throw new Error("Thiếu programCode hoặc combinationCode.");
  }
  if (typeof aspirationOrder !== "number" || !Number.isInteger(aspirationOrder) || aspirationOrder <= 0) {
    throw new Error("aspirationOrder phải là số nguyên dương.");
  }
  assertKnownMethodEligibility(record);
  assertCombinationAllowed(programCode as UetProgramCode, combinationCode as UetCombinationCode);
  return payload as UetApplication;
}

export function awardAppliesToProgram(awardSubject: string, programCode: UetProgramCode): boolean {
  const mapping = uetSpec.scoringRules.awardSubjectMapping.find((item) => item.subject.includes(awardSubject));
  if (!mapping) return false;
  return mapping.allowedPrograms === "ALL" || mapping.allowedPrograms.includes(programCode);
}

export function filterEligibleAwards(awards: UetAward[] | undefined, programCode: UetProgramCode): UetAward[] {
  if (!awards?.length) return [];
  const method1 = uetSpec.admissionMethods.find((method) => method.code === "METHOD_1");
  const maxYearsSinceAward = Number(method1?.eligibility?.max_years_since_award ?? 3);
  const minAwardYear = uetSpec.summary.admissionYear - maxYearsSinceAward;
  return awards.filter((award) => {
    if (award.isGdtx) return false;
    if (award.year < minAwardYear) return false;
    return awardAppliesToProgram(award.subject, programCode);
  });
}

export function computeMethod1Bonus(awards: UetAward[] | undefined, programCode: UetProgramCode): number {
  const eligibleAwards = filterEligibleAwards(awards, programCode);
  return roundHalfUp(Math.min(MAX_TOTAL_BONUS, Math.max(0, ...eligibleAwards.map((award) => award.scoreBonus), 0)), 2);
}

export function validateCertificate(certificate: UetApplication["certificate"], currentDateISO = new Date().toISOString()): string[] {
  const warnings: string[] = [];
  if (!certificate) return warnings;
  if (!uetSpec.scoringRules.certificateValidation.allowedTypes.includes(certificate.type)) throw new Error(`Chứng chỉ ${certificate.type} không được chấp nhận.`);
  if (certificate.online) throw new Error("Chứng chỉ thi online tại nhà không được chấp nhận.");
  const skills = [certificate.skills.listening, certificate.skills.reading, certificate.skills.writing, certificate.skills.speaking];
  if (skills.some((skill) => skill === undefined)) throw new Error("Chứng chỉ tiếng Anh phải đủ 4 kỹ năng.");
  if (skills.some((skill) => (skill as number) < uetSpec.scoringRules.certificateValidation.minScorePerSkill)) throw new Error("Mỗi kỹ năng chứng chỉ tiếng Anh phải đạt tối thiểu 5.0.");
  if (certificate.expiryDate && yearsBetween(certificate.expiryDate, currentDateISO.slice(0, 10)) > uetSpec.scoringRules.certificateValidation.validityYears) {
    throw new Error("Chứng chỉ tiếng Anh đã quá hạn.");
  }
  if (certificate.testDate) {
    const testYear = Number(certificate.testDate.slice(0, 4));
    const currentYear = Number(currentDateISO.slice(0, 4));
    if (Number.isFinite(testYear) && Number.isFinite(currentYear) && currentYear - testYear > uetSpec.scoringRules.certificateValidation.validityYears) {
      throw new Error("Chứng chỉ tiếng Anh đã quá hạn.");
    }
  }
  return warnings;
}

export function computePriorityBonus(awards: UetAward[] | undefined, programCode: UetProgramCode, usedMethod1?: boolean): number {
  if (usedMethod1) return 0;
  const bonus = computeMethod1Bonus(awards, programCode);
  return roundHalfUp(Math.min(bonus, MAX_COMPONENT_BONUS), 2);
}

export function normalizeScore(score: number): number {
  return roundHalfUp(score, uetSpec.summary.roundingDecimalPlaces);
}
