import { CandidateProfile, calculateNeuPriorityScore } from "./types";

/**
 * Calculates the NEU SAT/ACT admission score (out of 30) for 2026.
 * (PTXT1 path).
 * 
 * Minimum requirements: SAT >= 1200 or ACT >= 26.
 * Returns 0 if requirements are not met.
 * Max score is capped at 30.00 and rounded to 2 decimal places.
 * 
 * @param type The type of exam used ("SAT" | "ACT").
 * @param score The raw SAT (max 1600) or ACT (max 36) score.
 * @param profile Candidate profile (region, target priority, etc.).
 * @returns The final scaled admission score out of 30.
 */
export function calculateNeuSatActScore(
  type: "SAT" | "ACT",
  score: number,
  profile: CandidateProfile
): number {
  // Check minimum requirements
  if (type === "SAT" && score < 1200) {
    return 0;
  }
  if (type === "ACT" && score < 26) {
    return 0;
  }

  let score_30 = 0;
  if (type === "SAT") {
    score_30 = (score * 30) / 1600;
  } else if (type === "ACT") {
    score_30 = (score * 30) / 36;
  }

  const priorityScore = calculateNeuPriorityScore(score_30, profile);
  let finalScore = score_30 + priorityScore;

  // Enforce a maximum cap of 30.00
  if (finalScore > 30) {
    finalScore = 30;
  }

  // Round to 2 decimal places
  return Math.round((finalScore + Number.EPSILON) * 100) / 100;
}
