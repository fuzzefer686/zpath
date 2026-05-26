import {
  getHustAdmissionProgram2026,
  getHustThptCombinationConfig,
  type HustSubjectKey,
  type HustThptCombinationCode,
  type HustThptCombinationConfig,
} from "@/src/lib/admission-data/hust-programs-2026";

import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";
import { convertLanguageCertificateToSubjectScore } from "./language-certificate";

type HustThptPayload = {
  programCode: string;
  combinationCode: HustThptCombinationCode;
  scores: Partial<Record<HustSubjectKey, number>>;
  priorityScore?: number;
  languageCertificate?: {
    certificateType: string;
    certificateScore: number;
  };
};

const SUBJECT_LABELS: Record<HustSubjectKey, string> = {
  math: "Toán",
  physics: "Vật lý",
  chemistry: "Hóa học",
  english: "Tiếng Anh",
  biology: "Sinh học",
  literature: "Ngữ văn",
  chinese: "Tiếng Trung",
  korean: "Tiếng Hàn",
  informatics: "Tin học",
};

function getThptWarning(schoolCode: string) {
  return `Kết quả chỉ mang tính tham khảo và cần đối chiếu với quy chế tuyển sinh ${schoolCode} theo từng năm.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertScoreInRange(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} phải là một số hợp lệ.`);
  }

  if (value < 0 || value > 10) {
    throw new Error(`${fieldName} phải nằm trong khoảng 0 đến 10.`);
  }

  return value;
}

function assertOptionalPriorityScore(value: unknown): number {
  if (value === undefined) return 0;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Điểm ưu tiên phải là một số hợp lệ.");
  }

  return value;
}

function parseHustThptPayload(payload: unknown): HustThptPayload {
  if (!isRecord(payload)) {
    throw new Error("Dữ liệu tính điểm THPT không hợp lệ.");
  }

  if (typeof payload.programCode !== "string" || !payload.programCode.trim()) {
    throw new Error("Vui lòng chọn chương trình xét tuyển.");
  }

  if (typeof payload.combinationCode !== "string" || !payload.combinationCode.trim()) {
    throw new Error("Vui lòng chọn tổ hợp xét tuyển.");
  }

  const program = getHustAdmissionProgram2026(payload.programCode);
  if (!program) {
    throw new Error(`HUST chưa hỗ trợ chương trình ${payload.programCode}.`);
  }

  const combinationConfig = getHustThptCombinationConfig(
    payload.programCode,
    payload.combinationCode,
  );
  if (!combinationConfig) {
    throw new Error(
      `Chương trình ${payload.programCode} không hỗ trợ tổ hợp ${payload.combinationCode}.`,
    );
  }

  if (!isRecord(payload.scores)) {
    throw new Error("Vui lòng nhập điểm các môn xét tuyển.");
  }
  const payloadScores = payload.scores;

  const scores: Partial<Record<HustSubjectKey, number>> = {};
  const languageCertificateScore = isRecord(payload.languageCertificate)
    ? convertLanguageCertificateToSubjectScore(
        String(payload.languageCertificate.certificateType ?? ""),
        Number(payload.languageCertificate.certificateScore),
      )
    : null;

  for (const subject of combinationConfig.subjects) {
    if (combinationConfig.formulaType === "K01" && !["math", "literature"].includes(subject)) {
      continue;
    }

    const rawScore =
      subject === "english" && payloadScores[subject] === undefined
        ? languageCertificateScore
        : payloadScores[subject];

    if (rawScore === null || rawScore === undefined) {
      throw new Error(`Vui lòng nhập điểm ${SUBJECT_LABELS[subject]}.`);
    }

    scores[subject] = assertScoreInRange(rawScore, `Điểm ${SUBJECT_LABELS[subject]}`);
  }

  if (combinationConfig.formulaType === "K01") {
    const optionalSubjects: HustSubjectKey[] = ["physics", "chemistry", "biology", "informatics"];
    let hasOptionalSubject = false;

    optionalSubjects.forEach((subject) => {
      if (payloadScores[subject] !== undefined) {
        scores[subject] = assertScoreInRange(
          payloadScores[subject],
          `Điểm ${SUBJECT_LABELS[subject]}`,
        );
        hasOptionalSubject = true;
      }
    });

    if (!hasOptionalSubject) {
      throw new Error("Tổ hợp K01 cần ít nhất một điểm Lý, Hóa, Sinh hoặc Tin học.");
    }
  }

  return {
    programCode: payload.programCode,
    combinationCode: payload.combinationCode as HustThptCombinationCode,
    scores,
    priorityScore: assertOptionalPriorityScore(payload.priorityScore),
    languageCertificate: isRecord(payload.languageCertificate)
      ? {
          certificateType: String(payload.languageCertificate.certificateType ?? ""),
          certificateScore: Number(payload.languageCertificate.certificateScore),
        }
      : undefined,
  };
}

