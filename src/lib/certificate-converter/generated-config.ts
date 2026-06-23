import type { MethodApplicabilityResult } from "./types";

export type GeneratedConversionMode =
  | "numeric_range"
  | "text_match"
  | "toeic_four_skills";

export type GeneratedScoreField = "subject_score" | "bonus_score";

export type GeneratedCertificateRuleEntry = {
  minScore?: number;
  maxScore?: number;
  textValue?: string;
  bandId?: string;
  skillName?: "listening" | "speaking" | "reading" | "writing";
  convertedScore: number;
};

export type GeneratedCertificateRule = {
  certificateType: string;
  mode: GeneratedConversionMode;
  scoreField: GeneratedScoreField;
  reason: string;
  conditions?: string[];
  entries: GeneratedCertificateRuleEntry[];
};

export type GeneratedCertificateMethod = {
  methodCode: string;
  methodName: string;
  applicability: "direct" | "conditional";
  note?: string;
  rules: GeneratedCertificateRule[];
  sourceEvidence?: string[];
};

export type GeneratedCertificateConfig = {
  schoolCode: string;
  schoolName: string;
  year: number;
  methods: GeneratedCertificateMethod[];
};

export type GeneratedCertificateValidationResult =
  | { ok: true; config: GeneratedCertificateConfig }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateGeneratedCertificateConfig(
  raw: unknown,
): GeneratedCertificateValidationResult {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { ok: false, errors: ["Config phải là JSON object."] };
  }

  if (!isNonEmptyString(raw.schoolCode)) {
    errors.push("schoolCode phải là chuỗi không rỗng.");
  }
  if (!isNonEmptyString(raw.schoolName)) {
    errors.push("schoolName phải là chuỗi không rỗng.");
  }
  if (!isFiniteNumber(raw.year) || !Number.isInteger(raw.year)) {
    errors.push("year phải là số nguyên.");
  }
  if (!Array.isArray(raw.methods) || raw.methods.length === 0) {
    errors.push("methods phải là mảng không rỗng.");
  }

  const methods: GeneratedCertificateMethod[] = [];
  if (Array.isArray(raw.methods)) {
    raw.methods.forEach((methodRaw, methodIndex) => {
      if (!isRecord(methodRaw)) {
        errors.push(`methods[${methodIndex}] phải là object.`);
        return;
      }

      if (!isNonEmptyString(methodRaw.methodCode)) {
        errors.push(`methods[${methodIndex}].methodCode bắt buộc.`);
      }
      if (!isNonEmptyString(methodRaw.methodName)) {
        errors.push(`methods[${methodIndex}].methodName bắt buộc.`);
      }
      if (
        methodRaw.applicability !== "direct" &&
        methodRaw.applicability !== "conditional"
      ) {
        errors.push(
          `methods[${methodIndex}].applicability phải là direct hoặc conditional.`,
        );
      }
      if (!Array.isArray(methodRaw.rules) || methodRaw.rules.length === 0) {
        errors.push(`methods[${methodIndex}].rules phải là mảng không rỗng.`);
        return;
      }

      const rules: GeneratedCertificateRule[] = [];
      if (Array.isArray(methodRaw.rules)) {
        methodRaw.rules.forEach((ruleRaw, ruleIndex) => {
          if (!isRecord(ruleRaw)) {
            errors.push(
              `methods[${methodIndex}].rules[${ruleIndex}] phải là object.`,
            );
            return;
          }

          if (!isNonEmptyString(ruleRaw.certificateType)) {
            errors.push(
              `methods[${methodIndex}].rules[${ruleIndex}].certificateType bắt buộc.`,
            );
          }
          if (
            ruleRaw.mode !== "numeric_range" &&
            ruleRaw.mode !== "text_match" &&
            ruleRaw.mode !== "toeic_four_skills"
          ) {
            errors.push(
              `methods[${methodIndex}].rules[${ruleIndex}].mode không hợp lệ.`,
            );
          }
          if (
            ruleRaw.scoreField !== "subject_score" &&
            ruleRaw.scoreField !== "bonus_score"
          ) {
            errors.push(
              `methods[${methodIndex}].rules[${ruleIndex}].scoreField không hợp lệ.`,
            );
          }
          if (!isNonEmptyString(ruleRaw.reason)) {
            errors.push(
              `methods[${methodIndex}].rules[${ruleIndex}].reason bắt buộc.`,
            );
          }
          if (!Array.isArray(ruleRaw.entries) || ruleRaw.entries.length === 0) {
            errors.push(
              `methods[${methodIndex}].rules[${ruleIndex}].entries phải là mảng không rỗng.`,
            );
            return;
          }

          const entries: GeneratedCertificateRuleEntry[] = [];
          if (Array.isArray(ruleRaw.entries)) {
            ruleRaw.entries.forEach((entryRaw, entryIndex) => {
              if (!isRecord(entryRaw)) {
                errors.push(
                  `methods[${methodIndex}].rules[${ruleIndex}].entries[${entryIndex}] phải là object.`,
                );
                return;
              }
              if (!isFiniteNumber(entryRaw.convertedScore)) {
                errors.push(
                  `methods[${methodIndex}].rules[${ruleIndex}].entries[${entryIndex}].convertedScore phải là số.`,
                );
              }
              entries.push({
                minScore: isFiniteNumber(entryRaw.minScore)
                  ? entryRaw.minScore
                  : undefined,
                maxScore: isFiniteNumber(entryRaw.maxScore)
                  ? entryRaw.maxScore
                  : undefined,
                textValue: isNonEmptyString(entryRaw.textValue)
                  ? entryRaw.textValue.trim()
                  : undefined,
                bandId: isNonEmptyString(entryRaw.bandId)
                  ? entryRaw.bandId.trim()
                  : undefined,
                skillName:
                  entryRaw.skillName === "listening" ||
                  entryRaw.skillName === "speaking" ||
                  entryRaw.skillName === "reading" ||
                  entryRaw.skillName === "writing"
                    ? entryRaw.skillName
                    : undefined,
                convertedScore: isFiniteNumber(entryRaw.convertedScore)
                  ? entryRaw.convertedScore
                  : 0,
              });
            });
          }

          rules.push({
            certificateType: String(ruleRaw.certificateType).trim().toUpperCase(),
            mode: ruleRaw.mode as GeneratedConversionMode,
            scoreField: ruleRaw.scoreField as GeneratedScoreField,
            reason: String(ruleRaw.reason).trim(),
            conditions: Array.isArray(ruleRaw.conditions)
              ? ruleRaw.conditions.filter(isNonEmptyString).map((item) => item.trim())
              : undefined,
            entries,
          });
        });
      }

      methods.push({
        methodCode: String(methodRaw.methodCode ?? "").trim(),
        methodName: String(methodRaw.methodName ?? "").trim(),
        applicability: methodRaw.applicability as "direct" | "conditional",
        note: isNonEmptyString(methodRaw.note) ? methodRaw.note.trim() : undefined,
        rules,
        sourceEvidence: Array.isArray(methodRaw.sourceEvidence)
          ? methodRaw.sourceEvidence
              .filter(isNonEmptyString)
              .map((item) => item.trim())
          : undefined,
      });
    });
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    config: {
      schoolCode: String(raw.schoolCode).trim().toUpperCase(),
      schoolName: String(raw.schoolName).trim(),
      year: Number(raw.year),
      methods,
    },
  };
}

