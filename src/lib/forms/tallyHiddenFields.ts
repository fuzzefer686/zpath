type HiddenFieldKey = "session_id" | "source" | "student_ref";

type HiddenFields = Record<HiddenFieldKey, string | null>;
type JsonRecord = Record<string, unknown>;

const TARGET_KEYS: HiddenFieldKey[] = ["session_id", "source", "student_ref"];
const FIELD_ID_KEYS = ["key", "name", "label"] as const;
const VALUE_KEYS = ["value", "answer", "text"] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeKey(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) return toStringOrNull(value[0]);

  if (isRecord(value)) {
    for (const key of VALUE_KEYS) {
      const parsed = toStringOrNull(value[key]);
      if (parsed !== null) return parsed;
    }
  }

  return null;
}

function readPath(payload: unknown, path: string[]): unknown {
  let current = payload;

  for (const part of path) {
    if (!isRecord(current)) return null;
    current = current[part];
  }

  return current;
}

function readHiddenField(source: unknown, targetKey: HiddenFieldKey) {
  if (Array.isArray(source)) {
    for (const item of source) {
      if (!isRecord(item)) continue;

      const isMatch = FIELD_ID_KEYS.some(
        (fieldKey) => normalizeKey(item[fieldKey]) === targetKey,
      );

      if (isMatch) return toStringOrNull(item);
    }

    return null;
  }

  if (!isRecord(source)) return null;

  for (const [key, value] of Object.entries(source)) {
    if (normalizeKey(key) === targetKey) return toStringOrNull(value);
  }

  for (const value of Object.values(source)) {
    if (!isRecord(value)) continue;

    const isMatch = FIELD_ID_KEYS.some(
      (fieldKey) => normalizeKey(value[fieldKey]) === targetKey,
    );

    if (isMatch) return toStringOrNull(value);
  }

  return null;
}

export function extractTallyHiddenFields(payload: unknown): HiddenFields {
  const sources = [
    readPath(payload, ["data", "fields"]),
    readPath(payload, ["data", "hiddenFields"]),
    readPath(payload, ["data", "response", "hiddenFields"]),
    readPath(payload, ["hiddenFields"]),
  ];

  const result: HiddenFields = {
    session_id: null,
    source: null,
    student_ref: null,
  };

  for (const targetKey of TARGET_KEYS) {
    for (const source of sources) {
      const value = readHiddenField(source, targetKey);
      if (value !== null) {
        result[targetKey] = value;
        break;
      }
    }
  }

  return result;
}
