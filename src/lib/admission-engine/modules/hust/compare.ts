import type { AdmissionMethod } from "../../core/types";

export type HustScoreComparisonStatus =
  | "above"
  | "equal"
  | "below"
  | "missing_cutoff"
  | "eligible"
  | "not_eligible"
  | "insufficient_data";

export type HustScoreComparisonResult = {
  schoolCode: "HUST";
  year: number;
  benchmarkYear: number;
  programCode: string;
  method: AdmissionMethod;
  combinationCode?: string;
  score: number | null;
  previousYearCutoff: number | null;
  difference: number | null;
  status: HustScoreComparisonStatus;
  message: string;
  details?: Record<string, unknown>;
};

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function compareHustScoreWithPreviousCutoff({
  year,
  programCode,
  method,
  combinationCode,
  score,
  previousYearCutoff,
  benchmarkYear = year - 1,
}: {
  year: number;
  benchmarkYear?: number;
  programCode: string;
  method: AdmissionMethod;
  combinationCode?: string;
  score: number | null;
  previousYearCutoff: number | null;
}): HustScoreComparisonResult {
  if (score === null || !Number.isFinite(score)) {
    return {
      schoolCode: "HUST",
      year,
      benchmarkYear,
      programCode,
      method,
      combinationCode,
      score: null,
      previousYearCutoff,
      difference: null,
      status: "insufficient_data",
      message: "ZPath chưa đủ dữ liệu để so sánh điểm xét tuyển.",
    };
  }

  if (previousYearCutoff === null || !Number.isFinite(previousYearCutoff)) {
    return {
      schoolCode: "HUST",
      year,
      benchmarkYear,
      programCode,
      method,
      combinationCode,
      score,
      previousYearCutoff: null,
      difference: null,
      status: "missing_cutoff",
      message:
        `ZPath chưa có điểm chuẩn ${benchmarkYear} cho ngành/phương thức này, nên chỉ hiển thị điểm tính được.`,
    };
  }

  const difference = roundScore(score - previousYearCutoff);
  const status =
    difference > 0 ? "above" : difference < 0 ? "below" : "equal";

  return {
    schoolCode: "HUST",
    year,
    benchmarkYear,
    programCode,
    method,
    combinationCode,
    score,
    previousYearCutoff,
    difference,
    status,
  message:
      status === "above"
        ? `Cao hơn điểm chuẩn ${benchmarkYear}`
        : status === "below"
          ? `Thấp hơn điểm chuẩn ${benchmarkYear}`
          : `Bằng điểm chuẩn ${benchmarkYear}`,
  };
}
