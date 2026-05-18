import type {
  AICareerEvaluation,
  CareerRankingItem,
  CareerScores,
} from "../../types/zpath";

const SCORE_WEIGHTS: CareerScores = {
  interest: 0.2,
  ability: 0.25,
  personality: 0.15,
  context: 0.15,
  market: 0.15,
  action_readiness: 0.1,
};

const SCORE_KEYS = Object.keys(SCORE_WEIGHTS) as Array<keyof CareerScores>;

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100;
}

function getFitLevel(fitPercentage: number) {
  if (fitPercentage <= 39) return "Không nên chọn làm hướng chính lúc này";
  if (fitPercentage <= 54) return "Chưa phù hợp, cần tìm hiểu thêm";
  if (fitPercentage <= 69) return "Có tiềm năng nhưng còn điểm yếu rõ";
  if (fitPercentage <= 84) return "Khá phù hợp";
  return "Rất phù hợp";
}

export function validateScores(scores: CareerScores): void {
  if (!scores || typeof scores !== "object") {
    throw new Error("Career scores are required.");
  }

  for (const key of SCORE_KEYS) {
    const score = scores[key];

    if (score === undefined || score === null) {
      throw new Error(`Missing required career score: ${key}`);
    }

    if (typeof score !== "number" || Number.isNaN(score)) {
      throw new Error(`Career score must be a number: ${key}`);
    }

    if (score < 0 || score > 10) {
      throw new Error(`Career score must be between 0 and 10: ${key}`);
    }
  }
}

export function calculateCareerScore(scores: CareerScores) {
  validateScores(scores);

  const totalScore = SCORE_KEYS.reduce(
    (total, key) => total + scores[key] * SCORE_WEIGHTS[key],
    0,
  );
  const total_score_10 = roundToTwoDecimals(totalScore);
  const fit_percentage = Math.round(total_score_10 * 10);

  return {
    total_score_10,
    fit_percentage,
    fit_level: getFitLevel(fit_percentage),
  };
}

export function calculateRanking(
  aiCareerEvaluations: AICareerEvaluation[],
): CareerRankingItem[] {
  return aiCareerEvaluations
    .map((evaluation) => {
      validateScores(evaluation.scores);

      return {
        career_group: evaluation.career_group,
        ...calculateCareerScore(evaluation.scores),
        scores: evaluation.scores,
        reasons: evaluation.reasons,
        top_reasons: evaluation.top_reasons,
        risks: evaluation.risks,
        recommendation: evaluation.recommendation,
      };
    })
    .sort((a, b) => b.fit_percentage - a.fit_percentage);
}
