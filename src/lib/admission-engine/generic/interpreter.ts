import type {
  GenericAdmissionConfig,
  GenericInputField,
  GenericMethodConfig,
} from "./config-schema";
import {
  applyPriorityAndBonus,
  applyWeightedCombination,
  convertCertificate,
  convertScale,
} from "./primitives";

/**
 * Runtime result of interpreting a config. Mirrors the static engine's
 * AdmissionScoreResult but keeps schoolCode/method as plain strings because a
 * config-driven school is not part of the hardcoded SchoolCode union.
 */
export type GenericAdmissionScoreResult = {
  schoolCode: string;
  method: string;
  year: number;
  originalScore: number;
  originalScale: number;
  normalizedScore30: number;
  targetScale: 30;
  formulaUsed: string;
  benchmark30: number | null;
  details: Record<string, unknown>;
  warnings: string[];
};

/** A raw certificate payload value: { band: 7.0 }. */
export type GenericCertificateValue = { band: number };

export type GenericPayloadValue = number | string | GenericCertificateValue;
export type GenericPayload = Record<string, GenericPayloadValue>;

export type PayloadValidationResult =
  | { ok: true; scores: Map<string, number>; warnings: string[] }
  | { ok: false; errors: string[] };

function isCertificateValue(value: unknown): value is GenericCertificateValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "band" in value &&
    Number.isFinite((value as { band: unknown }).band as number)
  );
}

function getMethodConfig(
  config: GenericAdmissionConfig,
  methodCode: string,
): GenericMethodConfig | undefined {
  return config.methods.find((method) => method.methodCode === methodCode);
}

/**
 * Validates a payload against a method's declared inputs and resolves every
 * numeric/certificate input to a single number. Select inputs are validated but
 * not added to the score map (they steer UI, not arithmetic).
 */
export function validateGenericPayload(
  method: GenericMethodConfig,
  payload: unknown,
): PayloadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const scores = new Map<string, number>();

  if (typeof payload !== "object" || payload === null) {
    return { ok: false, errors: ["payload must be a JSON object."] };
  }

  const record = payload as Record<string, unknown>;

  for (const input of method.inputs) {
    const raw = record[input.key];
    const isEmpty = raw === undefined || raw === null || raw === "";

    if (isEmpty) {
      if (input.required) {
        errors.push(`Thiếu trường bắt buộc: ${input.label}.`);
      }
      continue;
    }

    if (input.type === "select") {
      const optionValues = (input.options ?? []).map((option) => option.value);
      if (!optionValues.includes(String(raw))) {
        errors.push(`${input.label} không hợp lệ.`);
      }
      continue;
    }

    if (input.type === "certificate") {
      const band = isCertificateValue(raw)
        ? raw.band
        : typeof raw === "number"
          ? raw
          : Number(raw);

      if (!Number.isFinite(band)) {
        errors.push(`${input.label} phải là một số hợp lệ.`);
        continue;
      }

      const converted = convertCertificate(input.certificateLevels ?? [], band);
      if (converted === null) {
        warnings.push(
          `${input.label}: chứng chỉ chưa đạt mức quy đổi tối thiểu, tính 0 điểm.`,
        );
        scores.set(input.key, 0);
      } else {
        scores.set(input.key, converted);
      }
      continue;
    }

    const numericValue = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(numericValue)) {
      errors.push(`${input.label} phải là một số hợp lệ.`);
      continue;
    }

    if (input.min !== undefined && numericValue < input.min) {
      errors.push(`${input.label} không được nhỏ hơn ${input.min}.`);
      continue;
    }
    if (input.max !== undefined && numericValue > input.max) {
      errors.push(`${input.label} không được lớn hơn ${input.max}.`);
      continue;
    }

    scores.set(input.key, numericValue);
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, scores, warnings };
}

function getInputLabel(
  method: GenericMethodConfig,
  key: string | undefined,
): string {
  if (!key) return "";
  return method.inputs.find((input) => input.key === key)?.label ?? key;
}

function describeFormula(method: GenericMethodConfig): string {
  if (method.formula.type === "weighted_combination") {
    const terms = method.formula.terms
      .map((term) => `${getInputLabel(method, term.inputKey)} × ${term.weight}`)
      .join(" + ");
    return `${terms} (thang ${method.formula.targetScale})`;
  }

  return `${getInputLabel(method, method.formula.inputKey)} quy đổi từ thang ${method.formula.fromScale} về thang 30`;
}

/**
 * Core config-driven scoring. Pure function: no DB, no network, safe to run on
 * both the server (API) and the client (admin preview + published page).
 */
export function interpretAdmission({
  config,
  methodCode,
  payload,
}: {
  config: GenericAdmissionConfig;
  methodCode: string;
  payload: unknown;
}): GenericAdmissionScoreResult {
  const method = getMethodConfig(config, methodCode);
  if (!method) {
    throw new Error(
      `Phương thức "${methodCode}" không được hỗ trợ cho ${config.schoolName}.`,
    );
  }

  const validation = validateGenericPayload(method, payload);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const { scores, warnings } = validation;
  const details: Record<string, unknown> = {};

  let originalScore: number;
  let originalScale: number;

  if (method.formula.type === "weighted_combination") {
    const combination = applyWeightedCombination(method.formula.terms, scores);
    originalScale = method.formula.targetScale;
    details.breakdown = combination.breakdown;

    const priority = method.priorityInputKey
      ? scores.get(method.priorityInputKey) ?? 0
      : 0;
    const bonuses = (method.bonusInputKeys ?? []).map(
      (key) => scores.get(key) ?? 0,
    );

    const withBonus = applyPriorityAndBonus(
      combination.score,
      priority,
      bonuses,
      originalScale,
    );
    originalScore = withBonus.score;
    details.priority = withBonus.priority;
    details.bonus = withBonus.bonus;
  } else {
    const value = scores.get(method.formula.inputKey) ?? 0;
    originalScale = method.formula.fromScale;
    originalScore = Math.min(value, originalScale);
  }

  const normalizedScore30 = Math.min(
    convertScale(originalScore, originalScale, 30),
    30,
  );

  return {
    schoolCode: config.schoolCode,
    method: method.methodCode,
    year: config.year,
    originalScore: Math.round(originalScore * 100) / 100,
    originalScale,
    normalizedScore30: Math.round(normalizedScore30 * 100) / 100,
    targetScale: 30,
    formulaUsed: describeFormula(method),
    benchmark30: method.benchmark30 ?? null,
    details,
    warnings,
  };
}

export function listConfigMethods(config: GenericAdmissionConfig) {
  return config.methods.map((method) => ({
    methodCode: method.methodCode,
    methodName: method.methodName,
  }));
}

export type { GenericInputField };
