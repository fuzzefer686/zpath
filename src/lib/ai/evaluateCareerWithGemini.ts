import type {
  AIEvaluationOutput,
  NormalizedSurveyProfile,
} from "../../types/zpath";
import { generateGeminiJson } from "./geminiClient";
import { buildZPathCareerEvaluationPrompt } from "./prompts/zpathCareerEvaluationPrompt";
import { zpathEvaluationResponseSchema } from "./schemas/zpathEvaluationSchema";
import { validateZpathEvaluationOutput } from "./validateZpathEvaluationOutput";

// Deprecated legacy survey evaluation. Kept for existing Tally webhook,
// evaluation, and scoring flows; /survey "Hỏi ZPath" uses lib/advisor instead.

export async function evaluateCareerWithGemini(
  profile: NormalizedSurveyProfile,
): Promise<AIEvaluationOutput> {
  const prompt = buildZPathCareerEvaluationPrompt(profile);

  try {
    const output = await generateGeminiJson(
      prompt,
      zpathEvaluationResponseSchema,
    );

    return validateZpathEvaluationOutput(output);
  } catch {
    throw new Error("ZPATH_AI_EVALUATION_FAILED");
  }
}
