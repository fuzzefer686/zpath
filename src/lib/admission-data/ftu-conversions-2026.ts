import type {
  FtuCertificatePayload,
  FtuEnglishCertType,
  FtuOtherLanguageCertPayload,
} from "@/src/lib/admission-engine/modules/ftu/ftu.types";

// Các bảng quy đổi FTU 2026 (Phụ lục 2 & 3, QĐ 1566/QĐ-ĐHNT).

export type FtuConversionResult = {
  score: number;
  matchedBand: string;
  warnings?: string[];
};

type CertBand = {
  // Ngưỡng tối thiểu của chứng chỉ để đạt mức quy đổi.
  min: number;
  // Điểm môn quy đổi (thang 10).
  score: number;
  label: string;
};

// --- (1) Chứng chỉ tiếng Anh -> điểm môn thang 10 (Phụ lục 3, Bảng 1) ---
const ENGLISH_BANDS: Record<FtuEnglishCertType, CertBand[]> = {
  IELTS: [
    { min: 8.0, score: 10, label: "IELTS 8.0-9.0" },
    { min: 7.5, score: 9.5, label: "IELTS 7.5" },
    { min: 7.0, score: 9.0, label: "IELTS 7.0" },
    { min: 6.5, score: 8.5, label: "IELTS 6.5" },
    { min: 6.0, score: 7.5, label: "IELTS 6.0" },
    { min: 5.0, score: 6.5, label: "IELTS 5.0-5.5" },
    { min: 4.0, score: 5.0, label: "IELTS 4.0-4.5" },
  ],
  TOEFL_IBT: [
    { min: 110, score: 10, label: "TOEFL iBT 110-120" },
    { min: 102, score: 9.5, label: "TOEFL iBT 102-109" },
    { min: 93, score: 9.0, label: "TOEFL iBT 93-101" },
    { min: 79, score: 8.5, label: "TOEFL iBT 79-92" },
    { min: 60, score: 7.5, label: "TOEFL iBT 60-78" },
    { min: 51, score: 6.5, label: "TOEFL iBT 51-59" },
    { min: 45, score: 5.0, label: "TOEFL iBT 45-50" },
  ],
  CAMBRIDGE: [
    { min: 200, score: 10, label: "Cambridge 200-230" },
    { min: 192, score: 9.5, label: "Cambridge 192-199" },
    { min: 184, score: 9.0, label: "Cambridge 184-191" },
    { min: 180, score: 8.5, label: "Cambridge 180-183" },
    { min: 169, score: 7.5, label: "Cambridge 169-179" },
    { min: 154, score: 6.5, label: "Cambridge 154-168" },
    { min: 140, score: 5.0, label: "Cambridge 140-153" },
  ],
};

const ENGLISH_CERT_LABELS: Record<FtuEnglishCertType, string> = {
  IELTS: "IELTS (Academic)",
  TOEFL_IBT: "TOEFL iBT",
  CAMBRIDGE: "Cambridge English Scale",
};

export function convertEnglishCertToScore10({
  type,
  value,
}: {
  type: FtuEnglishCertType;
  value: number;
}): FtuConversionResult | null {
  if (!Number.isFinite(value)) return null;
  const band = ENGLISH_BANDS[type].find((item) => value >= item.min);
  if (!band) return null;

  const warnings: string[] = [];
  if (band.score < 8.5) {
    warnings.push(
      `Ngưỡng đảm bảo chất lượng tiếng Anh là IELTS Academic >= 6.5 (hoặc tương đương). ${ENGLISH_CERT_LABELS[type]} hiện ở mức quy đổi ${band.score}.`,
    );
  }

  return { score: band.score, matchedBand: band.label, warnings };
}

