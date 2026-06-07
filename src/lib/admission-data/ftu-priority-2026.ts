import type {
  FtuAwardType,
  FtuPriorityInput,
} from "@/src/lib/admission-engine/modules/ftu/ftu.types";

// Điểm ưu tiên & điểm thưởng FTU 2026 (Phụ lục 2, QĐ 1566/QĐ-ĐHNT).

// Điểm thưởng theo loại giải, tính trên thang 30.
export const FTU_AWARD_BONUS_30: Record<FtuAwardType, number> = {
  OLYMPIC_INTL: 3,
  NATIONAL_FIRST: 3,
  NATIONAL_SECOND: 2,
  NATIONAL_THIRD: 1.5,
  NATIONAL_CONSOLATION: 1,
  NATIONAL_TEAM: 0.5,
  SCIENCE_INTL: 3,
  SCIENCE_NATIONAL_FIRST: 2,
  SCIENCE_NATIONAL_SECOND: 1.5,
  SCIENCE_NATIONAL_THIRD: 1,
  SCIENCE_NATIONAL_FOURTH: 0.5,
};

export const FTU_AWARD_LABELS: Record<FtuAwardType, string> = {
  OLYMPIC_INTL: "Tham gia/đạt giải Olympic quốc tế",
  NATIONAL_FIRST: "Giải Nhất HSG cấp quốc gia",
  NATIONAL_SECOND: "Giải Nhì HSG cấp quốc gia",
  NATIONAL_THIRD: "Giải Ba HSG cấp quốc gia",
  NATIONAL_CONSOLATION: "Giải Khuyến khích HSG cấp quốc gia",
  NATIONAL_TEAM: "Tham gia Đội tuyển HSG cấp quốc gia",
  SCIENCE_INTL: "Tham gia/đạt giải KHKT cấp quốc tế",
  SCIENCE_NATIONAL_FIRST: "Giải Nhất KHKT cấp quốc gia",
  SCIENCE_NATIONAL_SECOND: "Giải Nhì KHKT cấp quốc gia",
  SCIENCE_NATIONAL_THIRD: "Giải Ba KHKT cấp quốc gia",
  SCIENCE_NATIONAL_FOURTH: "Giải Tư KHKT cấp quốc gia",
};

// Điểm thưởng tối đa = 10% thang điểm (tối đa 3 điểm trên thang 30).
export const FTU_MAX_BONUS_30 = 3;

// Mức điểm ưu tiên khu vực theo Quy chế tuyển sinh ĐH 2026 (thang 30).
export const FTU_REGION_PRIORITY_30 = {
  KV1: 0.75,
  "KV2-NT": 0.5,
  KV2: 0.25,
  KV3: 0,
} as const;

// Mức điểm ưu tiên đối tượng theo Quy chế tuyển sinh ĐH 2026 (thang 30).
export const FTU_OBJECT_PRIORITY_30 = {
  // Nhóm ưu tiên 1 (đối tượng 01-04).
  UT1: 2.0,
  // Nhóm ưu tiên 2 (đối tượng 05-07).
  UT2: 1.0,
  NONE: 0,
} as const;

// Tính điểm thưởng từ danh sách giải (chọn giải cao nhất, không cộng dồn).
export function computeFtuBonus30(priority?: FtuPriorityInput): number {
  if (!priority) return 0;

  const awardBonus = (priority.awards ?? []).reduce((max, award) => {
    const value = FTU_AWARD_BONUS_30[award] ?? 0;
    return Math.max(max, value);
  }, 0);

  const manualBonus =
    typeof priority.bonusScore === "number" && Number.isFinite(priority.bonusScore)
      ? Math.max(priority.bonusScore, 0)
      : 0;

  return Math.min(Math.max(awardBonus, manualBonus), FTU_MAX_BONUS_30);
}

export type FtuPriorityResult = {
  // Điểm xét tuyển cuối cùng theo thang gốc (30 hoặc 40).
  finalScore: number;
  // Điểm quy đổi về thang 30 để so sánh cơ hội.
  normalizedScore30: number;
  baseScore: number;
  bonusApplied: number;
  priorityApplied: number;
  scale: 30 | 40;
  // TH1: đủ điểm trần (>= scale) nên không cộng ưu tiên; TH2: cộng ưu tiên quy đổi.
  branch: "TH1_NO_PRIORITY" | "TH2_CONVERTED_PRIORITY";
};

function clampMin(value: number, min: number): number {
  return Math.max(value, min);
}

/**
 * Áp dụng điểm thưởng và điểm ưu tiên theo nguyên tắc Phụ lục 2:
 * - Cộng điểm thưởng trước, sau đó cộng điểm ưu tiên.
 * - TH1: nếu (điểm 3 môn + thưởng) >= thang điểm -> không cộng ưu tiên, trần tại thang điểm.
 * - TH2: nếu nhỏ hơn -> ưu tiên quy đổi = ((scale - (base+bonus)) / (scale/4)) * (đối tượng + khu vực).
 * Với chương trình thang 40, điểm thưởng/ưu tiên được quy đổi tương ứng (nhân scale/30).
 */
export function applyFtuPriority({
  baseScore,
  scale,
  bonus30 = 0,
  regionPriority30 = 0,
  subjectPriority30 = 0,
}: {
  baseScore: number;
  scale: 30 | 40;
  bonus30?: number;
  regionPriority30?: number;
  subjectPriority30?: number;
}): FtuPriorityResult {
  const factor = scale / 30;
  const bonusCapped30 = Math.min(clampMin(bonus30, 0), FTU_MAX_BONUS_30);
  const bonusApplied = bonusCapped30 * factor;
  const basePlusBonus = baseScore + bonusApplied;

  if (basePlusBonus >= scale) {
    const finalScore = scale;
    return {
      finalScore,
      normalizedScore30: (finalScore * 30) / scale,
      baseScore,
      bonusApplied,
      priorityApplied: 0,
      scale,
      branch: "TH1_NO_PRIORITY",
    };
  }

  const prioritySum30 =
    clampMin(regionPriority30, 0) + clampMin(subjectPriority30, 0);
  const prioritySumNative = prioritySum30 * factor;
  const priorityApplied =
    ((scale - basePlusBonus) / (scale / 4)) * prioritySumNative;
  const finalScore = Math.min(basePlusBonus + priorityApplied, scale);

  return {
    finalScore,
    normalizedScore30: (finalScore * 30) / scale,
    baseScore,
    bonusApplied,
    priorityApplied: finalScore - basePlusBonus,
    scale,
    branch: "TH2_CONVERTED_PRIORITY",
  };
}
