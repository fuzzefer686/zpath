import {
  convertCertificateToScore10,
  type FtuConversionResult,
} from "@/src/lib/admission-data/ftu-conversions-2026";
import {
  applyFtuPriority,
  computeFtuBonus30,
} from "@/src/lib/admission-data/ftu-priority-2026";
import {
  FTU_SUBJECT_LABELS,
  getFtuProgram2026,
  getFtuProgramCombination,
  type FtuAdmissionProgram2026,
  type FtuCombinationDefinition,
} from "@/src/lib/admission-data/ftu-programs-2026";

import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";
import type {
  FtuCombinationCode,
  FtuHocBaPayload,
  FtuPriorityInput,
  FtuSubjectKey,
  FtuSubjectScores,
} from "./ftu.types";

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function assertScoreInRange(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} phải là một số hợp lệ.`);
  }
  if (value < 0 || value > 10) {
    throw new Error(`${label} phải nằm trong khoảng 0 đến 10.`);
  }
  return value;
}

export function getFtuScaleForGroup(group: 1 | 2 | 3): 30 | 40 {
  return group === 1 ? 30 : 40;
}

type FtuParsedSubjectPayload = {
  program: FtuAdmissionProgram2026;
  combination: FtuCombinationDefinition;
  scores: FtuSubjectScores;
  useCertificate: boolean;
  certificateConversion: FtuConversionResult | null;
  priority?: FtuPriorityInput;
};

export function parseFtuSubjectPayload(payload: unknown): FtuParsedSubjectPayload {
  if (!isRecord(payload)) {
    throw new Error("Dữ liệu tính điểm không hợp lệ.");
  }

  if (typeof payload.programCode !== "string" || !payload.programCode.trim()) {
    throw new Error("Vui lòng chọn chương trình xét tuyển.");
  }

  const program = getFtuProgram2026(payload.programCode);
  if (!program) {
    throw new Error(`FTU chưa hỗ trợ chương trình ${payload.programCode}.`);
  }

  if (typeof payload.combinationCode !== "string" || !payload.combinationCode.trim()) {
    throw new Error("Vui lòng chọn tổ hợp xét tuyển.");
  }

  const combination = getFtuProgramCombination(
    payload.programCode,
    payload.combinationCode,
  );
  if (!combination) {
    throw new Error(
      `Chương trình ${payload.programCode} không hỗ trợ tổ hợp ${payload.combinationCode}.`,
    );
  }

  const useCertificate = payload.useCertificate === true;

  if (useCertificate && !combination.foreignLanguage) {
    throw new Error(
      `Tổ hợp ${combination.code} không có môn ngoại ngữ để kết hợp chứng chỉ ngoại ngữ quốc tế.`,
    );
  }

  if (!isRecord(payload.scores)) {
    throw new Error("Vui lòng nhập điểm các môn xét tuyển.");
  }
  const payloadScores = payload.scores;

  const requiredSubjects = getRequiredSubjects(combination, useCertificate);
  const scores: FtuSubjectScores = {};
  for (const subject of requiredSubjects) {
    const rawScore = payloadScores[subject];
    if (rawScore === null || rawScore === undefined) {
      throw new Error(`Vui lòng nhập điểm ${FTU_SUBJECT_LABELS[subject]}.`);
    }
    scores[subject] = assertScoreInRange(rawScore, `Điểm ${FTU_SUBJECT_LABELS[subject]}`);
  }

  let certificateConversion: FtuConversionResult | null = null;
  if (useCertificate) {
    if (!isRecord(payload.certificate)) {
      throw new Error("Vui lòng nhập thông tin chứng chỉ ngoại ngữ quốc tế.");
    }
    certificateConversion = convertCertificateToScore10(
      payload.certificate as Parameters<typeof convertCertificateToScore10>[0],
    );
    if (!certificateConversion) {
      throw new Error("Không tìm thấy mức quy đổi chứng chỉ ngoại ngữ phù hợp.");
    }
  }

  return {
    program,
    combination,
    scores,
    useCertificate,
    certificateConversion,
    priority: parsePriority(payload.priority),
  };
}

function parsePriority(value: unknown): FtuPriorityInput | undefined {
  if (!isRecord(value)) return undefined;
  return value as FtuPriorityInput;
}

// Môn cần nhập điểm. Ở chế độ kết hợp CCNNQT, môn ngoại ngữ được thay bằng chứng chỉ.
function getRequiredSubjects(
  combination: FtuCombinationDefinition,
  useCertificate: boolean,
): FtuSubjectKey[] {
  if (!useCertificate) return combination.subjects;
  return combination.subjects.filter(
    (subject) => subject !== combination.foreignLanguage,
  );
}

type FtuSubjectScoreBreakdown = {
  subjectScore: number;
  scale: 30 | 40;
  group: 1 | 2 | 3;
  components: Record<string, number>;
  formula: string;
};

export function computeFtuSubjectScore({
  program,
  combination,
  scores,
  certScore,
}: {
  program: FtuAdmissionProgram2026;
  combination: FtuCombinationDefinition;
  scores: FtuSubjectScores;
  certScore: number | null;
}): FtuSubjectScoreBreakdown {
  const group = program.formulaGroup;
  const scale = getFtuScaleForGroup(group);
  const math = scores.math ?? 0;

  if (group === 3) {
    const literature = scores.literature ?? 0;
    const m3 =
      certScore !== null ? certScore : scores[combination.foreignLanguage ?? "english"] ?? 0;
    const subjectScore = math + literature * 1.5 + m3 * 1.5;
    return {
      subjectScore,
      scale,
      group,
      components: { math, literature, m3 },
      formula: "M1 + M2*1.5 + M3*1.5",
    };
  }

  if (certScore !== null) {
    const m2Subject = combination.subjects.find(
      (subject) => subject !== "math" && subject !== combination.foreignLanguage,
    );
    const m2 = m2Subject ? scores[m2Subject] ?? 0 : 0;
    const subjectScore =
      group === 2 ? math * 2 + m2 + certScore : math + m2 + certScore;
    return {
      subjectScore,
      scale,
      group,
      components: { math, m2, m3: certScore },
      formula: group === 2 ? "M1*2 + M2 + M3" : "M1 + M2 + M3",
    };
  }

  const otherSubjects = combination.subjects.filter((subject) => subject !== "math");
  const otherTotal = otherSubjects.reduce(
    (total, subject) => total + (scores[subject] ?? 0),
    0,
  );
  const subjectScore = group === 2 ? math * 2 + otherTotal : math + otherTotal;
  return {
    subjectScore,
    scale,
    group,
    components: { math, otherTotal },
    formula: group === 2 ? "M1*2 + M2 + M3" : "M1 + M2 + M3",
  };
}

export function buildFtuSubjectResult({
  input,
  method,
  parsed,
  sourceLabel,
  warning,
}: {
  input: AdmissionInput;
  method: "HOC_BA" | "THPT";
  parsed: FtuParsedSubjectPayload;
  sourceLabel: string;
  warning: string;
}): AdmissionScoreResult {
  const certScore = parsed.certificateConversion?.score ?? null;
  const breakdown = computeFtuSubjectScore({
    program: parsed.program,
    combination: parsed.combination,
    scores: parsed.scores,
    certScore,
  });

  const bonus30 = computeFtuBonus30(parsed.priority);
  const priorityResult = applyFtuPriority({
    baseScore: breakdown.subjectScore,
    scale: breakdown.scale,
    bonus30,
    regionPriority30: parsed.priority?.regionPriority ?? 0,
    subjectPriority30: parsed.priority?.subjectPriority ?? 0,
  });

  const warnings = [warning];
  if (parsed.certificateConversion?.warnings) {
    warnings.push(...parsed.certificateConversion.warnings);
  }

  return {
    schoolCode: input.schoolCode,
    method,
    year: input.year,
    originalScore: round2(priorityResult.finalScore),
    originalScale: breakdown.scale,
    normalizedScore30: round2(priorityResult.normalizedScore30),
    targetScale: 30,
    formulaUsed: `FTU_${method}_GROUP${breakdown.group}_${breakdown.formula}`,
    details: {
      programCode: parsed.program.code,
      combinationCode: parsed.combination.code as FtuCombinationCode,
      formulaGroup: breakdown.group,
      formula: breakdown.formula,
      sourceLabel,
      subjectScores: parsed.scores,
      subjectScore: round2(breakdown.subjectScore),
      components: breakdown.components,
      useCertificate: parsed.useCertificate,
      certificate: parsed.certificateConversion
        ? {
            score: parsed.certificateConversion.score,
            matchedBand: parsed.certificateConversion.matchedBand,
          }
        : undefined,
      bonusApplied: round2(priorityResult.bonusApplied),
      priorityApplied: round2(priorityResult.priorityApplied),
      priorityBranch: priorityResult.branch,
    },
    warnings,
  };
}

// Re-export để các calculator dùng chung.
export type { FtuHocBaPayload };
