/**
 * Returns the maximum resolved score among the given input keys.
 * Used for combinations like K01 (max of science subjects).
 */
export function applyMaxOfInputs(
  inputKeys: string[],
  scores: Map<string, number>,
): number {
  if (!inputKeys.length) return 0;

  return Math.max(...inputKeys.map((key) => scores.get(key) ?? 0));
}
