export type SchoolCode = "HUST" | "FTU" | "NEU" | "UET" | "VINUNI";

export type AdmissionMethod =
  | "THPT"
  | "TSA"
  | "XTTN"
  | "HOC_BA"
  | "DGNL"
  | "XTT"
  | "METHOD_1"
  | "METHOD_2_1"
  | "METHOD_2_2"
  | "METHOD_2_3"
  | "METHOD_2_5"
  | "METHOD_2_6";

export type AdmissionInput = {
  schoolCode: SchoolCode;
  method: AdmissionMethod;
  year: number;
  payload: unknown;
};

export type AdmissionScoreResult = {
  schoolCode: SchoolCode;
  method: AdmissionMethod;
  year: number;
  originalScore: number;
  originalScale: number;
  normalizedScore30: number;
  targetScale: 30;
  formulaUsed: string;
  details?: Record<string, unknown>;
  warnings?: string[];
};

export type SchoolAdmissionModule = {
  schoolCode: SchoolCode;
  schoolName: string;
  supportedMethods: AdmissionMethod[];
  calculate(input: AdmissionInput): AdmissionScoreResult;
};
