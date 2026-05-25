import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";

type HustThptCombinationCode = "A00" | "A01" | "B00" | "D01" | "D07";

type HustThptSubject =
  | "math"
  | "physics"
  | "chemistry"
  | "english"
  | "biology"
  | "literature";

type HustThptPayload = {
  combinationCode: HustThptCombinationCode;
  scores: Partial<Record<HustThptSubject, number>>;
  priorityScore?: number;
};

function getThptWarning(schoolCode: string) {
  return `Kết quả chỉ mang tính tham khảo và cần đối chiếu với quy chế tuyển sinh ${schoolCode} theo từng năm.`;
}

const COMBINATION_SUBJECTS: Record<
  HustThptCombinationCode,
  [HustThptSubject, HustThptSubject, HustThptSubject]
> = {
  A00: ["math", "physics", "chemistry"],
  A01: ["math", "physics", "english"],
  B00: ["math", "chemistry", "biology"],
  D01: ["math", "literature", "english"],
  D07: ["math", "chemistry", "english"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isHustThptCombinationCode(
  value: unknown,
): value is HustThptCombinationCode {
  return (
    value === "A00" ||
    value === "A01" ||
    value === "B00" ||
    value === "D01" ||
    value === "D07"
  );
}

function assertScoreInRange(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }

  if (value < 0 || value > 10) {
    throw new Error(`${fieldName} must be between 0 and 10.`);
  }

  return value;
}

function parseHustThptPayload(payload: unknown): HustThptPayload {
  if (!isRecord(payload)) {
    throw new Error("HUST THPT payload must be an object.");
  }

  if (!isHustThptCombinationCode(payload.combinationCode)) {
    throw new Error(
      'HUST THPT combinationCode is required and must be one of: "A00", "A01", "B00", "D01", "D07".',
    );
  }

  if (!isRecord(payload.scores)) {
    throw new Error("HUST THPT scores must be an object.");
  }

  const requiredSubjects = COMBINATION_SUBJECTS[payload.combinationCode];
  const scores: Partial<Record<HustThptSubject, number>> = {};

  for (const subject of requiredSubjects) {
    if (!(subject in payload.scores)) {
      throw new Error(
        `HUST THPT score for required subject "${subject}" is missing.`,
      );
    }

    scores[subject] = assertScoreInRange(
      payload.scores[subject],
      `HUST THPT score "${subject}"`,
    );
  }

  let priorityScore = 0;
  if (payload.priorityScore !== undefined) {
    if (
      typeof payload.priorityScore !== "number" ||
      !Number.isFinite(payload.priorityScore)
    ) {
      throw new Error("HUST THPT priorityScore must be a finite number.");
    }

    priorityScore = payload.priorityScore;
  }

  return {
    combinationCode: payload.combinationCode,
    scores,
    priorityScore,
  };
}

export function calculateHustThptScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const payload = parseHustThptPayload(input.payload);
  const subjects = COMBINATION_SUBJECTS[payload.combinationCode];
  const subjectTotal = subjects.reduce((total, subject) => {
    return total + (payload.scores[subject] ?? 0);
  }, 0);
  const priorityScore = payload.priorityScore ?? 0;
  const finalScore = subjectTotal + priorityScore;

  return {
    schoolCode: input.schoolCode,
    method: "THPT",
    year: input.year,
    originalScore: finalScore,
    originalScale: 30,
    normalizedScore30: finalScore,
    targetScale: 30,
    formulaUsed: `${input.schoolCode}_THPT_${payload.combinationCode}`,
    details: {
      combinationCode: payload.combinationCode,
      subjects,
      subjectScores: payload.scores,
      subjectTotal,
      priorityScore,
    },
    warnings: [getThptWarning(input.schoolCode)],
  };
}
