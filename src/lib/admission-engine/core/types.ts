export type SchoolCode = "HUST" | "FTU" | "VINUNI" | "NEU";

export type AdmissionMethod = "THPT" | "TSA" | "XTTN";

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
