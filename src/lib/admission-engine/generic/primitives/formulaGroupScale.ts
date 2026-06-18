import type { GenericFormulaGroupEntry } from "../config-schema";
import { applyWeightedCombination } from "./weightedCombination";
import { convertScale } from "./scaleConversion";

export type FormulaGroupScaleResult = {
  score: number;
  scale: number;
  groupKey: string;
  breakdown: Array<{ inputKey: string; weight: number; value: number; weighted: number }>;
};

/**
 * Applies a formula group entry (weighted terms on a specific scale).
 */
export function applyFormulaGroupEntry(
  entry: GenericFormulaGroupEntry,
  scores: Map<string, number>,
): FormulaGroupScaleResult {
  const combination = applyWeightedCombination(entry.terms, scores);
  return {
    score: combination.score,
    scale: entry.scale,
    groupKey: entry.groupKey,
    breakdown: combination.breakdown,
  };
}

/**
 * Normalizes a group score to the 30-point scale.
 */
export function normalizeGroupScoreTo30(score: number, scale: number): number {
  return Math.min(convertScale(score, scale, 30), 30);
}
