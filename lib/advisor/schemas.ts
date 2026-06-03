import type {
  AdvisorClarificationAnswer,
  AdvisorQuestionTemplate,
  AdvisorTemplateValues,
} from "@/lib/advisor/types";

export type AdvisorTemplateAnswerRequest = {
  mode: "template";
  templateId: string;
  fields: AdvisorTemplateValues;
  allowWebSearch?: boolean;
  conversationId?: string;
  anonymousId?: string;
};

export type AdvisorFreeTextAnswerRequest = {
  mode: "free_text";
  message: string;
  allowWebSearch?: boolean;
  conversationId?: string;
  anonymousId?: string;
};

export type AdvisorClarificationAnswerRequest = {
  mode: "clarification";
  originalQuestion: string;
  clarificationAnswers: AdvisorClarificationAnswer[];
  allowWebSearch?: boolean;
  conversationId?: string;
  anonymousId?: string;
};

export type AdvisorAnswerRequest =
  | AdvisorTemplateAnswerRequest
  | AdvisorFreeTextAnswerRequest
  | AdvisorClarificationAnswerRequest;

export type AdvisorAnswerValidationError = {
  code: string;
  message: string;
  status: number;
};

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: AdvisorAnswerValidationError };

const MAX_MESSAGE_LENGTH = 1200;
const MAX_FIELD_KEY_LENGTH = 80;
const MAX_FIELD_VALUE_LENGTH = 500;
const MAX_FIELD_COUNT = 24;
const MAX_ANONYMOUS_ID_LENGTH = 120;
const MAX_CLARIFICATION_ANSWER_LENGTH = 120;
const MAX_CLARIFICATION_ANSWER_COUNT = 8;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAllowWebSearch(value: unknown) {
  return value !== false;
}

function readOptionalString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return trimmed;
}

function readOptionalUuid(value: unknown) {
  const trimmed = readOptionalString(value, 64);
  return trimmed && UUID_PATTERN.test(trimmed) ? trimmed : undefined;
}

function validationError(
  code: string,
  message: string,
  status = 400,
): ValidationResult<never> {
  return {
    success: false,
    error: { code, message, status },
  };
}

