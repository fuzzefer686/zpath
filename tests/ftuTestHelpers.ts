import type {
  FTUProgramGroup,
  FTUScoringInput,
  LanguageCertificateConversionRow,
} from "@/src/lib/admission";

export function createFTUInput(
  input: Partial<FTUScoringInput> & {
    method: FTUScoringInput["method"];
    programGroup?: FTUProgramGroup;
  },
): FTUScoringInput {
  return {
    schoolCode: "FTU",
    admissionYear: 2026,
    ...input,
  };
}

export function createConversionRow(
  row: Partial<LanguageCertificateConversionRow>,
): LanguageCertificateConversionRow {
  const now = "2026-04-08T00:00:00.000Z";
  return {
    id: "test-row",
    school_code: "FTU",
    effective_year: 2026,
    certificate_type: "IELTS",
    skill_name: null,
    band_id: null,
    min_score: null,
    max_score: null,
    text_value: null,
    label: null,
    bonus_score_out_of_10: null,
    converted_subject_score_out_of_10: null,
    notes: null,
    source_label: "FTU 2026 official conversion table",
    created_at: now,
    updated_at: now,
    ...row,
  };
}
