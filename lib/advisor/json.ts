function stripJsonCodeFence(text: string) {
  const cleaned = text.trim();
  const fenced = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```/i);

  return fenced ? fenced[1].trim() : cleaned;
}

function extractFirstJsonObject(text: string) {
  const cleaned = stripJsonCodeFence(text);
  const start = cleaned.indexOf("{");

  if (start === -1) return cleaned;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return cleaned.slice(start, index + 1);
      }
    }
  }

  return cleaned.slice(start).trim();
}

function sanitizeJsonObject(text: string) {
  let sanitized = text;

  sanitized = sanitized.replace(/,(\s*[\]}])/g, "$1");
  sanitized = sanitized.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, value) => {
    const escaped = value.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
    return `"${escaped}"`;
  });

  return sanitized;
}

export function parseGeminiJson(text: string): unknown {
  const cleanedText = extractFirstJsonObject(text);

  try {
    return JSON.parse(cleanedText);
  } catch (firstError) {
    try {
      console.warn(
        "Gemini standard JSON parse failed, attempting sanitization...",
        firstError,
      );

      return JSON.parse(sanitizeJsonObject(cleanedText));
    } catch (secondError) {
      console.error("Gemini JSON sanitization also failed:", secondError);
      console.error("Raw text was:", text);
      throw new Error("GEMINI_JSON_PARSE_FAILED");
    }
  }
}
