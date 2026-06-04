import { CompetencyScores, CandidateProfile, calculateNeuPriorityScore } from "./types";
import { convertCertificateToNeuScore } from "./language-certificate";

/**
 * Calculates the NEU Competency Assessment admission score (out of 30) for 2026.
 * Supports HSA, V-ACT, and TSA tests, and automatically handles:
 * 1. PTXT3: Combined Competency + International English Certificate
 * 2. PTXT2: Pure Competency score
 * 
 * Max score is capped at 30.00 and rounded to 2 decimal places.
 * 
 * @param compScores Candidate's competency exam scores (HSA, V-ACT, TSA).
 * @param profile Candidate profile (region, certificate, etc.).
 * @param type The competency exam type used ("HSA" | "VACT" | "TSA").
 * @returns The final scaled admission score out of 30.
 */
export function calculateNeuDgnlScore(
  compScores: CompetencyScores,
  profile: CandidateProfile,
  type: "HSA" | "VACT" | "TSA"
): number {
  let score_30 = 0;

  switch (type) {
    case "HSA":
      score_30 = ((compScores.hsa ?? 0) * 30) / 150;
      break;
    case "VACT":
      score_30 = ((compScores.vact ?? 0) * 30) / 1200;
      break;
    case "TSA":
      score_30 = ((compScores.tsa ?? 0) * 30) / 100;
      break;
  }

  const certScore = profile.certificate ? convertCertificateToNeuScore(profile.certificate) : 0;
  
  let finalScore = 0;

  // CASE 1: Combined Competency + Certificate (PTXT3)
  if (certScore > 0) {
    const baseScore = ((certScore * 2) + score_30) * 3 / 4;
    const priorityScore = calculateNeuPriorityScore(baseScore, profile);
    finalScore = baseScore + priorityScore;
  } 
  // CASE 2: Pure Competency (PTXT2)
  else {
    const priorityScore = calculateNeuPriorityScore(score_30, profile);
    finalScore = score_30 + priorityScore;
  }

  // Enforce a maximum cap of 30.00
  if (finalScore > 30) {
    finalScore = 30;
  }

  // Round to 2 decimal places
  return Math.round((finalScore + Number.EPSILON) * 100) / 100;
}
