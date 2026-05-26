import type { NormalizedSurveyProfile } from "@/src/types/zpath";

type JsonRecord = Record<string, unknown>;

export const emptyNormalizedSurveyProfile: NormalizedSurveyProfile = {
  interests: {
    technology: null,
    business: null,
    design_media: null,
    healthcare: null,
  },
  academic_ability: {
    math_logic: null,
    english: null,
    self_learning: null,
  },
  personality: {
    problem_solving: null,
    communication_teamwork: null,
    persistence: null,
  },
  personal_context: {
    has_laptop: null,
    self_study_hours_per_day: null,
  },
  career_goals: {
    income_priority: null,
    stability_priority: null,
  },
  experience: {
    action_readiness: null,
  },
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(10, parsed));
}

function laptopOrNull(value: unknown): boolean | "shared" | null {
  if (value === true || value === false || value === "shared") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function readRecord(source: JsonRecord, key: string): JsonRecord {
  return isRecord(source[key]) ? source[key] : {};
}

export function sanitizeNormalizedSurveyProfile(
  value: unknown,
): NormalizedSurveyProfile {
  const source = isRecord(value) ? value : {};
  const interests = readRecord(source, "interests");
  const academicAbility = readRecord(source, "academic_ability");
  const personality = readRecord(source, "personality");
  const personalContext = readRecord(source, "personal_context");
  const careerGoals = readRecord(source, "career_goals");
  const experience = readRecord(source, "experience");

  return {
    interests: {
      technology: numberOrNull(interests.technology),
      business: numberOrNull(interests.business),
      design_media: numberOrNull(interests.design_media),
      healthcare: numberOrNull(interests.healthcare),
    },
    academic_ability: {
      math_logic: numberOrNull(academicAbility.math_logic),
      english: numberOrNull(academicAbility.english),
      self_learning: numberOrNull(academicAbility.self_learning),
    },
    personality: {
      problem_solving: numberOrNull(personality.problem_solving),
      communication_teamwork: numberOrNull(personality.communication_teamwork),
      persistence: numberOrNull(personality.persistence),
    },
    personal_context: {
      has_laptop: laptopOrNull(personalContext.has_laptop),
      self_study_hours_per_day: numberOrNull(
        personalContext.self_study_hours_per_day,
      ),
    },
    career_goals: {
      income_priority: numberOrNull(careerGoals.income_priority),
      stability_priority: numberOrNull(careerGoals.stability_priority),
    },
    experience: {
      action_readiness: numberOrNull(experience.action_readiness),
    },
  };
}
