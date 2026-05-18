const careerScoreProperties = {
  interest: { type: "number" },
  ability: { type: "number" },
  personality: { type: "number" },
  context: { type: "number" },
  market: { type: "number" },
  action_readiness: { type: "number" },
};

const careerReasonProperties = {
  interest: { type: "string" },
  ability: { type: "string" },
  personality: { type: "string" },
  context: { type: "string" },
  market: { type: "string" },
  action_readiness: { type: "string" },
};

const careerScoreKeys = [
  "interest",
  "ability",
  "personality",
  "context",
  "market",
  "action_readiness",
];

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
};

export const zpathEvaluationResponseSchema = {
  type: "object",
  properties: {
    career_evaluations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          career_group: { type: "string" },
          scores: {
            type: "object",
            properties: careerScoreProperties,
            required: careerScoreKeys,
          },
          reasons: {
            type: "object",
            properties: careerReasonProperties,
            required: careerScoreKeys,
          },
          top_reasons: stringArraySchema,
          risks: stringArraySchema,
          recommendation: { type: "string" },
        },
        required: [
          "career_group",
          "scores",
          "reasons",
          "top_reasons",
          "risks",
          "recommendation",
        ],
      },
    },
    student_summary: {
      type: "object",
      properties: {
        main_strengths: stringArraySchema,
        main_risks: stringArraySchema,
        missing_data: stringArraySchema,
      },
      required: ["main_strengths", "main_risks", "missing_data"],
    },
    next_steps_30_days: stringArraySchema,
    warning: { type: "string" },
  },
  required: [
    "career_evaluations",
    "student_summary",
    "next_steps_30_days",
    "warning",
  ],
} as const;
