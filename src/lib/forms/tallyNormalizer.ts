import type { NormalizedSurveyProfile } from "../../types/zpath";

type JsonRecord = Record<string, unknown>;

const FIELD_ID_KEYS = ["label", "key", "title", "name", "id"] as const;
const ANSWER_KEYS = ["value", "answer", "answers", "text", "raw_value"] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLookupValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

function normalizeAnswerText(value: unknown): string | null {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return normalizeAnswerText(value[0]);
  if (!isRecord(value)) return null;

  for (const key of ["label", "value", "text", "title", "name"]) {
    const answer = normalizeAnswerText(value[key]);
    if (answer) return answer;
  }

  return null;
}

function normalizeChoiceText(value: unknown) {
  return normalizeAnswerText(value)
    ?.replace(/\s+/g, " ")
    .replace(/[–—]/g, "-")
    .toLowerCase();
}

function getPayloadFields(payload: unknown): unknown[] {
  if (!isRecord(payload)) return [];

  const data = payload.data;
  if (!isRecord(data) || !Array.isArray(data.fields)) return [];

  return data.fields;
}

function getFieldAnswer(field: JsonRecord): unknown {
  for (const key of ANSWER_KEYS) {
    if (field[key] !== undefined) return field[key];
  }

  return null;
}

export function getAnswerByLabelOrKey(
  fields: unknown,
  keys: string[],
): unknown {
  if (!Array.isArray(fields)) return null;

  const normalizedKeys = new Set(keys.map((key) => key.trim().toLowerCase()));

  for (const field of fields) {
    if (!isRecord(field)) continue;

    const hasMatchingKey = FIELD_ID_KEYS.some((fieldKey) => {
      const value = normalizeLookupValue(field[fieldKey]);
      return value ? normalizedKeys.has(value) : false;
    });

    if (hasMatchingKey) return getFieldAnswer(field);
  }

  return null;
}

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return toNumberOrNull(value[0]);

  if (isRecord(value)) {
    for (const key of ["value", "answer", "label", "text"]) {
      const numberValue = toNumberOrNull(value[key]);
      if (numberValue !== null) return numberValue;
    }

    return null;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapLaptopAnswer(value: unknown): boolean | "shared" | null {
  const normalized = normalizeChoiceText(value);

  if (normalized === "co" || normalized === "có") return true;
  if (normalized === "khong" || normalized === "không") return false;
  if (normalized === "dung chung voi nguoi khac") return "shared";
  if (normalized === "dùng chung với người khác") return "shared";

  return null;
}

export function mapStudyTime(value: unknown): number | null {
  const normalized = normalizeChoiceText(value);

  switch (normalized) {
    case "duoi 30 phut":
    case "dưới 30 phút":
      return 0.5;
    case "30 phut - 1 gio":
    case "30 phút - 1 giờ":
      return 1;
    case "1 - 2 gio":
    case "1 - 2 giờ":
      return 2;
    case "2 - 3 gio":
    case "2 - 3 giờ":
      return 3;
    case "tren 3 gio":
    case "trên 3 giờ":
      return 4;
    default:
      return null;
  }
}

export function mapExperience(value: unknown): number | null {
  const normalized = normalizeChoiceText(value);

  switch (normalized) {
    case "chua tung":
    case "chưa từng":
      return 1;
    case "da tim hieu so qua":
    case "đã tìm hiểu sơ qua":
      return 2;
    case "da hoc thu mot khoa/bai hoc":
    case "đã học thử một khóa/bài học":
      return 3;
    case "da lam project nho":
    case "đã làm project nhỏ":
      return 4;
    case "da tham gia clb/cuoc thi/hoat dong thuc te":
    case "đã tham gia clb/cuộc thi/hoạt động thực tế":
      return 5;
    default:
      return null;
  }
}

export function normalizeTallyPayload(
  payload: unknown,
): NormalizedSurveyProfile {
  const fields = getPayloadFields(payload);
  const answer = (key: string) => getAnswerByLabelOrKey(fields, [key]);

  return {
    interests: {
      technology: toNumberOrNull(answer("technology_interest")),
      business: toNumberOrNull(answer("business_interest")),
      design_media: toNumberOrNull(answer("design_media_interest")),
      healthcare: toNumberOrNull(answer("healthcare_interest")),
    },
    academic_ability: {
      math_logic: toNumberOrNull(answer("math_logic_ability")),
      english: toNumberOrNull(answer("english_ability")),
      self_learning: toNumberOrNull(answer("self_learning_ability")),
    },
    personality: {
      problem_solving: toNumberOrNull(answer("problem_solving_preference")),
      communication_teamwork: toNumberOrNull(
        answer("communication_teamwork_preference"),
      ),
      persistence: toNumberOrNull(answer("persistence_level")),
    },
    personal_context: {
      has_laptop: mapLaptopAnswer(answer("has_laptop")),
      self_study_hours_per_day: mapStudyTime(
        answer("self_study_time_per_day"),
      ),
    },
    career_goals: {
      income_priority: toNumberOrNull(answer("income_priority")),
      stability_priority: toNumberOrNull(answer("stability_priority")),
    },
    experience: {
      action_readiness: mapExperience(
        answer("action_readiness_experience"),
      ),
    },
  };
}
