/**
 * Config-driven admission schema.
 *
 * A single "generic" admission config describes how to compute an admission
 * score for ONE school + ONE year, purely as data. The generic interpreter
 * (see ./interpreter.ts) reads this config and produces an admission score
 * without any school-specific code. This is what lets us add a brand new
 * school from a PDF without shipping new TypeScript.
 *
 * The shared formula vocabulary ("primitives") lives in ./primitives. Each
 * school is just a different combination of those primitives expressed here.
 */

export type GenericFormulaType = "weighted_combination" | "scale_conversion";

export type GenericInputType = "number" | "certificate" | "select";

export type GenericSelectOption = {
  value: string;
  label: string;
};

/**
 * One row of a certificate conversion table, e.g. IELTS 7.0 -> 10 điểm.
 * `band` is the minimum certificate value that earns `convertedScore`.
 */
export type GenericCertificateLevel = {
  band: number;
  convertedScore: number;
};

export type GenericInputField = {
  key: string;
  label: string;
  type: GenericInputType;
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Only for `select` inputs. */
  options?: GenericSelectOption[];
  /** Only for `certificate` inputs. Sorted ascending by band at runtime. */
  certificateLevels?: GenericCertificateLevel[];
  note?: string;
};

export type GenericWeightedTerm = {
  inputKey: string;
  weight: number;
};

/**
 * Sum of (input value * weight), then normalized to 30. Used for THPT-style
 * combinations and most subject-based formulas.
 */
export type GenericWeightedCombinationFormula = {
  type: "weighted_combination";
  terms: GenericWeightedTerm[];
  /** Original scale the weighted sum is expressed on (e.g. 30). */
  targetScale: number;
};

/**
 * Linearly rescales a single score from `fromScale` to 30. Used for exams on
 * other scales: TSA (100), HSA (150), SAT (1600), etc.
 */
export type GenericScaleConversionFormula = {
  type: "scale_conversion";
  inputKey: string;
  fromScale: number;
};

export type GenericFormula =
  | GenericWeightedCombinationFormula
  | GenericScaleConversionFormula;

export type GenericMethodConfig = {
  methodCode: string;
  methodName: string;
  description?: string;
  inputs: GenericInputField[];
  formula: GenericFormula;
  /** Input key whose value is added after the formula (priority points). */
  priorityInputKey?: string;
  /** Input keys whose values are added after the formula (bonus points). */
  bonusInputKeys?: string[];
  /** Reference cutoff already normalized to the 30 scale, if known. */
  benchmark30?: number | null;
  note?: string;
};

export type GenericAdmissionConfig = {
  schoolCode: string;
  schoolName: string;
  year: number;
  methods: GenericMethodConfig[];
  disclaimer?: string;
  sourceUrl?: string;
};

export type ConfigValidationResult =
  | { ok: true; config: GenericAdmissionConfig }
  | { ok: false; errors: string[] };

