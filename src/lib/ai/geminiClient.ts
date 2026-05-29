import type { GenerateContentConfig } from "@google/genai";
import {
  geminiModelName,
  generateGeminiText,
} from "@/src/lib/ai/geminiVertexClient";

if (typeof window !== "undefined") {
  throw new Error("geminiClient must only be imported from server-side code.");
}

function stripJsonCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced ? fenced[1].trim() : trimmed;
}

function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(stripJsonCodeFence(text));
  } catch {
    throw new Error("GEMINI_JSON_PARSE_FAILED");
  }
}

export async function generateGeminiJson(
  prompt: string,
  responseSchema?: object,
): Promise<unknown> {
  const config: GenerateContentConfig = {
    responseMimeType: "application/json",
  };

  if (responseSchema) {
    config.responseSchema =
      responseSchema as GenerateContentConfig["responseSchema"];
  }

  const text = await generateGeminiText({
    prompt,
    config,
  });

  return parseJsonResponse(text);
}

export { geminiModelName };
