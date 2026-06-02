import { parseGeminiJson } from "../lib/advisor/json";

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label}: expected object`);
  }

  return value as Record<string, unknown>;
}

function parseWithMutedWarning(text: string) {
  const originalWarn = console.warn;
  console.warn = () => undefined;

  try {
    return parseGeminiJson(text);
  } finally {
    console.warn = originalWarn;
  }
}

function runGeminiJsonParserChecks() {
  assertEqual(
    assertObject(parseGeminiJson('{"title":"ok"}'), "plain json").title,
    "ok",
    "plain json title",
  );

  assertEqual(
    assertObject(parseGeminiJson('```json\n{"title":"fenced"}\n```'), "fenced json").title,
    "fenced",
    "fenced json title",
  );

  assertEqual(
    assertObject(parseGeminiJson('{"title":"first"}\n\nNote: extra text'), "json with trailing text").title,
    "first",
    "json with trailing text title",
  );

  assertEqual(
    assertObject(parseGeminiJson('{"title":"first"}\n{"title":"second"}'), "two json objects").title,
    "first",
    "two json objects title",
  );

  assertEqual(
    assertObject(parseWithMutedWarning('{"content":"line 1\nline 2",}'), "newline and trailing comma").content,
    "line 1\nline 2",
    "newline and trailing comma content",
  );

  assertEqual(
    assertObject(parseGeminiJson('{"content":"literal } inside string"} trailing'), "brace in string").content,
    "literal } inside string",
    "brace in string content",
  );
}

runGeminiJsonParserChecks();
console.log("Gemini JSON parser checks passed.");
