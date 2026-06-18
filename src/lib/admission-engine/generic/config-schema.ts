/**
 * Config-driven admission schema (v2).
 *
 * A single "generic" admission config describes how to compute an admission
 * score for ONE school + ONE year, purely as data.
 */

export type GenericFormulaType =
  | "weighted_combination"
  | "scale_conversion"
  | "formula_group_scale";

export type GenericInputType =
  | "number"
  | "certificate"
  | "certificate_rich"
  | "select"
  | "subject_group";

export type GenericSelectOption = {
  value: string;
  label: string;
};

export type GenericCertificateLevel = {
  band: number;
  convertedScore: number;
};

export type GenericCertificateConfig = {
  certificateType: string;
  mode: "band_table" | "structured";
  levels?: GenericCertificateLevel[];
};

export type GenericVisibilityRule = {
  when: { inputKey: string; equals: string };
};

export type GenericPriorityRule = {
  key: string;
  label: string;
  max: number;
  step?: number;
  options?: GenericSelectOption[];
};

export type GenericBonusRule = {
  key: string;
  label: string;
  max: number;
  step?: number;
  options?: GenericSelectOption[];
};

export type GenericEligibilityRule = {
  type: "min_score" | "max_bonus" | "required_input" | "min_subject";
  inputKey?: string;
  min?: number;
  max?: number;
  message: string;
};

export type GenericBranding = {
  primaryColor?: string;
  logoUrl?: string;
  heroImageUrl?: string;
};

export type GenericSubjectSlot = {
  key: string;
  label: string;
  weight?: number;
  required: boolean;
  type: "number" | "certificate" | "exam_or_certificate";
  min?: number;
  max?: number;
  certificateLevels?: GenericCertificateLevel[];
  maxOfInputKeys?: string[];
};

export type GenericSubjectCombination = {
  code: string;
  label: string;
  subjects: GenericSubjectSlot[];
  formulaOverride?: GenericFormula;
};

export type GenericProgramRef = {
  programCode: string;
  programName: string;
  formulaGroup?: string;
  combinations?: GenericSubjectCombination[];
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
  options?: GenericSelectOption[];
  certificateLevels?: GenericCertificateLevel[];
  certificateConfig?: GenericCertificateConfig;
  /** For subject_group: inline combinations or reference program combinations */
  combinations?: GenericSubjectCombination[];
  visibility?: GenericVisibilityRule[];
  note?: string;
};

export type GenericWeightedTerm = {
  inputKey: string;
  weight: number;
  /** When set, uses max of these keys instead of inputKey value (K01-style). */
  maxOfInputKeys?: string[];
};

export type GenericWeightedCombinationFormula = {
  type: "weighted_combination";
  terms: GenericWeightedTerm[];
  targetScale: number;
};

export type GenericScaleConversionFormula = {
  type: "scale_conversion";
  inputKey: string;
  fromScale: number;
};

export type GenericFormulaGroupEntry = {
  groupKey: string;
  scale: number;
  terms: GenericWeightedTerm[];
};

export type GenericFormulaGroupScaleFormula = {
  type: "formula_group_scale";
  programGroupInputKey: string;
  groups: GenericFormulaGroupEntry[];
};

export type GenericFormula =
  | GenericWeightedCombinationFormula
  | GenericScaleConversionFormula
  | GenericFormulaGroupScaleFormula;

export type GenericMethodUiTemplate =
  | "flat"
  | "thpt_combination"
  | "assessment_scale"
  | "direct_admission";

export type GenericMethodSourceRef = {
  url?: string;
  label?: string;
  excerpt?: string;
};

export type GenericMethodConfig = {
  methodCode: string;
  methodName: string;
  description?: string;
  requirements?: string[];
  sources?: GenericMethodSourceRef[];
  inputs: GenericInputField[];
  formula: GenericFormula;
  priorityInputKey?: string;
  bonusInputKeys?: string[];
  priorityRules?: GenericPriorityRule[];
  bonusRules?: GenericBonusRule[];
  benchmark30?: number | null;
  /** Links program dropdown value to benchmark lookup. */
  programInputKey?: string;
  combinationInputKey?: string;
  combinations?: GenericSubjectCombination[];
  uiTemplate?: GenericMethodUiTemplate;
  eligibilityRules?: GenericEligibilityRule[];
  /** Post-formula clamp on original scale. */
  scoreClamp?: { min?: number; max?: number };
  note?: string;
};

export type GenericProgramSource = "inline" | "db";
export type GenericBenchmarkSource = "inline" | "db" | "method_default";

