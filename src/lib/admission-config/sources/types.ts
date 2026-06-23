import type { GenericAdmissionConfig } from "@/src/lib/admission-engine/generic";

export type AdmissionSourceInputType = "url" | "file_url" | "text";
export type AdmissionSourceRole = "primary" | "supplement";

export type AdmissionSourceInput = {
  type: AdmissionSourceInputType;
  value: string;
  label?: string;
  role?: AdmissionSourceRole;
};

export type SourceReportStatus = "fetched" | "failed" | "skipped";

export type SourceReportItem = {
  label?: string;
  url?: string;
  type: AdmissionSourceInputType;
  role: AdmissionSourceRole;
  status: SourceReportStatus;
  error?: string;
  charCount?: number;
};

export type AdmissionFetchedTextSource = {
  kind: "text";
  type: AdmissionSourceInputType;
  role: AdmissionSourceRole;
  label?: string;
  url?: string;
  text: string;
};

export type AdmissionFetchedPdfSource = {
  kind: "pdf";
  type: AdmissionSourceInputType;
  role: AdmissionSourceRole;
  label?: string;
  url?: string;
  pdfBase64: string;
  bytes: Buffer;
  originalName: string;
};

export type AdmissionFetchedSource =
  | AdmissionFetchedTextSource
  | AdmissionFetchedPdfSource;

export type FetchAdmissionSourcesResult = {
  fetched: AdmissionFetchedSource[];
  report: SourceReportItem[];
  warnings: string[];
};

export type AdmissionSourceBundle = {
  promptContext: string;
  primaryPdf: AdmissionFetchedPdfSource | null;
  additionalPdfs: AdmissionFetchedPdfSource[];
  sourceUrl: string | undefined;
};

export type GenerateAdmissionConfigResult = {
  draft: GenericAdmissionConfig | Record<string, unknown>;
  valid: boolean;
  warnings: string[];
};
