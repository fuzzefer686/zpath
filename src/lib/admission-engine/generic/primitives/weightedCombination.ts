import type { GenericWeightedTerm } from "../config-schema";

export type WeightedCombinationResult = {
  score: number;
  breakdown: Array<{ inputKey: string; weight: number; value: number; weighted: number }>;
};

/**
 * Computes sum(value * weight) across terms. `scores` maps an input key to its
 * resolved numeric value. Missing values are treated as 0 (the caller is
 * responsible for enforcing required inputs before calling this).
 */
export function applyWeightedCombination(
  terms: GenericWeightedTerm[],
  scores: Map<string, number>,
): WeightedCombinationResult {
  const breakdown = terms.map((term) => {
    const value = scores.get(term.inputKey) ?? 0;
    const weighted = value * term.weight;
    return { inputKey: term.inputKey, weight: term.weight, value, weighted };
  });

  const score = breakdown.reduce((sum, term) => sum + term.weighted, 0);

  return { score, breakdown };
}
