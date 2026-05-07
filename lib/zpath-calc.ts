import type { TrialFormData, TrialResult } from "@/types/zpath";

const AWARD_BONUS: Record<TrialFormData["culturalAward"], number> = {
  none: 0,
  encouragement: 0.5,
  third: 1,
  second: 1.5,
  first: 2,
};

function ieltsBonus(band: number): number {
  if (band >= 7.5) return 2;
  if (band >= 6.5) return 1.5;
  if (band >= 5.5) return 1;
  if (band >= 4.5) return 0.5;
  return 0;
}

export function computeResult(data: TrialFormData): TrialResult {
  const subjectAvg =
    (data.scoreMath + data.scoreLiterature + data.electiveScore1 + data.electiveScore2) / 4;

  const bonus = ieltsBonus(data.ielts) + AWARD_BONUS[data.culturalAward];
  const totalScore = Math.min(10, subjectAvg + bonus * 0.5);

  let tier: TrialResult["tier"] = "LOW";
  let message = "Khả năng đỗ còn thấp. Bạn nên ôn luyện thêm và cân nhắc nguyện vọng an toàn.";

  if (totalScore >= 8) {
    tier = "HIGH";
    message = "Cơ hội đỗ rất cao. Bạn có thể tự tin chinh phục nguyện vọng mục tiêu.";
  } else if (totalScore >= 6.5) {
    tier = "MID";
    message = "Cơ hội đỗ ở mức trung bình. Hãy cân bằng nguyện vọng mục tiêu và nguyện vọng an toàn.";
  }

  return { tier, totalScore, bonus, message };
}
