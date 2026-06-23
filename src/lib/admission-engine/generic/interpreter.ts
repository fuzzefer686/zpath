import type {
  GenericAdmissionConfig,
  GenericInputField,
  GenericMethodConfig,
} from "./config-schema";
import { evaluateGenericEligibility } from "./eligibility";
import { migrateAdmissionConfig } from "./migrate-config";
import {
  applyPriorityAndBonus,
  applyWeightedCombination,
  clampScore,
  convertCertificate,
  convertScale,
  applyFormulaGroupEntry,
} from "./primitives";

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
  programCode?: string;
  combinationCode?: string;
  eligible: boolean;
  missingFields: string[];
  details: Record<string, unknown>;
  warnings: string[];
};

export type GenericCertificateValue = { band: number };

export type GenericPayloadValue =
  | number
  | string
  | GenericCertificateValue
  | Record<string, number | GenericCertificateValue>;
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

function resolveCertificateScore(
  input: GenericInputField,
  band: number,
  warnings: string[],
): number {
  const levels =
    input.certificateLevels ??
    input.certificateConfig?.levels ??
    [];
  const converted = convertCertificate(levels, band);
  if (converted === null) {
    warnings.push(
      `${input.label}: chứng chỉ chưa đạt mức quy đổi tối thiểu, tính 0 điểm.`,
    );
    return 0;
  }
  return converted;
}

function validateNumericInput(
  input: GenericInputField,
  raw: unknown,
  errors: string[],
  scores: Map<string, number>,
) {
  const numericValue = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(numericValue)) {
    errors.push(`${input.label} phải là một số hợp lệ.`);
    return;
  }
  if (input.min !== undefined && numericValue < input.min) {
    errors.push(`${input.label} không được nhỏ hơn ${input.min}.`);
    return;
  }
  if (input.max !== undefined && numericValue > input.max) {
    errors.push(`${input.label} không được lớn hơn ${input.max}.`);
    return;
  }
  scores.set(input.key, numericValue);
}

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

    if (input.type === "subject_group") {
      if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
        const subjectRecord = raw as Record<string, unknown>;
        for (const [subjectKey, subjectValue] of Object.entries(subjectRecord)) {
          if (subjectValue === undefined || subjectValue === "") continue;
          if (
            typeof subjectValue === "object" &&
            subjectValue !== null &&
            "band" in subjectValue
          ) {
            const band = (subjectValue as { band: unknown }).band;
            if (typeof band === "number" && Number.isFinite(band)) {
              scores.set(subjectKey, band);
            }
          } else {
            const numericValue =
              typeof subjectValue === "number" ? subjectValue : Number(subjectValue);
            if (Number.isFinite(numericValue)) {
              if (numericValue < 0 || numericValue > 10) {
                warnings.push(`${subjectKey} nên nằm trong khoảng 0-10.`);
              }
              scores.set(subjectKey, numericValue);
            }
          }
        }
      } else if (input.required) {
        errors.push(`Thiếu trường bắt buộc: ${input.label}.`);
      }
      continue;
    }

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

    if (input.type === "certificate" || input.type === "certificate_rich") {
      const band = isCertificateValue(raw)
        ? raw.band
        : typeof raw === "number"
          ? raw
          : Number(raw);

      if (!Number.isFinite(band)) {
        errors.push(`${input.label} phải là một số hợp lệ.`);
        continue;
      }

      scores.set(input.key, resolveCertificateScore(input, band, warnings));
      continue;
    }

    validateNumericInput(input, raw, errors, scores);
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

function formatWeight(weight: number): string {
  const EPSILON = 1e-6;
  if (Math.abs(weight - 1) < EPSILON) return "";
  if (Math.abs(weight - 1 / 3) < EPSILON) return " × 1/3";
  if (Math.abs(weight - 1 / 9) < EPSILON) return " × 1/9";
  if (Math.abs(weight - 1 / 2) < EPSILON) return " × 1/2";
  if (Math.abs(weight - 1 / 4) < EPSILON) return " × 1/4";
  if (Math.abs(weight - 2 / 3) < EPSILON) return " × 2/3";
  if (Math.abs(weight - Math.round(weight)) < EPSILON) {
    return ` × ${Math.round(weight)}`;
  }
  return ` × ${weight.toFixed(2)}`;
}

function renderWeightedTerm(method: GenericMethodConfig, term: { inputKey: string; weight: number; maxOfInputKeys?: string[] }): string {
  if (term.maxOfInputKeys?.length) {
    const labels = term.maxOfInputKeys.map((key) => getInputLabel(method, key));
    return `max(${labels.join(", ")})${formatWeight(term.weight)}`;
  }
  return `${getInputLabel(method, term.inputKey)}${formatWeight(term.weight)}`;
}