// --- (2) Chứng chỉ ngoại ngữ khác -> điểm môn thang 10 (Phụ lục 3, Bảng 2) ---
// Các mức 6.0-7.0 và 7.5-8.5 là khoảng; quy ước lấy cận dưới làm điểm quy đổi.
export function convertOtherLanguageCertToScore10(
  input: FtuOtherLanguageCertPayload,
): FtuConversionResult | null {
  switch (input.type) {
    case "JLPT": {
      if (input.level === "N1") return { score: 10, matchedBand: "JLPT N1" };
      if (input.level === "N2") return { score: 9.5, matchedBand: "JLPT N2" };
      const score = input.score;
      if (typeof score !== "number" || !Number.isFinite(score)) return null;
      if (score >= 130) return { score: 9.0, matchedBand: "JLPT N3 (>=130)" };
      if (score >= 115) {
        return {
          score: 7.5,
          matchedBand: "JLPT N3 (115-129)",
          warnings: ["Mức quy đổi nằm trong khoảng 7.5-8.5; quy ước lấy 7.5."],
        };
      }
      if (score >= 95) {
        return {
          score: 6.0,
          matchedBand: "JLPT N3 (95-114)",
          warnings: ["Mức quy đổi nằm trong khoảng 6.0-7.0; quy ước lấy 6.0."],
        };
      }
      return null;
    }
    case "EJU": {
      const score = input.score;
      if (typeof score !== "number" || !Number.isFinite(score)) return null;
      if (score >= 320) return { score: 10, matchedBand: "EJU 320-340" };
      if (score >= 270) return { score: 9.5, matchedBand: "EJU 270-319" };
      if (score >= 220) return { score: 9.0, matchedBand: "EJU 220-269" };
      if (score >= 190) {
        return {
          score: 7.5,
          matchedBand: "EJU 190-219",
          warnings: ["Mức quy đổi nằm trong khoảng 7.5-8.5; quy ước lấy 7.5."],
        };
      }
      if (score >= 160) {
        return {
          score: 6.0,
          matchedBand: "EJU 160-189",
          warnings: ["Mức quy đổi nằm trong khoảng 6.0-7.0; quy ước lấy 6.0."],
        };
      }
      return null;
    }
    case "HSK": {
      const hasHskk =
        typeof input.hskkScore === "number" && input.hskkScore >= 60;
      const warnings: string[] = [];
      if (!hasHskk) {
        warnings.push(
          "Cần chứng chỉ khẩu ngữ HSKK đạt từ 60/100 điểm trở lên (Trung cấp cho mức <=9.0, cao cấp cho mức >=9.5).",
        );
      }
      if (input.level === 6) {
        return { score: 10, matchedBand: "HSK6 + HSKK cao cấp (>=60)", warnings };
      }
      if (input.level === 5) {
        return { score: 9.5, matchedBand: "HSK5 + HSKK cao cấp (>=60)", warnings };
      }
      if (input.level === 4) {
        const score = input.score;
        if (typeof score === "number" && score >= 280) {
          return {
            score: 9.0,
            matchedBand: "HSK4 (>=280) + HSKK Trung cấp (>=60)",
            warnings,
          };
        }
        if (typeof score === "number" && score >= 180) {
          warnings.push("Mức quy đổi nằm trong khoảng 7.5-8.5; quy ước lấy 7.5.");
          return {
            score: 7.5,
            matchedBand: "HSK4 (180-279) + HSKK Trung cấp (>=60)",
            warnings,
          };
        }
        return null;
      }
      if (input.level === 3) {
        warnings.push("Mức quy đổi nằm trong khoảng 6.0-7.0; quy ước lấy 6.0.");
        return { score: 6.0, matchedBand: "HSK3 + HSKK Trung cấp (>=60)", warnings };
      }
      return null;
    }
    case "DELF_DALF": {
      switch (input.level) {
        case "DALF_C2":
          return { score: 10, matchedBand: "DALF C2" };
        case "DALF_C1":
          return { score: 9.5, matchedBand: "DALF C1" };
        case "DELF_B2":
          return { score: 9.0, matchedBand: "DELF B2" };
        case "DELF_B1": {
          const score = input.score;
          if (typeof score === "number" && score >= 81) {
            return {
              score: 7.5,
              matchedBand: "DELF B1 (81-100)",
              warnings: ["Mức quy đổi nằm trong khoảng 7.5-8.5; quy ước lấy 7.5."],
            };
          }
          if (typeof score === "number" && score >= 50) {
            return {
              score: 6.0,
              matchedBand: "DELF B1 (50-80)",
              warnings: ["Mức quy đổi nằm trong khoảng 6.0-7.0; quy ước lấy 6.0."],
            };
          }
          return null;
        }
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

// Quy đổi chứng chỉ ngoại ngữ tổng quát từ payload của engine.
export function convertCertificateToScore10(
  certificate: FtuCertificatePayload,
): FtuConversionResult | null {
  if (certificate.kind === "english") {
    return convertEnglishCertToScore10({
      type: certificate.type,
      value: certificate.value,
    });
  }
  return convertOtherLanguageCertToScore10(certificate);
}

// --- (3) SAT/ACT -> thang 20 (Phụ lục 3, Bảng 3) ---
type SatActBand = {
  satMin: number;
  actMin: number;
  score: number;
  label: string;
};

const SAT_ACT_BANDS: SatActBand[] = [
  { satMin: 1550, actMin: 36, score: 20.0, label: "SAT 1550-1600 / ACT 36" },
  { satMin: 1530, actMin: 35, score: 19.75, label: "SAT 1530-1540 / ACT 35" },
  { satMin: 1500, actMin: 34, score: 19.5, label: "SAT 1500-1520 / ACT 34" },
  { satMin: 1480, actMin: 33, score: 19.0, label: "SAT 1480-1490 / ACT 33" },
  { satMin: 1430, actMin: 32, score: 18.5, label: "SAT 1430-1470 / ACT 32" },
  { satMin: 1400, actMin: 31, score: 18.0, label: "SAT 1400-1420 / ACT 31" },
  { satMin: 1380, actMin: 30, score: 17.5, label: "SAT 1380-1390 / ACT 30" },
];

export function convertSatActToScale20({
  sat,
  act,
}: {
  sat?: number;
  act?: number;
}): FtuConversionResult | null {
  if (typeof sat === "number" && Number.isFinite(sat)) {
    const band = SAT_ACT_BANDS.find((item) => sat >= item.satMin);
    if (!band) return null;
    return { score: band.score, matchedBand: band.label };
  }
  if (typeof act === "number" && Number.isFinite(act)) {
    const band = SAT_ACT_BANDS.find((item) => act >= item.actMin);
    if (!band) return null;
    return { score: band.score, matchedBand: band.label };
  }
  return null;
}

// --- (4) Điểm môn A-Level -> thang 10 (Phụ lục 3, Bảng 4) ---
const A_LEVEL_SCORES: Record<string, number> = {
  "A*": 10.0,
  A: 9.0,
  B: 8.0,
  C: 7.5,
  D: 7.0,
  E: 6.5,
};

export function convertALevelSubjectToScore10(
  grade: string,
): FtuConversionResult | null {
  const normalized = grade.trim().toUpperCase();
  const score = A_LEVEL_SCORES[normalized];
  if (score === undefined) return null;
  return { score, matchedBand: `A-Level ${normalized}` };
}

// --- (5) Công thức ĐGNL/ĐGTD trong nước (mục 6.4.2.1) ---
export const FTU_DGNL_THRESHOLDS = {
  HSA: 100, // thang 150
  VACT: 850, // thang 1200
  TSA: 70, // thang 100
} as const;

export function convertHsaToScale30(hsa: number): number {
  return 27 + ((hsa - 100) * 3) / 50;
}

export function convertVactToScale30(vact: number): number {
  return 27 + ((vact - 850) * 3) / 350;
}

export function convertTsaToScale30(tsa: number): number {
  return 27 + ((tsa - 70) * 3) / 30;
}

// Quy đổi điểm thang 30 sang thang 40 cho các chương trình nhóm 2 & 3.
export function scale30ToScale40(score30: number): number {
  return (score30 * 4) / 3;
}
