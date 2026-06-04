export type FTUAdmissionMethod =
  | "DIRECT_ADMISSION"
  | "ACADEMIC_TRANSCRIPT_3_SUBJECTS"
  | "ACADEMIC_TRANSCRIPT_WITH_LANGUAGE_CERT"
  | "THPT_3_SUBJECTS"
  | "THPT_WITH_LANGUAGE_CERT"
  | "DOMESTIC_ASSESSMENT"
  | "INTERNATIONAL_ASSESSMENT_WITH_LANGUAGE_CERT";

export type FTUProgramGroup =
  | "STANDARD_INTEGRATED"
  | "TECH_DATA_AI"
  | "COMMERCIAL_LANGUAGE";

export type FTUAssessmentExamType =
  | "HSA"
  | "V_ACT"
  | "TSA"
  | "SAT"
  | "ACT"
  | "A_LEVEL";

export type FTUCertificateType =
  | "IELTS"
  | "TOEFL_IBT"
  | "TOEIC"
  | "HSK"
  | "JLPT"
  | "DELF"
  | "TCF"
  | "SAT"
  | "ACT"
  | "A_LEVEL"
  | "OTHER";

export type FTUScoringInput = {
  schoolCode: "FTU";
  admissionYear: 2026;
  method: FTUAdmissionMethod;
  programId?: string;
  programCode?: string;
  majorCode?: string;
  programName?: string;
  programGroup?: FTUProgramGroup;
  subjects?: {
    m1?: number;
    m2?: number;
    m3?: number;
  };
  assessment?: {
    examType?: FTUAssessmentExamType;
    examScore?: number;
    convertedAssessmentScore?: number;
    aLevelMathConvertedScore?: number;
    aLevelOtherConvertedScore?: number;
  };
  certificate?: {
    type?: FTUCertificateType;
    rawScore?: string | number;
    convertedScore?: number;
    skillName?: string;
  };
  priorityPoint?: number;
  bonusPoint?: number;
  thptCombinationTotal?: number;
  transcriptEligibilityAverage?: number;
  mathAverage?: number;
  literatureAverage?: number;
  foreignLanguageAverage?: number;
};

export type FTUScoringResult = {
  schoolCode: "FTU";
  admissionYear: 2026;
  method: FTUAdmissionMethod;
  programGroup?: FTUProgramGroup;
  officialRawScore: number | null;
  officialMaxScore: 30 | 40 | null;
  normalizedScore30: number | null;
  priorityPoint: number;
  bonusPoint: number;
  certificateConvertedScore?: number;
  assessmentConvertedScore?: number;
  formulaCode: string;
  formulaTextVi: string;
  explanationVi: string;
  eligibilityStatus: "eligible" | "ineligible" | "unknown";
  warnings: string[];
  missingFields: string[];
  sourceNotes: string[];
};

export type LanguageCertificateConversionRow = {
  id: string;
  school_code: string;
  effective_year: number;
  certificate_type: string;
  skill_name: string | null;
  band_id: string | null;
  min_score: number | null;
  max_score: number | null;
  text_value: string | null;
  label: string | null;
  bonus_score_out_of_10: number | null;
  converted_subject_score_out_of_10: number | null;
  notes: string | null;
  source_label: string | null;
  created_at: string;
  updated_at: string;
};

export type ExistingFTUProgram = {
  name?: string | null;
  code?: string | null;
  program_name?: string | null;
  program_code?: string | null;
  major_name?: string | null;
  major_code?: string | null;
};

export type ValidationResult = {
  status: "valid" | "invalid" | "unknown";
  missingFields: string[];
  warnings: string[];
};

export type EligibilityResult = {
  eligibilityStatus: "eligible" | "ineligible" | "unknown";
  missingFields: string[];
  warnings: string[];
};

export type FormulaDefinition = {
  code: string;
  officialMaxScore: 30 | 40 | null;
  formulaTextVi: string;
  sourceNotes: string[];
};