const FORMULA_TYPES: GenericFormulaType[] = [
  "weighted_combination",
  "scale_conversion",
];
const INPUT_TYPES: GenericInputType[] = ["number", "certificate", "select"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateInputField(
  raw: unknown,
  path: string,
  errors: string[],
): GenericInputField | null {
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  if (!isNonEmptyString(raw.key)) {
    errors.push(`${path}.key must be a non-empty string.`);
  }
  if (!isNonEmptyString(raw.label)) {
    errors.push(`${path}.label must be a non-empty string.`);
  }
  if (!INPUT_TYPES.includes(raw.type as GenericInputType)) {
    errors.push(`${path}.type must be one of ${INPUT_TYPES.join(", ")}.`);
  }

  const type = raw.type as GenericInputType;

  if (type === "certificate") {
    if (!Array.isArray(raw.certificateLevels) || raw.certificateLevels.length === 0) {
      errors.push(`${path}.certificateLevels must be a non-empty array.`);
    } else {
      raw.certificateLevels.forEach((level, index) => {
        if (
          !isRecord(level) ||
          !isFiniteNumber(level.band) ||
          !isFiniteNumber(level.convertedScore)
        ) {
          errors.push(
            `${path}.certificateLevels[${index}] must have numeric band and convertedScore.`,
          );
        }
      });
    }
  }

  if (type === "select") {
    if (!Array.isArray(raw.options) || raw.options.length === 0) {
      errors.push(`${path}.options must be a non-empty array for select inputs.`);
    }
  }

  if (errors.length) return null;

  return {
    key: raw.key as string,
    label: raw.label as string,
    type,
    required: Boolean(raw.required),
    min: isFiniteNumber(raw.min) ? raw.min : undefined,
    max: isFiniteNumber(raw.max) ? raw.max : undefined,
    step: isFiniteNumber(raw.step) ? raw.step : undefined,
    unit: isNonEmptyString(raw.unit) ? raw.unit : undefined,
    options: Array.isArray(raw.options)
      ? (raw.options as GenericSelectOption[])
      : undefined,
    certificateLevels: Array.isArray(raw.certificateLevels)
      ? [...(raw.certificateLevels as GenericCertificateLevel[])].sort(
          (a, b) => a.band - b.band,
        )
      : undefined,
    note: isNonEmptyString(raw.note) ? raw.note : undefined,
  };
}

function validateFormula(
  raw: unknown,
  path: string,
  inputKeys: Set<string>,
  errors: string[],
): GenericFormula | null {
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  if (!FORMULA_TYPES.includes(raw.type as GenericFormulaType)) {
    errors.push(`${path}.type must be one of ${FORMULA_TYPES.join(", ")}.`);
    return null;
  }

  if (raw.type === "weighted_combination") {
    if (!Array.isArray(raw.terms) || raw.terms.length === 0) {
      errors.push(`${path}.terms must be a non-empty array.`);
      return null;
    }

    const terms: GenericWeightedTerm[] = [];
    raw.terms.forEach((term, index) => {
      if (
        !isRecord(term) ||
        !isNonEmptyString(term.inputKey) ||
        !isFiniteNumber(term.weight)
      ) {
        errors.push(
          `${path}.terms[${index}] must have a string inputKey and numeric weight.`,
        );
        return;
      }
      if (!inputKeys.has(term.inputKey)) {
        errors.push(
          `${path}.terms[${index}].inputKey "${term.inputKey}" is not a declared input.`,
        );
        return;
      }
      terms.push({ inputKey: term.inputKey, weight: term.weight });
    });

    if (!isFiniteNumber(raw.targetScale) || raw.targetScale <= 0) {
      errors.push(`${path}.targetScale must be a positive number.`);
    }

    if (errors.length) return null;

    return {
      type: "weighted_combination",
      terms,
      targetScale: raw.targetScale as number,
    };
  }

  if (!isNonEmptyString(raw.inputKey) || !inputKeys.has(raw.inputKey)) {
    errors.push(`${path}.inputKey must reference a declared input.`);
  }
  if (!isFiniteNumber(raw.fromScale) || raw.fromScale <= 0) {
    errors.push(`${path}.fromScale must be a positive number.`);
  }

  if (errors.length) return null;

  return {
    type: "scale_conversion",
    inputKey: raw.inputKey as string,
    fromScale: raw.fromScale as number,
  };
}

function validateMethod(
  raw: unknown,
  path: string,
  errors: string[],
): GenericMethodConfig | null {
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object.`);
    return null;
  }

  if (!isNonEmptyString(raw.methodCode)) {
    errors.push(`${path}.methodCode must be a non-empty string.`);
  }
  if (!isNonEmptyString(raw.methodName)) {
    errors.push(`${path}.methodName must be a non-empty string.`);
  }
  if (!Array.isArray(raw.inputs) || raw.inputs.length === 0) {
    errors.push(`${path}.inputs must be a non-empty array.`);
    return null;
  }

  const inputs: GenericInputField[] = [];
  raw.inputs.forEach((input, index) => {
    const validated = validateInputField(input, `${path}.inputs[${index}]`, errors);
    if (validated) inputs.push(validated);
  });

  const inputKeys = new Set(inputs.map((input) => input.key));
  const formula = validateFormula(raw.formula, `${path}.formula`, inputKeys, errors);

  if (raw.priorityInputKey !== undefined && raw.priorityInputKey !== null) {
    if (
      !isNonEmptyString(raw.priorityInputKey) ||
      !inputKeys.has(raw.priorityInputKey)
    ) {
      errors.push(`${path}.priorityInputKey must reference a declared input.`);
    }
  }

  if (raw.bonusInputKeys !== undefined && raw.bonusInputKeys !== null) {
    if (!Array.isArray(raw.bonusInputKeys)) {
      errors.push(`${path}.bonusInputKeys must be an array.`);
    } else {
      raw.bonusInputKeys.forEach((key, index) => {
        if (!isNonEmptyString(key) || !inputKeys.has(key)) {
          errors.push(
            `${path}.bonusInputKeys[${index}] must reference a declared input.`,
          );
        }
      });
    }
  }

  if (!formula || errors.length) return null;

  return {
    methodCode: raw.methodCode as string,
    methodName: raw.methodName as string,
    description: isNonEmptyString(raw.description) ? raw.description : undefined,
    inputs,
    formula,
    priorityInputKey: isNonEmptyString(raw.priorityInputKey)
      ? raw.priorityInputKey
      : undefined,
    bonusInputKeys: Array.isArray(raw.bonusInputKeys)
      ? (raw.bonusInputKeys as string[]).filter(isNonEmptyString)
      : undefined,
    benchmark30: isFiniteNumber(raw.benchmark30) ? raw.benchmark30 : null,
    note: isNonEmptyString(raw.note) ? raw.note : undefined,
  };
}

/**
 * Strictly validates an unknown value as a GenericAdmissionConfig. Returns the
 * parsed config or a list of human-readable errors. This is the single source
 * of truth used by the admin save endpoint, the publish endpoint, and the
 * runtime interpreter.
 */
export function validateAdmissionConfig(raw: unknown): ConfigValidationResult {
  const errors: string[] = [];

  if (!isRecord(raw)) {
    return { ok: false, errors: ["Config must be a JSON object."] };
  }

  if (!isNonEmptyString(raw.schoolCode)) {
    errors.push("schoolCode must be a non-empty string.");
  }
  if (!isNonEmptyString(raw.schoolName)) {
    errors.push("schoolName must be a non-empty string.");
  }
  if (!isFiniteNumber(raw.year) || !Number.isInteger(raw.year)) {
    errors.push("year must be an integer.");
  }
  if (!Array.isArray(raw.methods) || raw.methods.length === 0) {
    errors.push("methods must be a non-empty array.");
  }

  const methods: GenericMethodConfig[] = [];
  if (Array.isArray(raw.methods)) {
    raw.methods.forEach((method, index) => {
      const validated = validateMethod(method, `methods[${index}]`, errors);
      if (validated) methods.push(validated);
    });

    const methodCodes = methods.map((method) => method.methodCode);
    const duplicates = methodCodes.filter(
      (code, index) => methodCodes.indexOf(code) !== index,
    );
    if (duplicates.length) {
      errors.push(`Duplicate methodCode(s): ${[...new Set(duplicates)].join(", ")}.`);
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    config: {
      schoolCode: (raw.schoolCode as string).toUpperCase(),
      schoolName: raw.schoolName as string,
      year: raw.year as number,
      methods,
      disclaimer: isNonEmptyString(raw.disclaimer) ? raw.disclaimer : undefined,
      sourceUrl: isNonEmptyString(raw.sourceUrl) ? raw.sourceUrl : undefined,
    },
  };
}
