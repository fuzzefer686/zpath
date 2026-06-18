export type ScoreComparisonStatus =
  | "above"
  | "equal"
  | "below"
  | "missing_cutoff"
  | "insufficient_data";

export type ScoreComparisonResult = {
  schoolCode: string;
  year: number;
  benchmarkYear: number;
  programCode: string;
  method: string;
  combinationCode?: string;
  score: number | null;
  previousYearCutoff: number | null;
  difference: number | null;
  status: ScoreComparisonStatus;
  message: string;
};

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Generic score comparison against a previous-year cutoff.
 * Extracted from HUST-specific logic for reuse in config-driven calculators.
 */
export function compareScoreWithCutoff({
  schoolCode,
  year,
  programCode,
  method,
  combinationCode,
  score,
  previousYearCutoff,
  benchmarkYear = year - 1,
}: {
  schoolCode: string;
  year: number;
  benchmarkYear?: number;
  programCode: string;
  method: string;
  combinationCode?: string;
  score: number | null;
  previousYearCutoff: number | null;
}): ScoreComparisonResult {
  if (score === null || !Number.isFinite(score)) {
    return {
      schoolCode,
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
      schoolCode,
      year,
      benchmarkYear,
      programCode,
      method,
      combinationCode,
      score,
      previousYearCutoff: null,
      difference: null,
      status: "missing_cutoff",
      message: `ZPath chưa có điểm chuẩn ${benchmarkYear} cho ngành/phương thức này, nên chỉ hiển thị điểm tính được.`,
    };
  }

  const difference = roundScore(score - previousYearCutoff);
  const status =
    difference > 0 ? "above" : difference < 0 ? "below" : "equal";

  return {
    schoolCode,
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
