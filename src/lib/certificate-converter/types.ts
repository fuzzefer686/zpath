export type ToeicSkillName = "listening" | "speaking" | "reading" | "writing";

export type CertificateUserInput = {
  certificateType: string;
  score?: number;
  bandId?: string;
  textValue?: string;
  toeic?: Partial<Record<ToeicSkillName, number>>;
};

export type ConverterSchoolSummary = {
  schoolCode: string;
  schoolName: string;
  source: "static" | "config";
};

export type MethodApplicabilityStatus =
  | "applicable"
  | "conditional"
  | "not_applicable";

export type MethodApplicabilityResult = {
  schoolCode: string;
  schoolName: string;
  methodCode: string;
  methodName: string;
  status: MethodApplicabilityStatus;
  convertedScore: number | null;
  scoreUnit: string;
  reason: string;
  notes: string[];
  sourceLabel: string;
};

export type CertificateConverterContext = {
  schools: ConverterSchoolSummary[];
};

export interface SchoolConverterAdapter {
  readonly adapterId: string;
  readonly schoolCodes: readonly string[];
  getResults(params: {
    input: CertificateUserInput;
    school: ConverterSchoolSummary;
    context: CertificateConverterContext;
  }): Promise<MethodApplicabilityResult[]>;
}

export type CertificateConverterRequest = {
  input: CertificateUserInput;
  schoolCodes?: string[];
};

export type CertificateConverterResponse = {
  schools: ConverterSchoolSummary[];
  results: MethodApplicabilityResult[];
};
