import { NextResponse } from "next/server";

import { evaluateCareerWithGemini } from "@/src/lib/ai/evaluateCareerWithGemini";
import { geminiModelName } from "@/src/lib/ai/geminiClient";
import { ZPATH_PROMPT_VERSION } from "@/src/lib/ai/prompts/zpathCareerEvaluationPrompt";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import { extractTallyHiddenFields } from "@/src/lib/forms/tallyHiddenFields";
import { normalizeTallyPayload } from "@/src/lib/forms/tallyNormalizer";
import { calculateRanking } from "@/src/lib/scoring/calculateCareerScore";

type JsonRecord = Record<string, unknown>;

export const runtime = "nodejs";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPath(source: unknown, path: string[]) {
  let current = source;

  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }

  return current;
}

function toStringOrNull(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extractProviderSubmissionId(payload: unknown) {
  const possiblePaths = [
    ["data", "responseId"],
    ["data", "submissionId"],
    ["data", "response", "id"],
    ["data", "response", "responseId"],
    ["data", "response", "submissionId"],
    ["responseId"],
    ["submissionId"],
    ["eventId"],
  ];

  for (const path of possiblePaths) {
    const value = toStringOrNull(readPath(payload, path));
    if (value) return value;
  }

  return null;
}

function jsonProcessingError() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "WEBHOOK_PROCESSING_FAILED",
        message: "Không thể xử lý submission.",
      },
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const hiddenFields = extractTallyHiddenFields(payload);
    const normalizedProfile = normalizeTallyPayload(payload);

    const { data: surveyResponse, error: surveyResponseError } =
      await supabaseServer
        .from("survey_responses")
        .insert({
          provider: "tally",
          provider_submission_id: extractProviderSubmissionId(payload),
          session_id: hiddenFields.session_id,
          provider_raw_payload: payload,
          normalized_profile: normalizedProfile,
        })
        .select("id")
        .single();

    if (surveyResponseError || !surveyResponse?.id) {
      throw surveyResponseError ?? new Error("survey_response_id missing");
    }

    const aiOutput = await evaluateCareerWithGemini(normalizedProfile);
    const careerRankings = calculateRanking(aiOutput.career_evaluations);

    const { error: careerEvaluationError } = await supabaseServer
      .from("career_evaluations")
      .insert({
        survey_response_id: surveyResponse.id,
        session_id: hiddenFields.session_id,
        career_rankings: careerRankings,
        student_summary: aiOutput.student_summary,
        next_steps_30_days: aiOutput.next_steps_30_days,
        ai_raw_output: aiOutput,
        model_name: geminiModelName,
        prompt_version: ZPATH_PROMPT_VERSION,
      });

    if (careerEvaluationError) {
      throw careerEvaluationError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tally webhook processing failed:", error);
    return jsonProcessingError();
  }
}
