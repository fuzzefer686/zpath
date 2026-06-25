/**
 * Shared formula primitives for the config-driven admission engine.
 *
 * These are the ONLY pieces of scoring logic that live in code. Every school
 * config is just a different composition of these primitives, so adding a new
 * school never requires touching this file. Adding a genuinely new kind of
 * formula (a new primitive) is the rare developer task that goes through Git.
 */

export {
  applyWeightedCombination,
  type WeightedCombinationResult,
} from "./weightedCombination";
export { convertScale, tsaScale, satScale } from "./scaleConversion";
export { convertCertificate } from "./certConversion";
export { applyPriorityAndBonus, type PriorityBonusResult } from "./priorityBonus";
