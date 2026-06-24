// Single source of truth for certificate types in the catalog.
// Mirrors the distinct certificate_type values in language_certificate_conversions
// (HUST 2026 seed). When the catalog grows, update here only.

export interface CertCatalogEntry {
  code: string;
  label: string;
  language: string;
}

export const CERT_CATALOG: CertCatalogEntry[] = [
  // English
  { code: "IELTS_ACADEMIC",              label: "IELTS Academic",                 language: "Tiếng Anh" },
  { code: "TOEFL_IBT",                   label: "TOEFL iBT",                      language: "Tiếng Anh" },
  { code: "TOEFL_ITP",                   label: "TOEFL ITP",                      language: "Tiếng Anh" },
  { code: "TOEIC",                       label: "TOEIC",                          language: "Tiếng Anh" },
  { code: "VSTEP",                       label: "VSTEP (Việt Nam)",               language: "Tiếng Anh" },
  { code: "PTE_ACADEMIC",                label: "PTE Academic",                   language: "Tiếng Anh" },
  { code: "LINGUASKILL",                 label: "Linguaskill",                    language: "Tiếng Anh" },
  { code: "APTIS_ESOL",                  label: "Aptis ESOL",                     language: "Tiếng Anh" },
  { code: "PEIC",                        label: "PEIC",                           language: "Tiếng Anh" },
  { code: "CAMBRIDGE_ASSESSMENT_ENGLISH",label: "Cambridge Assessment English",   language: "Tiếng Anh" },
  { code: "CAMBRIDGE_ENGLISH_TESTS",     label: "Cambridge English Tests",        language: "Tiếng Anh" },
  // French
  { code: "DELF_DALF",                   label: "DELF / DALF",                    language: "Tiếng Pháp" },
  { code: "TCF",                         label: "TCF",                            language: "Tiếng Pháp" },
  // German
  { code: "GOETHE_OSD_TELC_ECL",        label: "Goethe / OSD / TELC / ECL",     language: "Tiếng Đức" },
  { code: "TESTDAF",                     label: "TestDaF",                        language: "Tiếng Đức" },
  { code: "DSH",                         label: "DSH",                            language: "Tiếng Đức" },
  { code: "DSD",                         label: "DSD",                            language: "Tiếng Đức" },
  // Japanese
  { code: "JLPT",                        label: "JLPT",                           language: "Tiếng Nhật" },
  // Chinese
  { code: "HSK",                         label: "HSK",                            language: "Tiếng Trung" },
  { code: "HSKK",                        label: "HSKK (Khẩu ngữ)",               language: "Tiếng Trung" },
  // Korean
  { code: "TOPIK",                       label: "TOPIK",                          language: "Tiếng Hàn" },
];

// Grouped by language for <optgroup> rendering — insertion order preserved.
export const CERT_CATALOG_BY_LANGUAGE: Record<string, CertCatalogEntry[]> =
  CERT_CATALOG.reduce(
    (acc, entry) => {
      if (!acc[entry.language]) acc[entry.language] = [];
      acc[entry.language].push(entry);
      return acc;
    },
    {} as Record<string, CertCatalogEntry[]>,
  );

export function certLabel(code: string): string {
  return CERT_CATALOG.find((e) => e.code === code)?.label ?? code;
}
