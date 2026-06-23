/**
 * Clamps a score to [min, max] when bounds are provided.
 */
export function clampScore(
  score: number,
  min?: number,
  max?: number,
): number {
  let result = score;
  if (min !== undefined && Number.isFinite(min)) {
    result = Math.max(result, min);
  }
  if (max !== undefined && Number.isFinite(max)) {
    result = Math.min(result, max);
  }
  return result;
}
