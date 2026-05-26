import type { AdmissionInput, AdmissionScoreResult } from "../../core/types";

const TSA_WARNING =
  "Tạm thời dùng quy đổi tuyến tính từ thang 100 sang thang 30; cần thay bằng bảng quy đổi chính thức khi có dữ liệu.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseHustTsaScore(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("HUST TSA payload must be an object.");
  }

  const { tsaScore } = payload;

  if (typeof tsaScore !== "number" || !Number.isFinite(tsaScore)) {
    throw new Error("HUST TSA tsaScore must be a finite number.");
  }

  if (tsaScore < 0 || tsaScore > 100) {
    throw new Error("HUST TSA tsaScore must be between 0 and 100.");
  }

  return tsaScore;
}

export function calculateHustTsaScore(
  input: AdmissionInput,
): AdmissionScoreResult {
  const tsaScore = parseHustTsaScore(input.payload);
  const normalizedScore30 = (tsaScore / 100) * 30;

  return {
    schoolCode: input.schoolCode,
    method: "TSA",
    year: input.year,
    originalScore: tsaScore,
    originalScale: 100,
    normalizedScore30,
    targetScale: 30,
    formulaUsed: `${input.schoolCode}_TSA_LINEAR_100_TO_30`,
    details: {
      tsaScore,
      conversion: "tsaScore / 100 * 30",
    },
    warnings: [TSA_WARNING],
  };
}
