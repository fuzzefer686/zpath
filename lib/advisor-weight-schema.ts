import type { AdvisorSubject } from "@/lib/advisor-types";

export type AdvisorSubjectWeightKey = "math" | "literature" | AdvisorSubject;

export type AdvisorScoreWeightKey =
  | "academicFit"
  | "interestFit"
  | "careerGoalFit"
  | "personalityFit";

export type AdvisorWeightKey = AdvisorSubjectWeightKey | AdvisorScoreWeightKey;

export type AdvisorWeightValues = Record<AdvisorWeightKey, number>;

export type AdvisorWeightField = {
  key: AdvisorWeightKey;
  label: string;
  dbColumn: string;
};

export const ADVISOR_SUBJECT_WEIGHT_FIELDS = [
  { key: "math", label: "Toán", dbColumn: "math_weight" },
  { key: "literature", label: "Văn", dbColumn: "literature_weight" },
  { key: "english", label: "Tiếng Anh", dbColumn: "english_weight" },
  { key: "physics", label: "Vật lý", dbColumn: "physics_weight" },
  { key: "chemistry", label: "Hóa học", dbColumn: "chemistry_weight" },
  { key: "biology", label: "Sinh học", dbColumn: "biology_weight" },
  { key: "history", label: "Lịch sử", dbColumn: "history_weight" },
  { key: "geography", label: "Địa lý", dbColumn: "geography_weight" },
  { key: "civicEducation", label: "GDKT & Pháp luật", dbColumn: "civic_education_weight" },
  { key: "informatics", label: "Tin học", dbColumn: "informatics_weight" },
  { key: "technology", label: "Công nghệ", dbColumn: "technology_weight" },
] as const satisfies readonly AdvisorWeightField[];

export const ADVISOR_SCORE_WEIGHT_FIELDS = [
  { key: "academicFit", label: "Học lực", dbColumn: "academic_fit_weight" },
  { key: "interestFit", label: "Sở thích", dbColumn: "interest_fit_weight" },
  { key: "careerGoalFit", label: "Mục tiêu nghề nghiệp", dbColumn: "career_goal_fit_weight" },
  { key: "personalityFit", label: "Tính cách", dbColumn: "personality_fit_weight" },
] as const satisfies readonly AdvisorWeightField[];

export const ADVISOR_WEIGHT_FIELDS = [
  ...ADVISOR_SUBJECT_WEIGHT_FIELDS,
  ...ADVISOR_SCORE_WEIGHT_FIELDS,
] as const;

export const DEFAULT_ADVISOR_SCORE_WEIGHTS = {
  academicFit: 0.4,
  interestFit: 0.3,
  careerGoalFit: 0.2,
  personalityFit: 0.1,
} satisfies Record<AdvisorScoreWeightKey, number>;

export const emptyAdvisorWeightValues = (): AdvisorWeightValues =>
  ADVISOR_WEIGHT_FIELDS.reduce((values, field) => {
    values[field.key] = 0;
    return values;
  }, {} as AdvisorWeightValues);

export const clampAdvisorWeight = (value: unknown): number => {
  const numeric = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
};