export type GenericAdmissionConfig = {
  schemaVersion?: number;
  schoolCode: string;
  schoolName: string;
  year: number;
  methods: GenericMethodConfig[];
  programs?: GenericProgramRef[];
  programSource?: GenericProgramSource;
  benchmarkSource?: GenericBenchmarkSource;
  benchmarkYear?: number;
  branding?: GenericBranding;
  disclaimer?: string;
  sourceUrl?: string;
};

export type ConfigValidationResult =
  | { ok: true; config: GenericAdmissionConfig }
  | { ok: false; errors: string[] };

const FORMULA_TYPES: GenericFormulaType[] = [
  "weighted_combination",
  "scale_conversion",
  "formula_group_scale",
];
const INPUT_TYPES: GenericInputType[] = [
  "number",
  "certificate",
  "certificate_rich",
  "select",
  "subject_group",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateWeightedTerms(
  rawTerms: unknown,
  path: string,
  inputKeys: Set<string>,
  errors: string[],
): GenericWeightedTerm[] {
  if (!Array.isArray(rawTerms) || rawTerms.length === 0) {
    errors.push(`${path} must be a non-empty array.`);
    return [];
  }

  const terms: GenericWeightedTerm[] = [];
  rawTerms.forEach((term, index) => {
    if (
      !isRecord(term) ||
      !isNonEmptyString(term.inputKey) ||
      !isFiniteNumber(term.weight)
    ) {
      errors.push(
        `${path}[${index}] must have a string inputKey and numeric weight.`,
      );
      return;
    }
    if (!inputKeys.has(term.inputKey) && !Array.isArray(term.maxOfInputKeys)) {
      errors.push(
        `${path}[${index}].inputKey "${term.inputKey}" is not a declared input.`,
      );
      return;
    }
    const maxOfInputKeys = Array.isArray(term.maxOfInputKeys)
      ? (term.maxOfInputKeys as string[]).filter(isNonEmptyString)
      : undefined;
    terms.push({
      inputKey: term.inputKey as string,
      weight: term.weight as number,
      maxOfInputKeys,
    });
  });
  return terms;
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

  if (type === "certificate" || type === "certificate_rich") {
    const hasLevels =
      Array.isArray(raw.certificateLevels) && raw.certificateLevels.length > 0;
    if (!hasLevels && !isRecord(raw.certificateConfig)) {
      errors.push(
        `${path}.certificateLevels (hoặc certificateConfig.levels) phải là mảng không rỗng cho input chứng chỉ.`,
      );
    }
  }

  if (type === "select") {
    if (!Array.isArray(raw.options) || raw.options.length === 0) {
      errors.push(`${path}.options must be a non-empty array for select inputs.`);
    }
  }

  if (errors.some((e) => e.startsWith(path))) return null;

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
    certificateConfig: isRecord(raw.certificateConfig)
      ? (raw.certificateConfig as GenericCertificateConfig)
      : undefined,
    combinations: Array.isArray(raw.combinations)
      ? (raw.combinations as GenericSubjectCombination[])
      : undefined,
    visibility: Array.isArray(raw.visibility)
      ? (raw.visibility as GenericVisibilityRule[])
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
    const terms = validateWeightedTerms(raw.terms, `${path}.terms`, inputKeys, errors);
    if (!isFiniteNumber(raw.targetScale) || raw.targetScale <= 0) {
      errors.push(`${path}.targetScale must be a positive number.`);
    }
    if (errors.length) return null;
    return { type: "weighted_combination", terms, targetScale: raw.targetScale as number };
  }

  if (raw.type === "formula_group_scale") {
    if (!isNonEmptyString(raw.programGroupInputKey)) {
      errors.push(`${path}.programGroupInputKey must be a non-empty string.`);
    }
    if (!Array.isArray(raw.groups) || raw.groups.length === 0) {
      errors.push(`${path}.groups must be a non-empty array.`);
      return null;
    }
    const groups: GenericFormulaGroupEntry[] = [];
    raw.groups.forEach((group, index) => {
      if (!isRecord(group) || !isNonEmptyString(group.groupKey) || !isFiniteNumber(group.scale)) {
        errors.push(`${path}.groups[${index}] must have groupKey and scale.`);
        return;
      }
      const terms = validateWeightedTerms(
        group.terms,
        `${path}.groups[${index}].terms`,
        inputKeys,
        errors,
      );
      groups.push({
        groupKey: group.groupKey as string,
        scale: group.scale as number,
        terms,
      });
    });
    if (errors.length) return null;
    return {
      type: "formula_group_scale",
      programGroupInputKey: raw.programGroupInputKey as string,
      groups,
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

function sanitizeMethodRequirements(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const requirements = raw
    .filter(isNonEmptyString)
    .map((item) => item.trim())
    .filter(Boolean);
  return requirements.length ? requirements : undefined;
}

function sanitizeMethodSources(raw: unknown): GenericMethodSourceRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const sources = raw
    .map((item) => {
      if (!isRecord(item)) return null;
      const url = isNonEmptyString(item.url) ? item.url.trim() : undefined;
      const label = isNonEmptyString(item.label) ? item.label.trim() : undefined;
      const excerpt = isNonEmptyString(item.excerpt)
        ? item.excerpt.trim()
        : undefined;
      if (!url && !label && !excerpt) return null;
      const source: GenericMethodSourceRef = {};
      if (url) source.url = url;
      if (label) source.label = label;
      if (excerpt) source.excerpt = excerpt;
      return source;
    })
    .filter((item): item is GenericMethodSourceRef => item !== null);
  return sources.length ? sources : undefined;
}

function createDirectAdmissionSyntheticInput(): GenericInputField {
  return {
    key: "synthetic_score",
    label: "Điểm tổng hợp (hệ thống tự điền)",
    type: "number",
    required: false,
    min: 0,
    max: 30,
    step: 0.01,
    note: "Phương thức xét tuyển thẳng dùng thông tin điều kiện, không yêu cầu thí sinh nhập điểm quy đổi.",
  };
}

function createSchemaFallbackInput(): GenericInputField {
  return {
    key: "synthetic_score",
    label: "Điểm tạm (cần admin rà soát cấu hình)",
    type: "number",
    required: false,
    min: 0,
    max: 30,
    step: 0.01,
    note: "Fallback tự động khi AI chưa trích xuất đủ inputs cho phương thức này.",
  };
}

function normalizeMethodMinimumSchema(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...raw };
  const hasInputs = Array.isArray(raw.inputs) && raw.inputs.length > 0;
  if (!hasInputs) {
    normalized.inputs = [createSchemaFallbackInput()];
  }

  const fallbackInputKey =
    Array.isArray(normalized.inputs) &&
    normalized.inputs.some(
      (item) => isRecord(item) && isNonEmptyString(item.key),
    )
      ? ((normalized.inputs as unknown[]).find(
          (item) => isRecord(item) && isNonEmptyString(item.key),
        ) as Record<string, unknown>).key
      : "synthetic_score";

  if (!isRecord(raw.formula)) {
    normalized.formula = {
      type: "scale_conversion",
      inputKey: fallbackInputKey,
      fromScale: 30,
    };
  }

  return normalized;
}

function normalizeDirectAdmissionMethod(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const uiTemplate = isNonEmptyString(raw.uiTemplate)
    ? (raw.uiTemplate as GenericMethodUiTemplate)
    : undefined;
  if (uiTemplate !== "direct_admission") {
    return raw;
  }

  const normalized: Record<string, unknown> = { ...raw };

  const normalizedInputs: GenericInputField[] = Array.isArray(raw.inputs)
    ? raw.inputs
        .filter(isRecord)
        .map((item) => ({
          ...(item as Record<string, unknown>),
          key: isNonEmptyString(item.key) ? item.key : "",
          label: isNonEmptyString(item.label) ? item.label : "",
          type: (item.type as GenericInputType) ?? "number",
          required: Boolean(item.required),
        }))
        .filter((item) => isNonEmptyString(item.key))
    : [];

  if (!normalizedInputs.length) {
    normalized.inputs = [createDirectAdmissionSyntheticInput()];
  } else {
    const hasSynthetic = normalizedInputs.some(
      (item) => item.key === "synthetic_score",
    );
    normalized.inputs = hasSynthetic
      ? normalizedInputs
      : [...normalizedInputs, createDirectAdmissionSyntheticInput()];
  }

  if (!isRecord(raw.formula)) {
    normalized.formula = {
      type: "scale_conversion",
      inputKey: "synthetic_score",
      fromScale: 30,
    };
  }

  return normalized;
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

  const normalizedRaw = normalizeMethodMinimumSchema(
    normalizeDirectAdmissionMethod(raw),
  );

  if (!isNonEmptyString(normalizedRaw.methodCode)) {
    errors.push(`${path}.methodCode must be a non-empty string.`);
  }
  if (!isNonEmptyString(normalizedRaw.methodName)) {
    errors.push(`${path}.methodName must be a non-empty string.`);
  }
  if (!Array.isArray(normalizedRaw.inputs) || normalizedRaw.inputs.length === 0) {
    errors.push(`${path}.inputs must be a non-empty array.`);
    return null;
  }

  const inputs: GenericInputField[] = [];
  normalizedRaw.inputs.forEach((input, index) => {
    const validated = validateInputField(input, `${path}.inputs[${index}]`, errors);
    if (validated) inputs.push(validated);
  });

  const inputKeys = new Set(inputs.map((input) => input.key));
  const formula = validateFormula(
    normalizedRaw.formula,
    `${path}.formula`,
    inputKeys,
    errors,
  );

  if (
    normalizedRaw.priorityInputKey !== undefined &&
    normalizedRaw.priorityInputKey !== null
  ) {
    if (
      !isNonEmptyString(normalizedRaw.priorityInputKey) ||
      !inputKeys.has(normalizedRaw.priorityInputKey)
    ) {
      errors.push(`${path}.priorityInputKey must reference a declared input.`);
    }
  }

  if (normalizedRaw.bonusInputKeys !== undefined && normalizedRaw.bonusInputKeys !== null) {
    if (!Array.isArray(normalizedRaw.bonusInputKeys)) {
      errors.push(`${path}.bonusInputKeys must be an array.`);
    } else {
      normalizedRaw.bonusInputKeys.forEach((key, index) => {
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
    methodCode: normalizedRaw.methodCode as string,
    methodName: normalizedRaw.methodName as string,
    description: isNonEmptyString(normalizedRaw.description)
      ? normalizedRaw.description
      : undefined,
    requirements: sanitizeMethodRequirements(normalizedRaw.requirements),
    sources: sanitizeMethodSources(normalizedRaw.sources),
    inputs,
    formula,
    priorityInputKey: isNonEmptyString(normalizedRaw.priorityInputKey)
      ? normalizedRaw.priorityInputKey
      : undefined,
    bonusInputKeys: Array.isArray(normalizedRaw.bonusInputKeys)
      ? (normalizedRaw.bonusInputKeys as string[]).filter(isNonEmptyString)
      : undefined,
    priorityRules: Array.isArray(normalizedRaw.priorityRules)
      ? (normalizedRaw.priorityRules as GenericPriorityRule[])
      : undefined,
    bonusRules: Array.isArray(normalizedRaw.bonusRules)
      ? (normalizedRaw.bonusRules as GenericBonusRule[])
      : undefined,
    benchmark30: isFiniteNumber(normalizedRaw.benchmark30)
      ? normalizedRaw.benchmark30
      : null,
    programInputKey: isNonEmptyString(normalizedRaw.programInputKey)
      ? normalizedRaw.programInputKey
      : undefined,
    combinationInputKey: isNonEmptyString(normalizedRaw.combinationInputKey)
      ? normalizedRaw.combinationInputKey
      : undefined,
    combinations: Array.isArray(normalizedRaw.combinations)
      ? (normalizedRaw.combinations as GenericSubjectCombination[])
      : undefined,
    uiTemplate: isNonEmptyString(normalizedRaw.uiTemplate)
      ? (normalizedRaw.uiTemplate as GenericMethodUiTemplate)
      : undefined,
    eligibilityRules: Array.isArray(normalizedRaw.eligibilityRules)
      ? (normalizedRaw.eligibilityRules as GenericEligibilityRule[])
      : undefined,
    scoreClamp: isRecord(normalizedRaw.scoreClamp)
      ? {
          min: isFiniteNumber(normalizedRaw.scoreClamp.min)
            ? normalizedRaw.scoreClamp.min
            : undefined,
          max: isFiniteNumber(normalizedRaw.scoreClamp.max)
            ? normalizedRaw.scoreClamp.max
            : undefined,
        }
      : undefined,
    note: isNonEmptyString(normalizedRaw.note) ? normalizedRaw.note : undefined,
  };
}

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
      schemaVersion: isFiniteNumber(raw.schemaVersion) ? raw.schemaVersion : 2,
      schoolCode: (raw.schoolCode as string).toUpperCase(),
      schoolName: raw.schoolName as string,
      year: raw.year as number,
      methods,
      programs: Array.isArray(raw.programs)
        ? (raw.programs as GenericProgramRef[])
        : undefined,
      programSource: isNonEmptyString(raw.programSource)
        ? (raw.programSource as GenericProgramSource)
        : undefined,
      benchmarkSource: isNonEmptyString(raw.benchmarkSource)
        ? (raw.benchmarkSource as GenericBenchmarkSource)
        : undefined,
      benchmarkYear: isFiniteNumber(raw.benchmarkYear) ? raw.benchmarkYear : undefined,
      branding: isRecord(raw.branding)
        ? (raw.branding as GenericBranding)
        : undefined,
      disclaimer: isNonEmptyString(raw.disclaimer) ? raw.disclaimer : undefined,
      sourceUrl: isNonEmptyString(raw.sourceUrl) ? raw.sourceUrl : undefined,
    },
  };
}
