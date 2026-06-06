export type UetProgramCode =
  | "CN1"
  | "CN2"
  | "CN3"
  | "CN4"
  | "CN5"
  | "CN6"
  | "CN7"
  | "CN8"
  | "CN9"
  | "CN10"
  | "CN11"
  | "CN12"
  | "CN13"
  | "CN14"
  | "CN15"
  | "CN17"
  | "CN18"
  | "CN19"
  | "CN20"
  | "CN21";
export type UetCombinationCode = "A00" | "A01" | "X06" | "A02";
export type UetAdmissionMethodCode =
  | "METHOD_1"
  | "METHOD_2_1"
  | "METHOD_2_2"
  | "METHOD_2_3"
  | "METHOD_2_5"
  | "METHOD_2_6";

export type UetProgram = {
  code: UetProgramCode;
  name: string;
  quota: number;
  allowedCombinations: UetCombinationCode[];
  specialConditions?: string[];
};

export type UetCombination = {
  code: UetCombinationCode;
  subjects: [string, string, string];
  allowedPrograms: "ALL" | UetProgramCode[];
  englishReplacementAllowed?: boolean;
  invalidPrograms?: "ALL_EXCEPT_CN10_CN21";
};

export type UetAdmissionMethod = {
  code: UetAdmissionMethodCode | "METHOD_2_5";
  name: string;
  quotaPercentage?: string;
  validityYears?: number;
  combinations?: UetCombinationCode[];
  type?: string;
  eligibility?: Record<string, unknown>;
  hardConstraints?: string[];
  appliesToPrograms?: string;
};

export type UetAward = {
  name: string;
  subject: string;
  year: number;
  scoreBonus: number;
  level?: "national" | "international" | "provincial" | "city";
  isGdtx?: boolean;
};

export type UetCertificate = {
  type: "IELTS" | "TOEFL_iBT";
  online?: boolean;
  testDate: string;
  expiryDate?: string;
  skills: {
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
  };
  replacementEnglishScore?: number;
  bonusPoints?: number;
};

export type UetApplication = {
  programCode: UetProgramCode;
  combinationCode: UetCombinationCode;
  aspirationOrder: number;
  scores: {
    math: number;
    physics: number;
    chemistry?: number;
    biology?: number;
    english?: number;
    informatics?: number;
  };
  certificate?: UetCertificate;
  awards?: UetAward[];
  usedMethod1?: boolean;
  hsaScore?: number;
  satScore?: number;
  thpt2025Score?: number;
  preUniversityCompleted?: boolean;
  preUniversityGraduatedYear?: number;
};

export type UetAwardMapping = {
  subject: string[];
  allowedPrograms: "ALL" | UetProgramCode[];
};

export type UetSpec = {
  summary: {
    university: string;
    code: string;
    admissionYear: number;
    totalQuota: number;
    scale: number;
    roundingDecimalPlaces: number;
  };
  admissionMethods: UetAdmissionMethod[];
  programs: UetProgram[];
  combinations: UetCombination[];
  scoringRules: {
    baseScale: 30;
    rounding: { mode: "HALF_UP"; decimals: 2 };
    bonusPoints: {
      maxTotalBonus: number;
      maxComponentBonus: number;
      accumulationRule: "MAX_ONLY";
    };
    certificateValidation: {
      allowedTypes: Array<"IELTS" | "TOEFL_iBT">;
      validityYears: number;
      requiresAllSkills: 4;
      minScorePerSkill: number;
      allowOnlineExam: false;
    };
    englishConversionLogic: {
      scenario1Replacement: {
        targetCombination: "A01";
        action: "replace_english_subject_score";
      };
      scenario2Bonus: {
        targetCombinations: UetCombinationCode[];
        action: "add_bonus_points";
        constraints: "pending_config";
      };
    };
    awardSubjectMapping: UetAwardMapping[];
    tieBreakRules: Array<{ priority1: "aspiration_order_asc" } | { constraint: "no_other_secondary_criteria" }>;
  };
  edgeCases: string[];
  implementationNotes: string[];
  unknowns: {
    needsVerification: string;
    pendingConfig: string;
    unknown: string;
  };
};