function describeFormula(
  method: GenericMethodConfig,
  details: Record<string, unknown>,
): string {
  if (method.formula.type === "weighted_combination") {
    const terms = method.formula.terms
      .map((term) => renderWeightedTerm(method, term))
      .join(" + ");
    return `Điểm gốc = ${terms}. Thang điểm: ${method.formula.targetScale}.`;
  }

  if (method.formula.type === "formula_group_scale") {
    const selectedGroup =
      typeof details.formulaGroup === "string" ? details.formulaGroup : "";
    if (selectedGroup) {
      const group = method.formula.groups.find((item) => item.groupKey === selectedGroup);
      if (group) {
        const groupFormula = group.terms
          .map((term) => renderWeightedTerm(method, term))
          .join(" + ");
        return `Điểm gốc (${selectedGroup}) = ${groupFormula}. Thang điểm: ${group.scale}.`;
      }
      return `Công thức theo tổ hợp đã chọn (${selectedGroup}).`;
    }
    return `Công thức theo tổ hợp: ${method.formula.groups.map((g) => g.groupKey).join(", ")}.`;
  }

  return `Điểm gốc = ${getInputLabel(method, method.formula.inputKey)}. Quy đổi từ thang ${method.formula.fromScale} về thang 30.`;
}

function computeWeightedScore(
  method: GenericMethodConfig,
  scores: Map<string, number>,
  details: Record<string, unknown>,
) {
  if (method.formula.type !== "weighted_combination") {
    throw new Error("Expected weighted_combination formula.");
  }

  const combination = applyWeightedCombination(method.formula.terms, scores);
  const originalScale = method.formula.targetScale;
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

  let originalScore = withBonus.score;
  if (method.scoreClamp) {
    originalScore = clampScore(
      originalScore,
      method.scoreClamp.min,
      method.scoreClamp.max,
    );
  }

  details.priority = withBonus.priority;
  details.bonus = withBonus.bonus;

  return { originalScore, originalScale };
}

function computeFormulaGroupScore(
  method: GenericMethodConfig,
  payload: GenericPayload,
  scores: Map<string, number>,
  details: Record<string, unknown>,
) {
  if (method.formula.type !== "formula_group_scale") {
    throw new Error("Expected formula_group_scale formula.");
  }

  const groupKey = String(payload[method.formula.programGroupInputKey] ?? "");
  const entry = method.formula.groups.find((group) => group.groupKey === groupKey);

  if (!entry) {
    throw new Error(`Nhóm công thức "${groupKey}" không được hỗ trợ.`);
  }

  const groupResult = applyFormulaGroupEntry(entry, scores);
  details.breakdown = groupResult.breakdown;
  details.formulaGroup = groupResult.groupKey;

  const priority = method.priorityInputKey
    ? scores.get(method.priorityInputKey) ?? 0
    : 0;
  const bonuses = (method.bonusInputKeys ?? []).map(
    (key) => scores.get(key) ?? 0,
  );

  const withBonus = applyPriorityAndBonus(
    groupResult.score,
    priority,
    bonuses,
    groupResult.scale,
  );

  let originalScore = withBonus.score;
  if (method.scoreClamp) {
    originalScore = clampScore(
      originalScore,
      method.scoreClamp.min,
      method.scoreClamp.max,
    );
  }

  return { originalScore, originalScale: groupResult.scale };
}

export function interpretAdmission({
  config: rawConfig,
  methodCode,
  payload,
}: {
  config: GenericAdmissionConfig;
  methodCode: string;
  payload: unknown;
}): GenericAdmissionScoreResult {
  const config = migrateAdmissionConfig(rawConfig);
  const method = getMethodConfig(config, methodCode);
  if (!method) {
    throw new Error(
      `Phương thức "${methodCode}" không được hỗ trợ cho ${config.schoolName}.`,
    );
  }

  const payloadRecord =
    typeof payload === "object" && payload !== null
      ? (payload as GenericPayload)
      : {};

  const validation = validateGenericPayload(method, payload);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const { scores, warnings } = validation;
  const eligibility = evaluateGenericEligibility(method, payloadRecord);
  warnings.push(...eligibility.warnings);

  const details: Record<string, unknown> = {};
  let originalScore: number;
  let originalScale: number;

  if (method.formula.type === "weighted_combination") {
    ({ originalScore, originalScale } = computeWeightedScore(method, scores, details));
  } else if (method.formula.type === "formula_group_scale") {
    ({ originalScore, originalScale } = computeFormulaGroupScore(
      method,
      payloadRecord,
      scores,
      details,
    ));
  } else {
    const value = scores.get(method.formula.inputKey) ?? 0;
    originalScale = method.formula.fromScale;
    originalScore = Math.min(value, originalScale);
    if (method.scoreClamp) {
      originalScore = clampScore(
        originalScore,
        method.scoreClamp.min,
        method.scoreClamp.max,
      );
    }
  }

  const normalizedScore30 = Math.min(
    convertScale(originalScore, originalScale, 30),
    30,
  );

  const programCode = method.programInputKey
    ? String(payloadRecord[method.programInputKey] ?? "")
    : undefined;
  const combinationCode = method.combinationInputKey
    ? String(payloadRecord[method.combinationInputKey] ?? "")
    : undefined;

  return {
    schoolCode: config.schoolCode,
    method: method.methodCode,
    year: config.year,
    originalScore: Math.round(originalScore * 100) / 100,
    originalScale,
    normalizedScore30: Math.round(normalizedScore30 * 100) / 100,
    targetScale: 30,
    formulaUsed: describeFormula(method, details),
    benchmark30: method.benchmark30 ?? null,
    programCode: programCode || undefined,
    combinationCode: combinationCode || undefined,
    eligible: eligibility.eligible,
    missingFields: eligibility.missingFields,
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
