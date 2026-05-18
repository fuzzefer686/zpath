export interface NormalizedSurveyProfile {
  interests: {
    technology: number | null;
    business: number | null;
    design_media: number | null;
    healthcare: number | null;
  };
  academic_ability: {
    math_logic: number | null;
    english: number | null;
    self_learning: number | null;
  };
  personality: {
    problem_solving: number | null;
    communication_teamwork: number | null;
    persistence: number | null;
  };
  personal_context: {
    has_laptop: boolean | "shared" | null;
    self_study_hours_per_day: number | null;
  };
  career_goals: {
    income_priority: number | null;
    stability_priority: number | null;
  };
  experience: {
    action_readiness: number | null;
  };
}

export interface CareerScores {
  interest: number;
  ability: number;
  personality: number;
  context: number;
  market: number;
  action_readiness: number;
}

export type CareerScoreReasons = Record<keyof CareerScores, string>;

export interface AICareerEvaluation {
  career_group: string;
  scores: CareerScores;
  reasons: CareerScoreReasons;
  top_reasons: string[];
  risks: string[];
  recommendation: string;
}

export interface AIEvaluationOutput {
  career_evaluations: AICareerEvaluation[];
  student_summary: {
    main_strengths: string[];
    main_risks: string[];
    missing_data: string[];
  };
  next_steps_30_days: string[];
  warning: string;
}

export interface CareerRankingItem {
  career_group: string;
  total_score_10: number;
  fit_percentage: number;
  fit_level: string;
  scores: CareerScores;
  reasons: CareerScoreReasons;
  top_reasons: string[];
  risks: string[];
  recommendation: string;
}
