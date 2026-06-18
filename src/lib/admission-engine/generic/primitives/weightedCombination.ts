import type { GenericWeightedTerm } from "../config-schema";
import { applyMaxOfInputs } from "./maxOfInputs";

export type WeightedCombinationResult = {
  score: number;
  breakdown: Array<{ inputKey: string; weight: number; value: number; weighted: number }>;
};

function resolveTermValue(
  term: GenericWeightedTerm,
  scores: Map<string, number>,
): number {
  if (term.maxOfInputKeys?.length) {
    return applyMaxOfInputs(term.maxOfInputKeys, scores);
  }
  return scores.get(term.inputKey) ?? 0;
}

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
    const value = resolveTermValue(term, scores);
    const weighted = value * term.weight;
    return { inputKey: term.inputKey, weight: term.weight, value, weighted };
  });

  const score = breakdown.reduce((sum, term) => sum + term.weighted, 0);

  return { score, breakdown };
}
