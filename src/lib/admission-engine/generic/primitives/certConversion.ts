import type { GenericCertificateLevel } from "../config-schema";

/**
 * Converts a certificate value (e.g. IELTS 7.0) into a subject score using a
 * conversion table. Picks the highest level whose `band` is <= the achieved
 * value. Returns null when the value does not reach the lowest band.
 *
 * `levels` is expected to be sorted ascending by band (validateAdmissionConfig
 * guarantees this), but we sort defensively to stay correct regardless.
 */
export function convertCertificate(
  levels: GenericCertificateLevel[],
  achievedBand: number,
): number | null {
  if (!Number.isFinite(achievedBand)) {
    throw new Error("achievedBand must be a finite number.");
  }

  const sorted = [...levels].sort((a, b) => a.band - b.band);
  let converted: number | null = null;

  for (const level of sorted) {
    if (achievedBand >= level.band) {
      converted = level.convertedScore;
    } else {
      break;
    }
  }

  return converted;
}