function calculateK01(scores: Partial<Record<HustSubjectKey, number>>) {
  const bestScienceScore = Math.max(
    scores.physics ?? Number.NEGATIVE_INFINITY,
    scores.chemistry ?? Number.NEGATIVE_INFINITY,
    scores.biology ?? Number.NEGATIVE_INFINITY,
    scores.informatics ?? Number.NEGATIVE_INFINITY,
  );

  if (!Number.isFinite(bestScienceScore)) {
    throw new Error("Tổ hợp K01 cần ít nhất một điểm Lý, Hóa, Sinh hoặc Tin học.");
  }

  const mathScore = scores.math ?? 0;
  const literatureScore = scores.literature ?? 0;
  return {
    score: (mathScore * 3 + literatureScore + bestScienceScore * 2) / 2,
    bestScienceScore,
  };
}

export function calculateHustThptSubjectScore({
  combinationConfig,
  scores,
}: {
  combinationConfig: HustThptCombinationConfig;
  scores: Partial<Record<HustSubjectKey, number>>;
}) {
  if (combinationConfig.formulaType === "K01") {
    return calculateK01(scores);
  }

  if (combinationConfig.formulaType === "MATH_COEFFICIENT_2") {
    const otherSubjectTotal = combinationConfig.subjects.reduce((total, subject) => {
      return subject === "math" ? total : total + (scores[subject] ?? 0);
    }, 0);

    return {
      score: ((scores.math ?? 0) * 2 + otherSubjectTotal) * 3 / 4,
      bestScienceScore: undefined,
    };
  }

  return {
    score: combinationConfig.subjects.reduce((total, subject) => {
      return total + (scores[subject] ?? 0);
    }, 0),
    bestScienceScore: undefined,
  };
}

export function calculateHustThptScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const payload = parseHustThptPayload(input.payload);
  const combinationConfig = getHustThptCombinationConfig(
    payload.programCode,
    payload.combinationCode,
  );

  if (!combinationConfig) {
    throw new Error(
      `Chương trình ${payload.programCode} không hỗ trợ tổ hợp ${payload.combinationCode}.`,
    );
  }

  const { score: subjectScore, bestScienceScore } = calculateHustThptSubjectScore({
    combinationConfig,
    scores: payload.scores,
  });

  const priorityScore = payload.priorityScore ?? 0;
  const finalScore = subjectScore + priorityScore;

  return {
    schoolCode: input.schoolCode,
    method: "THPT",
    year: input.year,
    originalScore: finalScore,
    originalScale: 30,
    normalizedScore30: finalScore,
    targetScale: 30,
    formulaUsed: combinationConfig.formulaType,
    details: {
      programCode: payload.programCode,
      combinationCode: payload.combinationCode,
      subjects: combinationConfig.subjects,
      formulaType: combinationConfig.formulaType,
      mathCoefficient: combinationConfig.mathCoefficient,
      subjectScores: payload.scores,
      subjectScore,
      priorityScore,
      bestScienceScore,
      languageCertificate:
        payload.languageCertificate === undefined
          ? undefined
          : {
              ...payload.languageCertificate,
              conversion:
                "TODO: thêm bảng quy đổi chứng chỉ ngoại ngữ chính thức khi có dữ liệu.",
            },
    },
    warnings: [getThptWarning(input.schoolCode)],
  };
}
