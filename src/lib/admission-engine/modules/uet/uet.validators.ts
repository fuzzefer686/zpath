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

function assertScoreInRange(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} phải là số trong khoảng ${min}–${max}.`);
  }
}

function interpolateFromTable(score: number, table: Array<[number, number]>): number {
  const sorted = [...table].sort((a, b) => b[0] - a[0]);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  if (!highest || !lowest) throw new Error("Bảng quy đổi UET chưa được cấu hình.");
  if (score >= highest[0]) return highest[1];
  if (score <= lowest[0]) return lowest[1];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const upper = sorted[index];
    const lower = sorted[index + 1];
    if (!upper || !lower) continue;
    const [upperRaw, upperConverted] = upper;
    const [lowerRaw, lowerConverted] = lower;
    if (score <= upperRaw && score >= lowerRaw) {
      const ratio = (score - lowerRaw) / (upperRaw - lowerRaw);
      return lowerConverted + ratio * (upperConverted - lowerConverted);
    }
  }
  return lowest[1];
}

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
  if (payload.hsaScore !== undefined) {
    assertScoreInRange(payload.hsaScore, "hsaScore", 0, 130);
    if (!Number.isInteger(payload.hsaScore)) throw new Error("hsaScore phải là số nguyên.");
  }
  if (payload.satScore !== undefined) {
    assertScoreInRange(payload.satScore, "satScore", 400, 1600);
    if ((payload.satScore as number) % 10 !== 0) throw new Error("satScore phải có bước nhảy 10.");
  }
  if (payload.tsaScore !== undefined) {
    assertScoreInRange(payload.tsaScore, "tsaScore", 0, 100);
  }
  if (payload.thpt2025Score !== undefined) {
    assertScoreInRange(payload.thpt2025Score, "thpt2025Score", 0, 30);
  }
  if (payload.regionPriorityBonus !== undefined) {
    assertScoreInRange(payload.regionPriorityBonus, "regionPriorityBonus", 0, MAX_COMPONENT_BONUS);
  }
}

export function validateSubjectScores(app: UetApplication) {
  const scores = app.scores;
  if (!isRecord(scores)) throw new Error("Thiếu điểm các môn xét tuyển.");
  assertScoreInRange(scores.math, "Điểm Toán", 0, 10);
  assertScoreInRange(scores.physics, "Điểm Vật lý", 0, 10);
  const combination = getCombination(app.combinationCode);
  const requiredThirdSubject = combination.subjects[2];
  
  const subjectScoreKeyMap: Record<string, keyof UetApplication["scores"]> = {
    "Hóa": "chemistry",
    "Hóa học": "chemistry",
    "Anh": "english",
    "Tiếng Anh": "english",
    "Tin": "informatics",
    "Tin học": "informatics",
    "Sinh": "biology",
    "Sinh học": "biology",
  };
  
  const key = subjectScoreKeyMap[requiredThirdSubject];
  if (!key) {
    throw new Error(`Môn học thứ ba không hỗ trợ validate: ${requiredThirdSubject}`);
  }
  
  assertScoreInRange(scores[key], `Điểm ${requiredThirdSubject}`, 0, 10);
  return requiredThirdSubject;
}

export function validateUetApplicationPayload(payload: unknown, method?: string): UetApplication {
  if (!isRecord(payload)) throw new Error("UET payload không hợp lệ.");
  const record = payload as Record<string, unknown>;
  const { programCode, combinationCode, aspirationOrder } = record;
  if (typeof programCode !== "string" || typeof combinationCode !== "string") {
    throw new Error("Thiếu programCode hoặc combinationCode.");
  }
  if (typeof aspirationOrder !== "number" || !Number.isInteger(aspirationOrder) || aspirationOrder <= 0) {
    throw new Error("aspirationOrder phải là số nguyên dương.");
  }
  assertCombinationAllowed(programCode as UetProgramCode, combinationCode as UetCombinationCode);
  const app = payload as UetApplication;

  if (method) {
    switch (method) {
      case "THPT":
      case "METHOD_2_1":
        validateSubjectScores(app);
        if (app.certificate) {
          validateCertificate(app.certificate);
        }
        break;
      case "ĐGNL":
      case "DGNL":
      case "METHOD_2_2":
        if (app.hsaScore === undefined || app.hsaScore === null) {
          throw new Error("HSA score is required.");
        }
        assertScoreInRange(app.hsaScore, "hsaScore", 0, 130);
        if (!Number.isInteger(app.hsaScore)) {
          throw new Error("hsaScore phải là số nguyên.");
        }
        if (app.hsaYear !== undefined && app.hsaYear !== null) {
          if (app.hsaYear !== 2024 && app.hsaYear !== 2025) {
            throw new Error("Năm thi HSA phải là 2024 hoặc 2025.");
          }
        }
        break;
      case "CCQT":
      case "SAT":
      case "METHOD_2_3":
        if (app.satScore === undefined || app.satScore === null) {
          throw new Error("SAT score is required.");
        }
        assertScoreInRange(app.satScore, "satScore", 400, 1600);
        if (app.satScore % 10 !== 0) {
          throw new Error("satScore phải có bước nhảy 10.");
        }
        break;
      default:
        break;
    }
  }

  assertKnownMethodEligibility(record);
  return app;
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
    // ĐHQGHN KHÔNG xét cộng điểm HSG hệ Giáo dục thường xuyên cấp tỉnh (provincial / city)
    if (award.isGdtx && (award.level === "provincial" || award.level === "city")) {
      return false;
    }
    if (award.year < minAwardYear) return false;
    return awardAppliesToProgram(award.subject, programCode);
  });
}

export function getAwardScoreBonus(award: UetAward): number {
  if (award.isGdtx && award.level === "provincial") {
    return 0;
  }
  if (award.level === "national" || award.level === "international") {
    if (award.rank === "Nhất") return 3.0;
    if (award.rank === "Nhì") return 2.5;
    if (award.rank === "Ba") return 2.0;
    if (award.rank === "Khuyến khích") return 1.5;
  } else if (award.level === "provincial" || award.level === "city") {
    if (award.rank === "Nhất") return 2.0;
    if (award.rank === "Nhì") return 1.5;
    if (award.rank === "Ba") return 1.0;
    if (award.rank === "Khuyến khích") return 0.5;
  }
  return award.scoreBonus || 0;
}



export function computePriorityBonusFromAwards(awards: UetAward[] | undefined, programCode: UetProgramCode): number {
  const eligibleAwards = filterEligibleAwards(awards, programCode);
  const highestAward = Math.max(0, ...eligibleAwards.map((award) => getAwardScoreBonus(award)), 0);
  return roundHalfUp(Math.min(MAX_COMPONENT_BONUS, highestAward), 2);
}

export function convertHsa2025ToThpt(score: number): number {
  const table: Array<[number, number]> = [
    [130, 30.0], [129, 30.0], [128, 30.0], [127, 30.0], [126, 29.9], [125, 29.85], [124, 29.76], [123, 29.75], [122, 29.54], [121, 29.52], [120, 29.5], [119, 29.39], [118, 29.25], [117, 29.04], [116, 29.03], [115, 29.0], [114, 28.78], [113, 28.77], [112, 28.75], [111, 28.52], [110, 28.5], [109, 28.29], [108, 28.25], [107, 28.02], [106, 28.0], [105, 27.79], [104, 27.75], [103, 27.52], [102, 27.5], [101, 27.26], [100, 27.25], [99, 27.02], [98, 27.0], [97, 26.75], [96, 26.52], [95, 26.5], [94, 26.25], [93, 26.02], [92, 26.0], [91, 25.75], [90, 25.5], [89, 25.25], [88, 25.03], [87, 25.0], [86, 24.75], [85, 24.5], [84, 24.25], [83, 24.0], [82, 23.75], [81, 23.5], [80, 23.25], [79, 23.0], [78, 22.75], [77, 22.5], [76, 22.25], [75, 21.85], [74, 21.6], [73, 21.25], [72, 21.0], [71, 20.75], [70, 20.5], [69, 20.1], [68, 19.75], [67, 19.5], [66, 19.2], [65, 18.75]
  ];
  return roundHalfUp(Math.min(30, interpolateFromTable(score, table)), 2);
}

export function convertHsa2024ToThpt(score: number): number {
  const table: Array<[number, number]> = [
    [129, 29.27], [128, 29.21], [127, 29.12], [126, 29.03], [125, 28.94], [124, 28.85], [123, 28.76], [122, 28.67], [121, 28.58], [120, 28.49], [119, 28.4], [118, 28.31], [117, 28.22], [116, 28.13], [115, 28.04], [114, 27.95], [113, 27.9], [112, 27.85], [111, 27.8], [110, 27.75], [109, 27.7], [108, 27.65], [107, 27.52], [106, 27.38], [105, 27.25], [104, 27.14], [103, 27.03], [102, 26.93], [101, 26.82], [100, 26.71], [99, 26.60], [98, 26.47], [97, 26.34], [96, 26.21], [95, 26.08], [94, 25.95], [93, 25.81], [92, 25.67], [91, 25.53], [90, 25.38], [89, 25.24], [88, 25.10], [87, 24.95], [86, 24.80], [85, 24.65], [84, 24.50], [83, 24.35], [82, 24.12], [81, 23.88], [80, 23.65], [79, 23.48], [78, 23.30], [77, 23.13], [76, 22.95], [75, 22.68], [74, 22.42], [73, 22.15], [72, 21.93], [71, 21.70], [70, 21.48], [69, 21.25], [68, 21.00], [67, 20.75], [66, 20.50], [65, 20.25], [64, 19.95], [63, 19.65], [62, 19.35], [61, 19.05], [60, 18.75], [59, 18.53], [58, 18.32]
  ];
  return roundHalfUp(Math.min(30, interpolateFromTable(score, table)), 2);
}

export function convertHsaToThpt(score: number, year?: number): number {
  if (year === 2024) {
    return convertHsa2024ToThpt(score);
  }
  return convertHsa2025ToThpt(score);
}

export function validateCertificate(certificate: UetApplication["certificate"], currentDateISO = new Date().toISOString()): string[] {
  const warnings: string[] = [];
  if (!certificate) return warnings;
  if (!uetSpec.scoringRules.certificateValidation.allowedTypes.includes(certificate.type)) throw new Error(`Chứng chỉ ${certificate.type} không được chấp nhận.`);
  if (certificate.online) throw new Error("Chứng chỉ thi online tại nhà không được chấp nhận.");
  
  if (!certificate.skills) {
    throw new Error("Chứng chỉ tiếng Anh phải đủ 4 kỹ năng.");
  }
  const listening = certificate.skills.listening;
  const reading = certificate.skills.reading;
  const writing = certificate.skills.writing;
  const speaking = certificate.skills.speaking;
  if (
    listening === undefined || listening === null || !Number.isFinite(listening) ||
    reading === undefined || reading === null || !Number.isFinite(reading) ||
    writing === undefined || writing === null || !Number.isFinite(writing) ||
    speaking === undefined || speaking === null || !Number.isFinite(speaking)
  ) {
    throw new Error("Chứng chỉ tiếng Anh phải đủ 4 kỹ năng.");
  }
  
  const skillValues = [listening, reading, writing, speaking];
  if (skillValues.some((val) => val < uetSpec.scoringRules.certificateValidation.minScorePerSkill)) {
    throw new Error(`Mỗi kỹ năng chứng chỉ tiếng Anh phải đạt tối thiểu ${uetSpec.scoringRules.certificateValidation.minScorePerSkill}.0.`);
  }

  const currentDate = new Date(currentDateISO.slice(0, 10));

  if (certificate.expiryDate) {
    const expiryDate = new Date(certificate.expiryDate);
    if (expiryDate < currentDate) {
      throw new Error("Chứng chỉ tiếng Anh đã quá hạn.");
    }
  }

  if (certificate.testDate) {
    const testDate = new Date(certificate.testDate);
    const twoYearsInMs = 2 * 365.25 * 24 * 60 * 60 * 1000;
    if (currentDate.getTime() - testDate.getTime() > twoYearsInMs) {
      throw new Error("Chứng chỉ tiếng Anh đã quá hạn.");
    }
  }
  return warnings;
}

export function convertSatToThpt(score: number): number {
  const table: Array<[number, number]> = [
    [1600, 30.00],
    [1550, 29.50],
    [1500, 29.00],
    [1450, 28.50],
    [1400, 28.00],
    [1350, 27.50],
    [1300, 27.00],
    [1250, 26.50],
    [1200, 26.00],
    [1150, 25.50],
    [1100, 25.00],
    [1050, 24.50],
    [1000, 24.00],
    [950, 23.50],
    [900, 23.00],
    [850, 22.50],
    [800, 22.00],
    [750, 21.00],
    [700, 20.00],
  ];
  return roundHalfUp(Math.min(30, interpolateFromTable(score, table)), 2);
}

export function getRegionPriorityBonus(app: UetApplication): number {
  if (app.regionPriorityBonus !== undefined && app.regionPriorityBonus !== null) {
    return app.regionPriorityBonus;
  }
  if (app.regionCode) {
    return uetSpec.scoringRules.bonusPoints.regionPriority[app.regionCode] ?? 0;
  }
  return 0;
}

export function computeTotalPriorityBonus(app: UetApplication): number {
  // Region priority component cap: 1.5
  const regionBonus = Math.min(1.5, getRegionPriorityBonus(app));
  // Award priority component cap: 1.5
  const awardBonus = Math.min(1.5, computePriorityBonusFromAwards(app.awards, app.programCode));
  // Total priority cap: 3.0
  return roundHalfUp(Math.min(3.0, regionBonus + awardBonus), 2);
}



export function normalizeScore(score: number): number {
  return roundHalfUp(score, uetSpec.summary.roundingDecimalPlaces);
}
