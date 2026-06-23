import type { GenericInputField } from "@/src/lib/admission-engine/generic";

type NormalizeResult = {
  draft: Record<string, unknown>;
  warnings: string[];
};

const IELTS_SIGNAL_REGEX = /\bIELTS\b/i;
const IELTS_THRESHOLD_REGEX = /\bIELTS\b[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?)/gi;
const CONVERTED_SCORE_INPUT_HINTS = [
  "diem_quy_doi",
  "điểm quy đổi",
  "quy doi",
  "quy đổi",
  "chứng chỉ",
  "chung chi",
  "ielts",
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getMethodContext(method: Record<string, unknown>): string {
  const requirements = Array.isArray(method.requirements)
    ? method.requirements.filter(isNonEmptyString).join(" ")
    : "";
  const description = isNonEmptyString(method.description) ? method.description : "";
  const note = isNonEmptyString(method.note) ? method.note : "";
  return `${description} ${note} ${requirements}`.trim();
}

function extractIeltsThresholds(text: string): number[] {
  const values = new Set<number>();
  let match: RegExpExecArray | null = null;
  while ((match = IELTS_THRESHOLD_REGEX.exec(text)) !== null) {
    const raw = match[1]?.replace(",", ".");
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed)) {
      values.add(parsed);
    }
  }
  return [...values].sort((a, b) => a - b);
}

function hasCertificateInput(inputs: unknown[]): boolean {
  return inputs.some(
    (input) =>
      isRecord(input) &&
      (input.type === "certificate" || input.type === "certificate_rich"),
  );
}

function findConvertedScoreInputIndex(inputs: unknown[]): number {
  return inputs.findIndex((input) => {
    if (!isRecord(input) || input.type !== "number") return false;
    const key = String(input.key ?? "").toLowerCase();
    const label = String(input.label ?? "").toLowerCase();
    return CONVERTED_SCORE_INPUT_HINTS.some(
      (hint) => key.includes(hint) || label.includes(hint),
    );
  });
}

function buildCertificateLevels(
  thresholds: number[],
  minScore: number,
  maxScore: number,
) {
  const safeMin = clamp(minScore, 0, 10);
  const safeMax = clamp(maxScore, safeMin, 10);

  if (!thresholds.length) {
    return [
      { band: 5.5, convertedScore: round2(safeMin) },
      { band: 6.5, convertedScore: round2((safeMin + safeMax) / 2) },
      { band: 7.5, convertedScore: round2(safeMax) },
    ];
  }

  if (thresholds.length === 1) {
    const startBand = thresholds[0]!;
    if (safeMax > safeMin) {
      return [
        { band: round2(startBand), convertedScore: round2(safeMin) },
        { band: round2(startBand + 1), convertedScore: round2(safeMax) },
      ];
    }
    return [{ band: round2(startBand), convertedScore: round2(safeMax) }];
  }

  return thresholds.map((band, index) => {
    const ratio = index / (thresholds.length - 1);
    const converted = safeMin + (safeMax - safeMin) * ratio;
    return {
      band: round2(band),
      convertedScore: round2(converted),
    };
  });
}

function normalizeIeltsInputForMethod(
  method: Record<string, unknown>,
  index: number,
  warnings: string[],
): Record<string, unknown> {
  const inputs = Array.isArray(method.inputs) ? [...method.inputs] : [];
  if (!inputs.length || hasCertificateInput(inputs)) {
    return method;
  }

  const context = getMethodContext(method);
  if (!IELTS_SIGNAL_REGEX.test(context)) {
    return method;
  }

  const convertedInputIndex = findConvertedScoreInputIndex(inputs);
  if (convertedInputIndex < 0) {
    return method;
  }

  const rawInput = inputs[convertedInputIndex];
  if (!isRecord(rawInput)) return method;

  const thresholds = extractIeltsThresholds(context);
  const minScore = isFiniteNumber(rawInput.min) ? rawInput.min : 8;
  const maxScore = isFiniteNumber(rawInput.max) ? rawInput.max : 10;
  const certificateLevels = buildCertificateLevels(thresholds, minScore, maxScore);

  const label = isNonEmptyString(rawInput.label)
    ? rawInput.label
    : "Điểm IELTS (band)";

  const normalizedInput: GenericInputField = {
    key: isNonEmptyString(rawInput.key) ? rawInput.key : "ielts_band",
    label: IELTS_SIGNAL_REGEX.test(label) ? label : "IELTS (band) - hệ thống tự quy đổi",
    type: "certificate",
    required: Boolean(rawInput.required),
    certificateConfig: {
      certificateType: "IELTS",
      mode: "band_table",
      levels: certificateLevels,
    },
    note: "Tự động chuẩn hóa từ dữ liệu AI để người dùng nhập IELTS band.",
  };

  inputs[convertedInputIndex] = normalizedInput;
  warnings.push(
    `Auto-normalized methods[${index}] về input IELTS (certificate) để người dùng nhập band thay cho điểm quy đổi.`,
  );

  return { ...method, inputs };
}

export function normalizeGeneratedConfig(
  draft: Record<string, unknown>,
): NormalizeResult {
  const warnings: string[] = [];
  const methods = Array.isArray(draft.methods) ? draft.methods : [];
  if (!methods.length) {
    return { draft, warnings };
  }

  const normalizedMethods = methods.map((method, index) =>
    isRecord(method) ? normalizeIeltsInputForMethod(method, index, warnings) : method,
  );

  return {
    draft: {
      ...draft,
      methods: normalizedMethods,
    },
    warnings,
  };
}