function normalizeText(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchNumericEntry(
  score: number | undefined,
  entry: GeneratedCertificateRuleEntry,
) {
  if (score === undefined) return false;
  const min = entry.minScore ?? Number.NEGATIVE_INFINITY;
  const max = entry.maxScore ?? Number.POSITIVE_INFINITY;
  return score >= min && score <= max;
}

function resolveRuleConvertedScore(
  rule: GeneratedCertificateRule,
  input: {
    score?: number;
    textValue?: string;
    bandId?: string;
    toeic?: Partial<Record<"listening" | "speaking" | "reading" | "writing", number>>;
  },
) {
  if (rule.mode === "numeric_range") {
    const matched = rule.entries.find((entry) => matchNumericEntry(input.score, entry));
    return matched?.convertedScore ?? null;
  }

  if (rule.mode === "text_match") {
    const scoreText = input.score !== undefined ? String(input.score) : undefined;
    const candidates = [input.textValue, input.bandId, scoreText]
      .map(normalizeText)
      .filter(Boolean);
    const matched = rule.entries.find((entry) => {
      const textMatches = [entry.textValue, entry.bandId]
        .map(normalizeText)
        .filter(Boolean);
      return candidates.some((candidate) => textMatches.includes(candidate));
    });
    return matched?.convertedScore ?? null;
  }

  if (!input.toeic) return null;
  const skillNames: Array<"listening" | "speaking" | "reading" | "writing"> = [
    "listening",
    "speaking",
    "reading",
    "writing",
  ];
  const scores: number[] = [];

  for (const skillName of skillNames) {
    const skillScore = input.toeic[skillName];
    const matched = rule.entries.find(
      (entry) =>
        entry.skillName === skillName && matchNumericEntry(skillScore, entry),
    );
    if (!matched) return null;
    scores.push(matched.convertedScore);
  }

  if (!scores.length) return null;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

export function evaluateGeneratedCertificateConfig(
  config: GeneratedCertificateConfig,
  input: {
    certificateType: string;
    score?: number;
    textValue?: string;
    bandId?: string;
    toeic?: Partial<Record<"listening" | "speaking" | "reading" | "writing", number>>;
  },
): MethodApplicabilityResult[] {
  const normalizedCertificateType = input.certificateType.toUpperCase();

  return config.methods.map((method) => {
    const matchedRule = method.rules.find(
      (rule) => rule.certificateType === normalizedCertificateType,
    );

    if (!matchedRule) {
      return {
        schoolCode: config.schoolCode,
        schoolName: config.schoolName,
        methodCode: method.methodCode,
        methodName: method.methodName,
        status: "not_applicable",
        convertedScore: null,
        scoreUnit: "/10",
        reason: "Phương thức không có quy đổi cho loại chứng chỉ này.",
        notes: method.note ? [method.note] : [],
        sourceLabel: "Generated certificate config draft",
      };
    }

    const convertedScore = resolveRuleConvertedScore(matchedRule, input);
    if (convertedScore === null) {
      return {
        schoolCode: config.schoolCode,
        schoolName: config.schoolName,
        methodCode: method.methodCode,
        methodName: method.methodName,
        status: method.applicability === "conditional" ? "conditional" : "not_applicable",
        convertedScore: null,
        scoreUnit: "/10",
        reason:
          method.applicability === "conditional"
            ? "Có thể áp dụng nhưng cần nhập đúng định dạng/điều kiện chứng chỉ."
            : "Không tìm thấy mức quy đổi phù hợp trong phương thức này.",
        notes: matchedRule.conditions ?? [],
        sourceLabel: "Generated certificate config draft",
      };
    }

    return {
      schoolCode: config.schoolCode,
      schoolName: config.schoolName,
      methodCode: method.methodCode,
      methodName: method.methodName,
      status: method.applicability === "conditional" ? "conditional" : "applicable",
      convertedScore,
      scoreUnit: "/10",
      reason: matchedRule.reason,
      notes: [
        ...(matchedRule.conditions ?? []),
        ...(method.note ? [method.note] : []),
      ],
      sourceLabel: "Generated certificate config draft",
    };
  });
}
