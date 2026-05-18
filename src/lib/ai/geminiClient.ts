import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";

if (typeof window !== "undefined") {
  throw new Error("geminiClient must only be imported from server-side code.");
}

export const geminiModelName =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing required environment variable: GEMINI_API_KEY");
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      enterprise: false,
      vertexai: false,
    });
  }

  return geminiClient;
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

  const response = await getGeminiClient().models.generateContent({
    model: geminiModelName,
    contents: prompt,
    config,
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("GEMINI_EMPTY_RESPONSE");
  }

  return parseJsonResponse(text);
}
