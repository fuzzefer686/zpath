import { HighSchoolScores, CandidateProfile, calculateNeuPriorityScore } from "./types";
import { convertCertificateToNeuScore } from "./language-certificate";

/**
 * Calculates the NEU THPT admission score (out of 30) for 2026.
 * It automatically handles two admission paths:
 * 1. PTXT4: Combined THPT + International English Certificate
 * 2. PTXT5: Pure THPT Exam Scores (with National Prize bonus)
 * 
 * Max score is capped at 30.00 and rounded to 2 decimal places.
 * 
 * @param scores High school exam scores.
 * @param profile Candidate profile (region, target priority, certificate, etc.).
 * @param combination The chosen subject combination (A00, A01, D01, D07).
 * @returns The final admission score out of 30.
 */
export function calculateNeuThptScore(
  scores: HighSchoolScores,
  profile: CandidateProfile,
  combination: "A00" | "A01" | "D01" | "D07"
): number {
  const certScore = profile.certificate ? convertCertificateToNeuScore(profile.certificate) : 0;
  
  // 1. Calculate scoreCombined (PTXT4 path)
  let scoreCombined = 0;
  if (certScore > 0) {
    const mathScore = scores.toán;
    let otherSubjectScore = 0;

    switch (combination) {
      case "A00":
        otherSubjectScore = Math.max(scores.lý, scores.hóa);
        break;
      case "A01":
        otherSubjectScore = scores.lý;
        break;
      case "D01":
        otherSubjectScore = scores.văn;
        break;
      case "D07":
        otherSubjectScore = scores.hóa;
        break;
    }

    const total3SubjectsCombined = certScore + mathScore + otherSubjectScore;
    const priorityScoreCombined = calculateNeuPriorityScore(total3SubjectsCombined, profile);
    scoreCombined = total3SubjectsCombined + priorityScoreCombined;
  }

  // 2. Calculate scorePure (PTXT5 path)
  let total3SubjectsPure = 0;
  switch (combination) {
    case "A00":
      total3SubjectsPure = scores.toán + scores.lý + scores.hóa;
      break;
    case "A01":
      total3SubjectsPure = scores.toán + scores.lý + scores.anh;
      break;
    case "D01":
      total3SubjectsPure = scores.toán + scores.văn + scores.anh;
      break;
    case "D07":
      total3SubjectsPure = scores.toán + scores.hóa + scores.anh;
      break;
  }

  let bonusScore = 0;
  if (profile.uuTienXetTuyen === "GiaiNhat") {
    bonusScore = 1.5;
  } else if (profile.uuTienXetTuyen === "GiaiNhi") {
    bonusScore = 1.0;
  } else if (profile.uuTienXetTuyen === "GiaiBa") {
    bonusScore = 0.5;
  }

  const priorityScorePure = calculateNeuPriorityScore(total3SubjectsPure, profile);
  const scorePure = total3SubjectsPure + priorityScorePure + bonusScore;

  // 3. Select maximum, capped at 30.00
  let finalScore = Math.max(scoreCombined, scorePure);
  if (finalScore > 30) {
    finalScore = 30;
  }

  // Round to 2 decimal places
  return Math.round((finalScore + Number.EPSILON) * 100) / 100;
}
