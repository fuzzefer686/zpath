import type { GenerateContentConfig } from "@google/genai";

import { AdvisorIntent } from "@/lib/advisor/intents";
import { parseGeminiJson } from "@/lib/advisor/json";
import type { MajorKnowledgeIntentClassification } from "@/lib/advisor/majorKnowledge";
import { generateGeminiText } from "@/src/lib/ai/geminiVertexClient";

const MAJOR_KNOWLEDGE_INTENTS = [
  "REVIEW_MAJOR",
  "COMPARE_MAJORS",
  "CHOOSE_MAJOR",
  "UNKNOWN",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeIntent(value: unknown): MajorKnowledgeIntentClassification["intent"] {
  return MAJOR_KNOWLEDGE_INTENTS.includes(value as MajorKnowledgeIntentClassification["intent"])
    ? (value as MajorKnowledgeIntentClassification["intent"])
    : "UNKNOWN";
}

function normalizeConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.4;
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function mapMajorKnowledgeIntentToAdvisorIntent(
  intent: MajorKnowledgeIntentClassification["intent"],
  fallback: AdvisorIntent,
): AdvisorIntent {
  switch (intent) {
    case "REVIEW_MAJOR":
      return AdvisorIntent.REVIEW_MAJOR;
    case "COMPARE_MAJORS":
      return AdvisorIntent.COMPARE_MAJORS;
    case "CHOOSE_MAJOR":
      return AdvisorIntent.PERSONAL_FIT;
    case "UNKNOWN":
    default:
      return fallback;
  }
}

export function normalizeMajorKnowledgeClassification(
  raw: unknown,
): MajorKnowledgeIntentClassification {
  if (!isRecord(raw)) {
    return {
      intent: "UNKNOWN",
      matchedMajors: [],
      confidence: 0.3,
      needClarification: false,
    };
  }

  return {
    intent: normalizeIntent(raw.intent),
    matchedMajors: readStringArray(raw.matchedMajors),
    confidence: normalizeConfidence(raw.confidence),
    needClarification: raw.needClarification === true,
  };
}

export function buildMajorKnowledgeClassificationPrompt(question: string) {
  return [
    "You classify Vietnamese student questions for ZPath Advisor major-profile retrieval.",
    "Return only valid JSON. Do not include Markdown fences or prose.",
    "Valid intents: REVIEW_MAJOR, COMPARE_MAJORS, CHOOSE_MAJOR, UNKNOWN.",
    "matchedMajors must be a string[] of major names/canonical names mentioned or strongly implied by the user. Do not invent majorId.",
    "Use COMPARE_MAJORS only when the user compares two or more majors.",
    "Use REVIEW_MAJOR when the user asks about one specific major: what it studies, difficulty, fit, careers, misconceptions, future, salary, skills.",
    "Use CHOOSE_MAJOR when the user describes interests/strengths but does not name a specific major.",
    "Use UNKNOWN if this is not about choosing/reviewing/comparing majors.",
    "Output shape:",
    JSON.stringify(
      {
        intent: "REVIEW_MAJOR | COMPARE_MAJORS | CHOOSE_MAJOR | UNKNOWN",
        matchedMajors: ["English Language"],
        confidence: 0.9,
        needClarification: false,
      },
      null,
      2,
    ),
    "Question:",
    question,
  ].join("\n");
}

export async function classifyMajorKnowledgeIntentWithGemini(
  question: string,
): Promise<MajorKnowledgeIntentClassification> {
  const config: GenerateContentConfig = {
    responseMimeType: "application/json",
    temperature: 0,
    maxOutputTokens: 512,
  };
  const text = await generateGeminiText({
    prompt: buildMajorKnowledgeClassificationPrompt(question),
    config,
  });

  return normalizeMajorKnowledgeClassification(parseGeminiJson(text));
}
