import { CertificateInput } from "./types";

/**
 * Converts an international English certificate (IELTS, TOEFL, or TOEIC)
 * to NEU's 10-point admission scale according to the 2026 rules.
 * 
 * @param cert The certificate input details or undefined.
 * @returns The converted score on a 10-point scale, rounded to 2 decimal places.
 */
export function convertCertificateToNeuScore(cert: CertificateInput | undefined): number {
  if (!cert) {
    return 0;
  }

  let score = 0;

  switch (cert.type) {
    case "IELTS": {
      const band = cert.score;
      if (band >= 7.5) {
        score = 10;
      } else if (band >= 7.0) {
        score = 9.5;
      } else if (band >= 6.5) {
        score = 9.0;
      } else if (band >= 6.0) {
        score = 8.5;
      } else if (band >= 5.5) {
        score = 8.0;
      } else {
        score = 0;
      }
      break;
    }

    case "TOEFL": {
      const toeflScore = cert.score;
      if (toeflScore >= 102) {
        score = 10;
      } else if (toeflScore >= 94) {
        score = 9.5;
      } else if (toeflScore >= 79) {
        score = 9.0;
      } else if (toeflScore >= 60) {
        score = 8.5;
      } else if (toeflScore >= 46) {
        score = 8.0;
      } else {
        score = 0;
      }
      break;
    }

    case "TOEIC": {
      const lr = cert.score;
      const s = cert.speaking ?? 0;
      const w = cert.writing ?? 0;

      if (lr >= 965 && s >= 190 && w >= 190) {
        score = 10;
      } else if (lr >= 945 && s >= 180 && w >= 180) {
        score = 9.5;
      } else if (lr >= 890 && s >= 170 && w >= 170) {
        score = 9.0;
      } else if (lr >= 840 && s >= 160 && w >= 160) {
        score = 8.5;
      } else if (lr >= 785 && s >= 160 && w >= 150) {
        score = 8.0;
      } else {
        score = 0;
      }
      break;
    }
  }

  // Round to 2 decimal places
  return Math.round((score + Number.EPSILON) * 100) / 100;
}
