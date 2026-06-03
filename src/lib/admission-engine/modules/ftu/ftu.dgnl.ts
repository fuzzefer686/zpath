import {
  convertALevelSubjectToScore10,
  convertCertificateToScore10,
  convertHsaToScale30,
  convertSatActToScale20,
  convertTsaToScale30,
  convertVactToScale30,
  scale30ToScale40,
  FTU_DGNL_THRESHOLDS,
  type FtuConversionResult,
} from "@/src/lib/admission-data/ftu-conversions-2026";
import {
  applyFtuPriority,
  computeFtuBonus30,
} from "@/src/lib/admission-data/ftu-priority-2026";
import {
  getFtuProgram2026,
  type FtuAdmissionProgram2026,
} from "@/src/lib/admission-data/ftu-programs-2026";

import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";
import { getFtuScaleForGroup, isRecord, round2 } from "./ftu.shared";
import type {
  FtuCertificatePayload,
  FtuDgnlTestType,
  FtuPriorityInput,
} from "./ftu.types";

const DGNL_WARNING =
  "Kết quả chỉ mang tính tham khảo, dựa trên bảng quy đổi điểm đánh giá năng lực/tư duy của FTU năm 2026.";

const DOMESTIC_TESTS: FtuDgnlTestType[] = ["HSA", "VACT", "TSA"];

const TEST_LABELS: Record<FtuDgnlTestType, string> = {
  HSA: "ĐGNL ĐHQG Hà Nội (HSA)",
  VACT: "ĐGNL ĐHQG TP.HCM (V-ACT)",
  TSA: "ĐGTD ĐH Bách khoa Hà Nội (TSA)",
  SAT: "SAT",
  ACT: "ACT",
  ALEVEL: "A-Level",
};

// Loại bài thi được phép theo nhóm công thức.
const ALLOWED_TESTS_BY_GROUP: Record<1 | 2 | 3, FtuDgnlTestType[]> = {
  1: ["HSA", "VACT", "SAT", "ACT", "ALEVEL"],
  2: ["HSA", "VACT", "TSA", "SAT", "ACT"],
  3: ["HSA", "SAT", "ACT", "ALEVEL"],
};

type FtuDgnlParsed = {
  program: FtuAdmissionProgram2026;
  testType: FtuDgnlTestType;
  testScore?: number;
  hsaSection?: "science" | "english";
  certificate?: FtuCertificatePayload;
  aLevelMath?: string;
  aLevelOther?: string;
  priority?: FtuPriorityInput;
};

function parseDgnlPayload(payload: unknown): FtuDgnlParsed {
  if (!isRecord(payload)) {
    throw new Error("Dữ liệu tính điểm ĐGNL không hợp lệ.");
  }

  if (typeof payload.programCode !== "string" || !payload.programCode.trim()) {
    throw new Error("Vui lòng chọn chương trình xét tuyển.");
  }
  const program = getFtuProgram2026(payload.programCode);
  if (!program) {
    throw new Error(`FTU chưa hỗ trợ chương trình ${payload.programCode}.`);
  }

  const testType = payload.testType as FtuDgnlTestType;
  if (!TEST_LABELS[testType]) {
    throw new Error("Loại bài thi ĐGNL/ĐGTD không hợp lệ.");
  }

  if (!ALLOWED_TESTS_BY_GROUP[program.formulaGroup].includes(testType)) {
    throw new Error(
      `Chương trình ${program.code} không xét tuyển bằng ${TEST_LABELS[testType]}.`,
    );
  }

  return {
    program,
    testType,
    testScore:
      typeof payload.testScore === "number" && Number.isFinite(payload.testScore)
        ? payload.testScore
        : undefined,
    hsaSection: payload.hsaSection === "english" ? "english" : payload.hsaSection === "science" ? "science" : undefined,
    certificate: isRecord(payload.certificate)
      ? (payload.certificate as FtuCertificatePayload)
      : undefined,
    aLevelMath: typeof payload.aLevelMath === "string" ? payload.aLevelMath : undefined,
    aLevelOther: typeof payload.aLevelOther === "string" ? payload.aLevelOther : undefined,
    priority: isRecord(payload.priority)
      ? (payload.priority as FtuPriorityInput)
      : undefined,
  };
}

function resolveCertificate(certificate?: FtuCertificatePayload): FtuConversionResult {
  if (!certificate) {
    throw new Error("Phương thức này yêu cầu chứng chỉ ngoại ngữ quốc tế (CCNNQT).");
  }
  const conversion = convertCertificateToScore10(certificate);
  if (!conversion) {
    throw new Error("Không tìm thấy mức quy đổi chứng chỉ ngoại ngữ phù hợp.");
  }
  return conversion;
}

type DomesticComputation = {
  baseScore: number;
  scale: 30 | 40;
  formula: string;
  details: Record<string, unknown>;
};

