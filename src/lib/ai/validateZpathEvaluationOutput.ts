import type { AIEvaluationOutput, CareerScores } from "../../types/zpath";
import { ZPATH_CAREER_GROUPS } from "./prompts/zpathCareerEvaluationPrompt";

type JsonRecord = Record<string, unknown>;

const SCORE_KEYS: Array<keyof CareerScores> = [
  "interest",
  "ability",
  "personality",
  "context",
  "market",
  "action_readiness",
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, path: string): asserts value is JsonRecord {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object.`);
  }
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string.`);
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }
}

function assertScore(value: unknown, path: string): asserts value is number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${path} must be a number.`);
  }

  if (value < 0 || value > 10) {
    throw new Error(`${path} must be between 0 and 10.`);
  }
}

function validateCareerGroups(careerGroups: string[]) {
  const actualGroups = new Set(careerGroups);

  for (const expectedGroup of ZPATH_CAREER_GROUPS) {
    if (!actualGroups.has(expectedGroup)) {
      throw new Error(`Missing career group: ${expectedGroup}`);
    }
  }
}

export function validateZpathEvaluationOutput(
  output: unknown,
): AIEvaluationOutput {
  assertRecord(output, "output");

  assertArray(output.career_evaluations, "career_evaluations");
  if (output.career_evaluations.length !== ZPATH_CAREER_GROUPS.length) {
    throw new Error(
      `career_evaluations must contain ${ZPATH_CAREER_GROUPS.length} items.`,
    );
  }

  const careerGroups: string[] = [];

  output.career_evaluations.forEach((evaluation, index) => {
    const path = `career_evaluations[${index}]`;
    assertRecord(evaluation, path);

    assertString(evaluation.career_group, `${path}.career_group`);
    careerGroups.push(evaluation.career_group);

    assertRecord(evaluation.scores, `${path}.scores`);
    for (const key of SCORE_KEYS) {
      assertScore(evaluation.scores[key], `${path}.scores.${key}`);
    }

    assertRecord(evaluation.reasons, `${path}.reasons`);
    for (const key of SCORE_KEYS) {
      assertString(evaluation.reasons[key], `${path}.reasons.${key}`);
    }

    assertArray(evaluation.top_reasons, `${path}.top_reasons`);
    assertArray(evaluation.risks, `${path}.risks`);
    assertString(evaluation.recommendation, `${path}.recommendation`);
  });

  validateCareerGroups(careerGroups);

  assertRecord(output.student_summary, "student_summary");
  assertArray(output.student_summary.main_strengths, "student_summary.main_strengths");
  assertArray(output.student_summary.main_risks, "student_summary.main_risks");
  assertArray(output.student_summary.missing_data, "student_summary.missing_data");

  assertArray(output.next_steps_30_days, "next_steps_30_days");
  assertString(output.warning, "warning");

  return output as unknown as AIEvaluationOutput;
}