function parseTextField(value: unknown, label: string) {
  if (typeof value !== "string") {
    return validationError("INVALID_FIELD", `${label} phải là chuỗi văn bản.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return validationError("REQUIRED_FIELD", `${label} không được để trống.`);
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return validationError("FIELD_TOO_LONG", `${label} quá dài.`);
  }

  return { success: true as const, data: trimmed };
}

function parseTemplateFields(value: unknown): ValidationResult<AdvisorTemplateValues> {
  if (!isRecord(value)) {
    return validationError("INVALID_FIELDS", "fields phải là một object.");
  }

  const entries = Object.entries(value);
  if (entries.length > MAX_FIELD_COUNT) {
    return validationError("TOO_MANY_FIELDS", "Số lượng fields vượt giới hạn.");
  }

  const fields: AdvisorTemplateValues = {};

  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim();
    if (!key || key.length > MAX_FIELD_KEY_LENGTH) {
      return validationError("INVALID_FIELD_NAME", "Tên field không hợp lệ.");
    }

    if (
      typeof rawValue !== "string" &&
      typeof rawValue !== "number" &&
      typeof rawValue !== "boolean"
    ) {
      return validationError("INVALID_FIELD_VALUE", `Giá trị của ${key} không hợp lệ.`);
    }

    const stringValue = String(rawValue).trim();
    if (stringValue.length > MAX_FIELD_VALUE_LENGTH) {
      return validationError("FIELD_VALUE_TOO_LONG", `Giá trị của ${key} quá dài.`);
    }

    fields[key] = stringValue;
  }

  return { success: true, data: fields };
}

function parseClarificationAnswers(
  value: unknown,
): ValidationResult<AdvisorClarificationAnswer[]> {
  if (!Array.isArray(value)) {
    return validationError("INVALID_CLARIFICATION", "clarificationAnswers phải là một mảng.");
  }

  if (!value.length) {
    return validationError("MISSING_CLARIFICATION", "Vui lòng trả lời ít nhất một câu hỏi.");
  }

  if (value.length > MAX_CLARIFICATION_ANSWER_COUNT) {
    return validationError("TOO_MANY_CLARIFICATION_ANSWERS", "Số câu trả lời vượt giới hạn.");
  }

  const answers: AdvisorClarificationAnswer[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return validationError("INVALID_CLARIFICATION_ANSWER", "Câu trả lời không hợp lệ.");
    }

    const id = readOptionalString(item.id, 64);
    const valueText = readOptionalString(item.value, MAX_CLARIFICATION_ANSWER_LENGTH);

    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
      return validationError("INVALID_CLARIFICATION_ID", "Mã câu hỏi làm rõ không hợp lệ.");
    }

    if (!valueText) {
      return validationError("INVALID_CLARIFICATION_VALUE", "Câu trả lời không được để trống.");
    }

    answers.push({ id, value: valueText });
  }

  return { success: true, data: answers };
}

export function parseAdvisorAnswerRequest(
  input: unknown,
): ValidationResult<AdvisorAnswerRequest> {
  if (!isRecord(input)) {
    return validationError("INVALID_BODY", "Body phải là JSON object.");
  }

  if (input.mode === "template") {
    const templateId = parseTextField(input.templateId, "templateId");
    if (!templateId.success) return templateId;

    const fields = parseTemplateFields(input.fields);
    if (!fields.success) return fields;

    return {
      success: true,
      data: {
        mode: "template",
        templateId: templateId.data,
        fields: fields.data,
        allowWebSearch: readAllowWebSearch(input.allowWebSearch),
        conversationId: readOptionalUuid(input.conversationId),
        anonymousId: readOptionalString(input.anonymousId, MAX_ANONYMOUS_ID_LENGTH),
      },
    };
  }

  if (input.mode === "free_text") {
    const message = parseTextField(input.message, "message");
    if (!message.success) return message;

    return {
      success: true,
      data: {
        mode: "free_text",
        message: message.data,
        allowWebSearch: readAllowWebSearch(input.allowWebSearch),
        conversationId: readOptionalUuid(input.conversationId),
        anonymousId: readOptionalString(input.anonymousId, MAX_ANONYMOUS_ID_LENGTH),
      },
    };
  }

  if (input.mode === "clarification") {
    const originalQuestion = parseTextField(input.originalQuestion, "originalQuestion");
    if (!originalQuestion.success) return originalQuestion;

    const clarificationAnswers = parseClarificationAnswers(input.clarificationAnswers);
    if (!clarificationAnswers.success) return clarificationAnswers;

    return {
      success: true,
      data: {
        mode: "clarification",
        originalQuestion: originalQuestion.data,
        clarificationAnswers: clarificationAnswers.data,
        allowWebSearch: readAllowWebSearch(input.allowWebSearch),
        conversationId: readOptionalUuid(input.conversationId),
        anonymousId: readOptionalString(input.anonymousId, MAX_ANONYMOUS_ID_LENGTH),
      },
    };
  }

  return validationError(
    "INVALID_MODE",
    "mode phải là 'template', 'free_text' hoặc 'clarification'.",
  );
}

export function validateAdvisorTemplateFields(
  template: AdvisorQuestionTemplate,
  fields: AdvisorTemplateValues,
): ValidationResult<AdvisorTemplateValues> {
  for (const field of template.requiredFields) {
    const value = fields[field.name]?.trim() ?? "";

    if (field.required && !value) {
      return validationError(
        "MISSING_TEMPLATE_FIELD",
        `Vui lòng nhập ${field.label.toLowerCase()}.`,
      );
    }

    if (field.type === "number" && value && !Number.isFinite(Number(value))) {
      return validationError(
        "INVALID_TEMPLATE_FIELD",
        `${field.label} phải là một số hợp lệ.`,
      );
    }

    if (
      field.type === "select" &&
      value &&
      field.options?.length &&
      !field.options.some((option) => option.value === value)
    ) {
      return validationError(
        "INVALID_TEMPLATE_FIELD",
        `${field.label} không nằm trong danh sách lựa chọn hợp lệ.`,
      );
    }
  }

  return { success: true, data: fields };
}
