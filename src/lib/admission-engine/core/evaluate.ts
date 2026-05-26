export type AdmissionChanceLevel =
  | "VERY_HIGH"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "VERY_LOW";

export type AdmissionChanceEvaluation = {
  level: AdmissionChanceLevel;
  label: string;
  diff: number;
  message: string;
};

function roundDiff(diff: number) {
  return Math.round(diff * 100) / 100;
}

export function evaluateAdmissionChance(
  userScore30: number,
  benchmark30: number,
): AdmissionChanceEvaluation {
  if (!Number.isFinite(userScore30)) {
    throw new Error("userScore30 must be a finite number.");
  }

  if (!Number.isFinite(benchmark30)) {
    throw new Error("benchmark30 must be a finite number.");
  }

  const diff = roundDiff(userScore30 - benchmark30);

  if (diff >= 2) {
    return {
      level: "VERY_HIGH",
      label: "Rất cao",
      diff,
      message: "Điểm của bạn cao hơn mốc tham chiếu rõ rệt.",
    };
  }

  if (diff >= 1) {
    return {
      level: "HIGH",
      label: "Cao",
      diff,
      message: "Điểm của bạn đang cao hơn mốc tham chiếu.",
    };
  }

  if (diff >= -0.5) {
    return {
      level: "MEDIUM",
      label: "Trung bình",
      diff,
      message: "Điểm của bạn đang ở gần mốc tham chiếu.",
    };
  }

  if (diff >= -1.5) {
    return {
      level: "LOW",
      label: "Thấp",
      diff,
      message: "Điểm của bạn thấp hơn mốc tham chiếu, cần phương án dự phòng.",
    };
  }

  return {
    level: "VERY_LOW",
    label: "Rất thấp",
    diff,
    message: "Điểm của bạn thấp hơn mốc tham chiếu đáng kể.",
  };
}
