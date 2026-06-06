import type { LanguageCertificateConversionRow } from "./ftuTypes";

type ConversionPurpose =
  | "LANGUAGE_SUBJECT_SCORE"
  | "BONUS_SCORE"
  | "ASSESSMENT_SCORE";

type FindConversionParams = {
  schoolCode: "FTU";
  effectiveYear: 2026;
  certificateType: string;
  rawScore?: number | string;
  skillName?: string;
  purpose?: ConversionPurpose;
};

let testRows: LanguageCertificateConversionRow[] | null = null;

export function __setFTULanguageCertificateConversionRowsForTest(
  rows: LanguageCertificateConversionRow[] | null,
) {
  testRows = rows;
}

function isNumericScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNumericScore(value: number | string | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: string | number | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function hasPurposeValue(
  row: LanguageCertificateConversionRow,
  purpose: ConversionPurpose,
) {
  if (purpose === "BONUS_SCORE") return row.bonus_score_out_of_10 !== null;
  return row.converted_subject_score_out_of_10 !== null;
}

function compareRows(
  rawScore: string | number | undefined,
  skillName: string | undefined,
  purpose: ConversionPurpose,
) {
  const rawText = normalizeText(rawScore);
  return (
    left: LanguageCertificateConversionRow,
    right: LanguageCertificateConversionRow,
  ) => {
    const leftPurpose = hasPurposeValue(left, purpose) ? 1 : 0;
    const rightPurpose = hasPurposeValue(right, purpose) ? 1 : 0;
    if (leftPurpose !== rightPurpose) return rightPurpose - leftPurpose;

    const leftExact = [left.text_value, left.band_id, left.label].some(
      (value) => normalizeText(value) === rawText,
    )
      ? 1
      : 0;
    const rightExact = [right.text_value, right.band_id, right.label].some(
      (value) => normalizeText(value) === rawText,
    )
      ? 1
      : 0;
    if (leftExact !== rightExact) return rightExact - leftExact;

    const leftSkill = skillName && left.skill_name === skillName ? 1 : 0;
    const rightSkill = skillName && right.skill_name === skillName ? 1 : 0;
    if (leftSkill !== rightSkill) return rightSkill - leftSkill;

    const leftRange =
      isNumericScore(left.min_score) && isNumericScore(left.max_score)
        ? left.max_score - left.min_score
        : Number.POSITIVE_INFINITY;
    const rightRange =
      isNumericScore(right.min_score) && isNumericScore(right.max_score)
        ? right.max_score - right.min_score
        : Number.POSITIVE_INFINITY;
    if (leftRange !== rightRange) return leftRange - rightRange;

    return (
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    );
  };
}

function filterMatchingRows(
  rows: LanguageCertificateConversionRow[],
  params: FindConversionParams,
) {
  const numericRawScore = parseNumericScore(params.rawScore);
  const rawText = normalizeText(params.rawScore);

  return rows.filter((row) => {
    if (row.school_code !== "FTU") return false;
    if (row.effective_year !== 2026) return false;
    if (row.certificate_type !== params.certificateType) return false;
    if (params.skillName && row.skill_name !== params.skillName) return false;

    if (numericRawScore !== null) {
      return (
        row.min_score !== null &&
        row.max_score !== null &&
        row.min_score <= numericRawScore &&
        numericRawScore <= row.max_score
      );
    }

    if (rawText) {
      return [row.text_value, row.label, row.band_id].some(
        (value) => normalizeText(value) === rawText,
      );
    }

    return true;
  });
}

async function loadRowsFromSupabase(params: FindConversionParams) {
  const { supabaseServer } = await import("@/src/lib/db/supabaseServer");
  let query = supabaseServer
    .from("language_certificate_conversions")
    .select("*")
    .eq("school_code", "FTU")
    .eq("effective_year", 2026)
    .eq("certificate_type", params.certificateType);

  if (params.skillName) {
    query = query.eq("skill_name", params.skillName);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(
      `Cannot load FTU 2026 certificate conversion rows: ${error.message}`,
    );
  }

  return (data ?? []) as LanguageCertificateConversionRow[];
}

export async function findFTULanguageCertificateConversion(
  params: FindConversionParams,
): Promise<LanguageCertificateConversionRow | null> {
  const purpose = params.purpose ?? "LANGUAGE_SUBJECT_SCORE";
  const rows = testRows ?? (await loadRowsFromSupabase(params));
  const matches = filterMatchingRows(rows, params).sort(
    compareRows(params.rawScore, params.skillName, purpose),
  );

  return matches[0] ?? null;
}

export async function resolveFTUCertificateConvertedScore(params: {
  certificateType?: string;
  rawScore?: number | string;
  skillName?: string;
}): Promise<number | null> {
  if (!params.certificateType || params.rawScore === undefined) return null;

  const row = await findFTULanguageCertificateConversion({
    schoolCode: "FTU",
    effectiveYear: 2026,
    certificateType: params.certificateType,
    rawScore: params.rawScore,
    skillName: params.skillName,
    purpose: "LANGUAGE_SUBJECT_SCORE",
  });

  return row?.converted_subject_score_out_of_10 ?? null;
}

export async function resolveFTUAssessmentConvertedScore(params: {
  certificateType?: string;
  rawScore?: number | string;
  skillName?: string;
}): Promise<number | null> {
  if (!params.certificateType || params.rawScore === undefined) return null;

  const row = await findFTULanguageCertificateConversion({
    schoolCode: "FTU",
    effectiveYear: 2026,
    certificateType: params.certificateType,
    rawScore: params.rawScore,
    skillName: params.skillName,
    purpose: "ASSESSMENT_SCORE",
  });

  return row?.converted_subject_score_out_of_10 ?? null;
}
