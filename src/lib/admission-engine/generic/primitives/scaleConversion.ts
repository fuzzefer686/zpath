/**
 * Linearly rescales a score from one maximum scale to another.
 * Example: convertScale(75, 100, 30) === 22.5
 */
export function convertScale(
  score: number,
  fromScale: number,
  toScale: number,
): number {
  if (!Number.isFinite(score)) {
    throw new Error("score must be a finite number.");
  }
  if (!Number.isFinite(fromScale) || fromScale <= 0) {
    throw new Error("fromScale must be a positive number.");
  }
  if (!Number.isFinite(toScale) || toScale <= 0) {
    throw new Error("toScale must be a positive number.");
  }

  return (score / fromScale) * toScale;
}

/** Đánh giá tư duy (TSA) and similar 100-point exams normalized to 30. */
export function tsaScale(score: number, fromScale = 100): number {
  return convertScale(score, fromScale, 30);
}

/** SAT (1600) and similar large-scale exams normalized to 30. */
export function satScale(score: number, fromScale = 1600): number {
  return convertScale(score, fromScale, 30);
}
