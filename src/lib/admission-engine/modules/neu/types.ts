export interface CertificateInput {
  type: "IELTS" | "TOEFL" | "TOEIC";
  score: number; // IELTS band, TOEFL score, or TOEIC Listening & Reading score
  speaking?: number; // TOEIC Speaking score
  writing?: number; // TOEIC Writing score
}

export interface HighSchoolScores {
  toán: number;
  văn: number;
  lý: number;
  hóa: number;
  anh: number;
}

export interface CompetencyScores {
  hsa?: number;
  vact?: number;
  tsa?: number;
}

export interface CandidateProfile {
  kv: "KV1" | "KV2NT" | "KV2" | "KV3";
  doiTuong: "UT1" | "UT2" | "NONE";
  uuTienXetTuyen?: "GiaiNhat" | "GiaiNhi" | "GiaiBa";
  certificate?: CertificateInput;
}

/**
 * Calculates the NEU 2026 priority score based on base priority (KV + DoiTuong)
 * and the MoET diminishing rule for total scores >= 22.5.
 * 
 * Formula:
 * If totalScore3Moni >= 22.5:
 *   Priority = ((30 - totalScore3Moni) / 7.5) * TotalBase
 * Else:
 *   Priority = TotalBase
 * 
 * @param totalScore3Moni The total score of the 3 subjects (out of 30) before priority.
 * @param profile The candidate profile containing regional (kv) and category (doiTuong) details.
 * @returns The rounded priority score to 2 decimal places.
 */
export function calculateNeuPriorityScore(
  totalScore3Moni: number,
  profile: CandidateProfile
): number {
  let kvPriority = 0;
  switch (profile.kv) {
    case "KV1":
      kvPriority = 0.75;
      break;
    case "KV2NT":
      kvPriority = 0.5;
      break;
    case "KV2":
      kvPriority = 0.25;
      break;
    case "KV3":
      kvPriority = 0;
      break;
  }

  let doiTuongPriority = 0;
  switch (profile.doiTuong) {
    case "UT1":
      doiTuongPriority = 2.0;
      break;
    case "UT2":
      doiTuongPriority = 1.0;
      break;
    case "NONE":
      doiTuongPriority = 0;
      break;
  }

  const totalBase = kvPriority + doiTuongPriority;

  let priority = totalBase;
  if (totalScore3Moni >= 22.5) {
    priority = ((30 - totalScore3Moni) / 7.5) * totalBase;
  }

  // Round to 2 decimal places
  return Math.round((priority + Number.EPSILON) * 100) / 100;
}