function computeDomestic(parsed: FtuDgnlParsed): DomesticComputation {
  const { program, testType, testScore } = parsed;
  const scale = getFtuScaleForGroup(program.formulaGroup);

  if (typeof testScore !== "number") {
    throw new Error("Vui lòng nhập điểm bài thi.");
  }

  let base30: number;
  if (testType === "HSA") {
    if (testScore < FTU_DGNL_THRESHOLDS.HSA) {
      throw new Error(`Điểm HSA phải đạt từ ${FTU_DGNL_THRESHOLDS.HSA}/150 trở lên.`);
    }
    if (program.formulaGroup === 3 && parsed.hsaSection !== "english") {
      throw new Error(
        "Chương trình tích hợp Ngôn ngữ thương mại chỉ xét HSA với Phần 3 - Tiếng Anh.",
      );
    }
    base30 = convertHsaToScale30(testScore);
  } else if (testType === "VACT") {
    if (testScore < FTU_DGNL_THRESHOLDS.VACT) {
      throw new Error(`Điểm V-ACT phải đạt từ ${FTU_DGNL_THRESHOLDS.VACT}/1200 trở lên.`);
    }
    base30 = convertVactToScale30(testScore);
  } else {
    // TSA
    if (testScore < FTU_DGNL_THRESHOLDS.TSA) {
      throw new Error(`Điểm TSA phải đạt từ ${FTU_DGNL_THRESHOLDS.TSA}/100 trở lên.`);
    }
    base30 = convertTsaToScale30(testScore);
  }

  const baseScore = scale === 40 ? scale30ToScale40(base30) : base30;
  return {
    baseScore,
    scale,
    formula:
      scale === 40
        ? `FTU_DGNL_${testType}_TO_SCALE40`
        : `FTU_DGNL_${testType}_TO_SCALE30`,
    details: {
      testScore,
      convertedScale30: round2(base30),
      hsaSection: parsed.hsaSection,
    },
  };
}

function computeInternational(parsed: FtuDgnlParsed): DomesticComputation {
  const { program, testType } = parsed;
  const group = program.formulaGroup;
  const scale = getFtuScaleForGroup(group);

  if (testType === "SAT" || testType === "ACT") {
    const sat = testType === "SAT" ? parsed.testScore : undefined;
    const act = testType === "ACT" ? parsed.testScore : undefined;
    const m1 = convertSatActToScale20({ sat, act });
    if (!m1) {
      throw new Error(
        testType === "SAT"
          ? "Điểm SAT phải đạt từ 1380 trở lên."
          : "Điểm ACT phải đạt từ 30 trở lên.",
      );
    }
    const m2 = resolveCertificate(parsed.certificate);

    let baseScore: number;
    let formula: string;
    if (group === 2) {
      baseScore = (m1.score + m2.score) * (4 / 3);
      formula = "(M1 + M2)*4/3";
    } else if (group === 3) {
      baseScore = m1.score + m2.score * 2;
      formula = "M1 + M2*2";
    } else {
      baseScore = m1.score + m2.score;
      formula = "M1 + M2";
    }

    return {
      baseScore,
      scale,
      formula: `FTU_DGNL_${testType}_${formula}`,
      details: {
        m1: { score: m1.score, matchedBand: m1.matchedBand },
        m2: { score: m2.score, matchedBand: m2.matchedBand },
        certificateWarnings: m2.warnings,
      },
    };
  }

  // A-Level
  if (group === 2) {
    throw new Error(
      "Chương trình tích hợp Khoa học máy tính/AI/Khoa học dữ liệu không xét tuyển bằng A-Level.",
    );
  }
  if (!parsed.aLevelMath || !parsed.aLevelOther) {
    throw new Error("Vui lòng nhập điểm môn Toán và một môn khác trong chứng chỉ A-Level.");
  }
  const m1 = convertALevelSubjectToScore10(parsed.aLevelMath);
  if (!m1 || m1.score < 9.0) {
    throw new Error("Môn Toán (Mathematics) trong A-Level phải đạt từ điểm A trở lên.");
  }
  const m2 = convertALevelSubjectToScore10(parsed.aLevelOther);
  if (!m2) {
    throw new Error("Điểm môn A-Level thứ hai không hợp lệ.");
  }
  const m3 = resolveCertificate(parsed.certificate);

  let baseScore: number;
  let formula: string;
  if (group === 3) {
    baseScore = m1.score + m2.score + m3.score * 2;
    formula = "M1 + M2 + M3*2";
  } else {
    baseScore = m1.score + m2.score + m3.score;
    formula = "M1 + M2 + M3";
  }

  return {
    baseScore,
    scale,
    formula: `FTU_DGNL_ALEVEL_${formula}`,
    details: {
      m1: { score: m1.score, matchedBand: m1.matchedBand },
      m2: { score: m2.score, matchedBand: m2.matchedBand },
      m3: { score: m3.score, matchedBand: m3.matchedBand },
      certificateWarnings: m3.warnings,
    },
  };
}

export function calculateFtuDgnlScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const parsed = parseDgnlPayload(input.payload);
  const computation = DOMESTIC_TESTS.includes(parsed.testType)
    ? computeDomestic(parsed)
    : computeInternational(parsed);

  const bonus30 = computeFtuBonus30(parsed.priority);
  const priorityResult = applyFtuPriority({
    baseScore: Math.min(computation.baseScore, computation.scale),
    scale: computation.scale,
    bonus30,
    regionPriority30: parsed.priority?.regionPriority ?? 0,
    subjectPriority30: parsed.priority?.subjectPriority ?? 0,
  });

  const warnings = [DGNL_WARNING];
  const certificateWarnings = computation.details.certificateWarnings;
  if (Array.isArray(certificateWarnings)) {
    warnings.push(...(certificateWarnings as string[]));
  }

  return {
    schoolCode: input.schoolCode,
    method: "DGNL",
    year: input.year,
    originalScore: round2(priorityResult.finalScore),
    originalScale: computation.scale,
    normalizedScore30: round2(priorityResult.normalizedScore30),
    targetScale: 30,
    formulaUsed: computation.formula,
    details: {
      programCode: parsed.program.code,
      formulaGroup: parsed.program.formulaGroup,
      testType: parsed.testType,
      testLabel: TEST_LABELS[parsed.testType],
      baseScore: round2(computation.baseScore),
      bonusApplied: round2(priorityResult.bonusApplied),
      priorityApplied: round2(priorityResult.priorityApplied),
      priorityBranch: priorityResult.branch,
      ...computation.details,
    },
    warnings,
  };
}
