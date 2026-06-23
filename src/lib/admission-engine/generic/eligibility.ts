import type { GenericEligibilityRule, GenericMethodConfig } from "./config-schema";

export type GenericEligibilityResult = {
  eligible: boolean;
  missingFields: string[];
  warnings: string[];
};

type PayloadRecord = Record<string, unknown>;

function getNumericValue(
  payload: PayloadRecord,
  key: string,
): number | undefined {
  const raw = payload[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "object" && raw !== null && "band" in raw) {
    const band = (raw as { band: unknown }).band;
    return typeof band === "number" && Number.isFinite(band) ? band : undefined;
  }
  return undefined;
}

function isEmptyPayloadValue(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function hasAnyNonEmpty(payload: PayloadRecord, keys: string[]): boolean {
  return keys.some((key) => !isEmptyPayloadValue(payload[key]));
}

/**
 * Evaluates config-declared eligibility rules against a payload.
 */
export function evaluateGenericEligibility(
  method: GenericMethodConfig,
  payload: PayloadRecord,
): GenericEligibilityResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  const rules = method.eligibilityRules ?? [];

  for (const rule of rules) {
    applyRule(rule, payload, missingFields, warnings);
  }

  for (const input of method.inputs) {
    if (!input.required) continue;
    if (input.type === "subject_group") continue;
    if (isEmptyPayloadValue(payload[input.key])) {
      if (!missingFields.includes(input.label)) {
        missingFields.push(input.label);
      }
    }
  }

  return {
    eligible: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

function applyRule(
  rule: GenericEligibilityRule,
  payload: PayloadRecord,
  missingFields: string[],
  warnings: string[],
) {
  switch (rule.type) {
    case "required_input": {
      if (!rule.inputKey) break;
      if (isEmptyPayloadValue(payload[rule.inputKey])) {
        if (!missingFields.includes(rule.message)) {
          missingFields.push(rule.message);
        }
      }
      break;
    }
    case "required_any": {
      const keys = (rule.inputKeys ?? []).filter(
        (key): key is string => typeof key === "string" && key.trim().length > 0,
      );
      if (!keys.length) break;
      if (!hasAnyNonEmpty(payload, keys)) {
        if (!missingFields.includes(rule.message)) {
          missingFields.push(rule.message);
        }
      }
      break;
    }
    case "min_score": {
      if (!rule.inputKey || rule.min === undefined) break;
      const value = getNumericValue(payload, rule.inputKey);
      if (value === undefined) {
        if (!missingFields.includes(rule.message)) {
          missingFields.push(rule.message);
        }
      } else if (value < rule.min) {
        if (!warnings.includes(rule.message)) {
          warnings.push(rule.message);
        }
      }
      break;
    }
    case "min_subject": {
      if (!rule.inputKey || rule.min === undefined) break;
      const value = getNumericValue(payload, rule.inputKey);
      if (value !== undefined && value < rule.min) {
        if (!warnings.includes(rule.message)) {
          warnings.push(rule.message);
        }
      }
      break;
    }
    case "max_bonus": {
      if (!rule.inputKey || rule.max === undefined) break;
      const value = getNumericValue(payload, rule.inputKey);
      if (value !== undefined && value > rule.max) {
        if (!warnings.includes(rule.message)) {
          warnings.push(rule.message);
        }
      }
      break;
    }
    default:
      break;
  }
}
