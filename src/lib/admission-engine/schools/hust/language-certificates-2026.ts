export type LanguageCertificateType =
  | "IELTS_ACADEMIC"
  | "VSTEP"
  | "APTIS_ESOL"
  | "PEIC"
  | "PTE_ACADEMIC"
  | "LINGUASKILL"
  | "CAMBRIDGE_ASSESSMENT_ENGLISH"
  | "CAMBRIDGE_ENGLISH_TESTS"
  | "TOEIC"
  | "TOEFL_IBT"
  | "TOEFL_ITP"
  | "DELF_DALF"
  | "TCF"
  | "TESTDAF"
  | "GOETHE_OSD_TELC_ECL"
  | "DSH"
  | "DSD"
  | "JLPT"
  | "HSK"
  | "HSKK"
  | "TOPIK";

export type ToeicSkillName = "listening" | "speaking" | "reading" | "writing";

export type LanguageCertificateConversionBand = {
  id: string;
  certificateType: LanguageCertificateType;
  label: string;
  minScore?: number;
  maxScore?: number;
  textValue?: string;
  bonusScoreOutOf10: number;
  convertedSubjectScoreOutOf10: number;
  notes?: string;
  skillName?: ToeicSkillName;
};

export type LanguageCertificateConversionInput = {
  certificateType: LanguageCertificateType;
  score?: number;
  textValue?: string;
  bandId?: string;
};

export type LanguageCertificateConversionResult = {
  certificateType: LanguageCertificateType;
  bandId: string;
  bonusScoreOutOf10: number;
  convertedSubjectScoreOutOf10: number;
  label: string;
};

export type ToeicFourSkillsInput = Partial<Record<ToeicSkillName, number>>;

export type ToeicFourSkillsConversionResult = {
  certificateType: "TOEIC";
  bonusScoreOutOf10: number;
  convertedSubjectScoreOutOf10: number;
  skillBands: Record<ToeicSkillName, LanguageCertificateConversionResult>;
};

export const HUST_LANGUAGE_CERTIFICATE_EFFECTIVE_YEAR = 2026;
export const HUST_LANGUAGE_CERTIFICATE_SOURCE_LABEL =
  "Bảng tham chiếu quy đổi tương đương các chứng chỉ ngoại ngữ áp dụng cho tuyển sinh đại học chính quy từ năm 2026";

export const LANGUAGE_CERTIFICATE_TYPE_LABELS: Record<LanguageCertificateType, string> = {
  IELTS_ACADEMIC: "IELTS Academic",
  VSTEP: "VSTEP",
  APTIS_ESOL: "Aptis ESOL",
  PEIC: "PEIC",
  PTE_ACADEMIC: "PTE Academic",
  LINGUASKILL: "Linguaskill",
  CAMBRIDGE_ASSESSMENT_ENGLISH: "Cambridge Assessment English",
  CAMBRIDGE_ENGLISH_TESTS: "Cambridge English Tests",
  TOEIC: "TOEIC",
  TOEFL_IBT: "TOEFL iBT",
  TOEFL_ITP: "TOEFL ITP",
  DELF_DALF: "DELF/DALF",
  TCF: "TCF",
  TESTDAF: "TestDaF",
  GOETHE_OSD_TELC_ECL: "Goethe/OSD/telc/ECL",
  DSH: "DSH",
  DSD: "DSD",
  JLPT: "JLPT",
  HSK: "HSK",
  HSKK: "HSKK",
  TOPIK: "TOPIK",
};

const certificateTypes = Object.keys(
  LANGUAGE_CERTIFICATE_TYPE_LABELS,
) as LanguageCertificateType[];

const band = (
  id: string,
  certificateType: LanguageCertificateType,
  label: string,
  bonusScoreOutOf10: number,
  convertedSubjectScoreOutOf10: number,
  options: {
    minScore?: number;
    maxScore?: number;
    textValue?: string;
    skillName?: ToeicSkillName;
    notes?: string;
  } = {},
): LanguageCertificateConversionBand => ({
  id,
  certificateType,
  label,
  bonusScoreOutOf10,
  convertedSubjectScoreOutOf10,
  ...options,
});

const numeric = (
  bandId: string,
  certificateType: LanguageCertificateType,
  label: string,
  bonusScoreOutOf10: number,
  convertedSubjectScoreOutOf10: number,
  minScore: number,
  maxScore = minScore,
  skillName?: ToeicSkillName,
) =>
  band(bandId, certificateType, label, bonusScoreOutOf10, convertedSubjectScoreOutOf10, {
    minScore,
    maxScore,
    skillName,
  });

const level = (
  bandId: string,
  certificateType: LanguageCertificateType,
  label: string,
  bonusScoreOutOf10: number,
  convertedSubjectScoreOutOf10: number,
  textValue = label,
) =>
  band(bandId, certificateType, label, bonusScoreOutOf10, convertedSubjectScoreOutOf10, {
    textValue,
  });

export const HUST_LANGUAGE_CERTIFICATE_CONVERSION_BANDS_2026: LanguageCertificateConversionBand[] = [
  numeric("band_1", "IELTS_ACADEMIC", "IELTS Academic 5.0", 1, 8.0, 5.0),
  numeric("band_1", "VSTEP", "VSTEP 5.5", 1, 8.0, 5.5),
  numeric("band_1", "APTIS_ESOL", "Aptis ESOL 80-120", 1, 8.0, 80, 120),
  level("band_1", "PEIC", "Level 2", 1, 8.0),
  numeric("band_1", "PTE_ACADEMIC", "PTE Academic 31-38", 1, 8.0, 31, 38),
  numeric("band_1", "LINGUASKILL", "Linguaskill 140-159", 1, 8.0, 140, 159),
  level("band_1", "CAMBRIDGE_ASSESSMENT_ENGLISH", "B1 Preliminary / B1 Business Preliminary", 1, 8.0),
  level("band_1", "CAMBRIDGE_ENGLISH_TESTS", "PET 140-159", 1, 8.0),
  numeric("band_1", "TOEIC", "TOEIC Listening 275-395", 1, 8.0, 275, 395, "listening"),
  numeric("band_1", "TOEIC", "TOEIC Speaking 120-150", 1, 8.0, 120, 150, "speaking"),
  numeric("band_1", "TOEIC", "TOEIC Reading 275-380", 1, 8.0, 275, 380, "reading"),
  numeric("band_1", "TOEIC", "TOEIC Writing 120-140", 1, 8.0, 120, 140, "writing"),
  numeric("band_1", "TOEFL_IBT", "TOEFL iBT 30-45", 1, 8.0, 30, 45),
  numeric("band_1", "TOEFL_ITP", "TOEFL ITP 450-499", 1, 8.0, 450, 499),
  level("band_1", "DELF_DALF", "DELF A2 50-70", 1, 8.0),
  numeric("band_1", "TCF", "TCF 200-249", 1, 8.0, 200, 249),
  level("band_1", "JLPT", "N4 145-180", 1, 8.0),
  level("band_1", "HSK", "HSK3 241-300", 1, 8.0),
  level("band_1", "HSKK", "HSKK sơ cấp 60-100", 1, 8.0),
  level("band_1", "TOPIK", "TOPIK 3 135-149", 1, 8.0),

  numeric("band_2", "IELTS_ACADEMIC", "IELTS Academic 5.5", 2, 8.5, 5.5),
  numeric("band_2", "VSTEP", "VSTEP 6.0-6.5", 2, 8.5, 6.0, 6.5),
  numeric("band_2", "APTIS_ESOL", "Aptis ESOL 121-134", 2, 8.5, 121, 134),
  level("band_2", "PEIC", "Level 3 Pass", 2, 8.5),
  numeric("band_2", "PTE_ACADEMIC", "PTE Academic 39-46", 2, 8.5, 39, 46),
  numeric("band_2", "LINGUASKILL", "Linguaskill 160-166", 2, 8.5, 160, 166),
  level("band_2", "CAMBRIDGE_ASSESSMENT_ENGLISH", "B2 First / B2 Business Vantage 160-172 / Pass at Grade C", 2, 8.5),
  level("band_2", "CAMBRIDGE_ENGLISH_TESTS", "FCE 160-166", 2, 8.5),
  numeric("band_2", "TOEIC", "TOEIC Listening 400-428", 2, 8.5, 400, 428, "listening"),
  numeric("band_2", "TOEIC", "TOEIC Speaking 160-163", 2, 8.5, 160, 163, "speaking"),
  numeric("band_2", "TOEIC", "TOEIC Reading 385-406", 2, 8.5, 385, 406, "reading"),
  numeric("band_2", "TOEIC", "TOEIC Writing 150-156", 2, 8.5, 150, 156, "writing"),
  numeric("band_2", "TOEFL_IBT", "TOEFL iBT 46-61", 2, 8.5, 46, 61),
  numeric("band_2", "TOEFL_ITP", "TOEFL ITP 500-541", 2, 8.5, 500, 541),
  level("band_2", "DELF_DALF", "DELF A2 71-100", 2, 8.5),
  numeric("band_2", "TCF", "TCF 250-299", 2, 8.5, 250, 299),
  level("band_2", "GOETHE_OSD_TELC_ECL", "A2", 2, 8.5),
  level("band_2", "JLPT", "N3 95-120", 2, 8.5),
  level("band_2", "HSK", "HSK4 180-210", 2, 8.5),
  level("band_2", "HSKK", "HSKK trung cấp 60-100", 2, 8.5),
  level("band_2", "TOPIK", "TOPIK 4 150-162", 2, 8.5),

  numeric("band_3", "IELTS_ACADEMIC", "IELTS Academic 6.0", 3, 9.0, 6.0),
  numeric("band_3", "VSTEP", "VSTEP 7.0-7.5", 3, 9.0, 7.0, 7.5),
  numeric("band_3", "APTIS_ESOL", "Aptis ESOL 135-148", 3, 9.0, 135, 148),
  level("band_3", "PEIC", "Level 3 Pass with Merit", 3, 9.0),
  numeric("band_3", "PTE_ACADEMIC", "PTE Academic 47-54", 3, 9.0, 47, 54),
  numeric("band_3", "LINGUASKILL", "Linguaskill 167-173", 3, 9.0, 167, 173),
  level("band_3", "CAMBRIDGE_ASSESSMENT_ENGLISH", "B2 First / B2 Business Vantage 173-179 / Pass at Grade B", 3, 9.0),
  level("band_3", "CAMBRIDGE_ENGLISH_TESTS", "FCE 167-173", 3, 9.0),
  numeric("band_3", "TOEIC", "TOEIC Listening 429-457", 3, 9.0, 429, 457, "listening"),
  numeric("band_3", "TOEIC", "TOEIC Speaking 164-167", 3, 9.0, 164, 167, "speaking"),
  numeric("band_3", "TOEIC", "TOEIC Reading 407-428", 3, 9.0, 407, 428, "reading"),
  numeric("band_3", "TOEIC", "TOEIC Writing 157-163", 3, 9.0, 157, 163, "writing"),
  numeric("band_3", "TOEFL_IBT", "TOEFL iBT 62-77", 3, 9.0, 62, 77),
  numeric("band_3", "TOEFL_ITP", "TOEFL ITP 542-583", 3, 9.0, 542, 583),
  level("band_3", "DELF_DALF", "DELF B1 50-70", 3, 9.0),
  numeric("band_3", "TCF", "TCF 300-349", 3, 9.0, 300, 349),
  level("band_3", "GOETHE_OSD_TELC_ECL", "B1", 3, 9.0),
  level("band_3", "DSD", "DSD1", 3, 9.0),
  level("band_3", "JLPT", "N3 121-149", 3, 9.0),
  level("band_3", "HSK", "HSK4 211-240", 3, 9.0),
  level("band_3", "HSKK", "HSKK trung cấp 60-100", 3, 9.0),
  level("band_3", "TOPIK", "TOPIK 4 163-175", 3, 9.0),

  numeric("band_4", "IELTS_ACADEMIC", "IELTS Academic 6.5", 4, 9.5, 6.5),
  numeric("band_4", "VSTEP", "VSTEP 8.0", 4, 9.5, 8.0),
  numeric("band_4", "APTIS_ESOL", "Aptis ESOL 149-160", 4, 9.5, 149, 160),
  level("band_4", "PEIC", "Level 3 Pass with Distinction", 4, 9.5),
  numeric("band_4", "PTE_ACADEMIC", "PTE Academic 55-62", 4, 9.5, 55, 62),
  numeric("band_4", "LINGUASKILL", "Linguaskill 174-179", 4, 9.5, 174, 179),
  level("band_4", "CAMBRIDGE_ASSESSMENT_ENGLISH", "B2 First / B2 Business Vantage 180-190 / Pass at Grade A", 4, 9.5),
  level("band_4", "CAMBRIDGE_ENGLISH_TESTS", "FCE 174-179", 4, 9.5),
  numeric("band_4", "TOEIC", "TOEIC Listening 458-485", 4, 9.5, 458, 485, "listening"),
  numeric("band_4", "TOEIC", "TOEIC Speaking 168-170", 4, 9.5, 168, 170, "speaking"),
  numeric("band_4", "TOEIC", "TOEIC Reading 429-450", 4, 9.5, 429, 450, "reading"),
  numeric("band_4", "TOEIC", "TOEIC Writing 164-170", 4, 9.5, 164, 170, "writing"),
  numeric("band_4", "TOEFL_IBT", "TOEFL iBT 78-93", 4, 9.5, 78, 93),
  numeric("band_4", "TOEFL_ITP", "TOEFL ITP 584-626", 4, 9.5, 584, 626),
  level("band_4", "DELF_DALF", "DELF B1 71-100 / DELF B2 50-100", 4, 9.5),
  numeric("band_4", "TCF", "TCF 350-399", 4, 9.5, 350, 399),
  level("band_4", "TESTDAF", "TDN3", 4, 9.5),
  level("band_4", "GOETHE_OSD_TELC_ECL", "B2", 4, 9.5),
  level("band_4", "DSH", "DSH1", 4, 9.5),
  level("band_4", "JLPT", "N3 150-180 / N2 90-180", 4, 9.5),
  level("band_4", "HSK", "HSK4 241-300 / HSK5 180-300", 4, 9.5),
  level("band_4", "HSKK", "HSKK trung cấp 60-100 / HSKK cao cấp 60-100", 4, 9.5),
  level("band_4", "TOPIK", "TOPIK 4 176-189 / TOPIK 5 190-229", 4, 9.5),

  numeric("band_5", "IELTS_ACADEMIC", "IELTS Academic 7.0-9.0", 5, 10.0, 7.0, 9.0),
  numeric("band_5", "VSTEP", "VSTEP 8.5-10", 5, 10.0, 8.5, 10),
  numeric("band_5", "APTIS_ESOL", "Aptis ESOL 161-180", 5, 10.0, 161, 180),
  level("band_5", "PEIC", "Level 4 - Level 5 Pass", 5, 10.0),
  numeric("band_5", "PTE_ACADEMIC", "PTE Academic 63-90", 5, 10.0, 63, 90),
  numeric("band_5", "LINGUASKILL", "Linguaskill 180-210", 5, 10.0, 180, 210),
  level("band_5", "CAMBRIDGE_ASSESSMENT_ENGLISH", "C1 Advanced / C1 Business Higher 180-210 / C2 Proficiency 200-230", 5, 10.0),
  level("band_5", "CAMBRIDGE_ENGLISH_TESTS", "CAE 180-199 / CPE 200-230", 5, 10.0),
  numeric("band_5", "TOEIC", "TOEIC Listening 490-495", 5, 10.0, 490, 495, "listening"),
  numeric("band_5", "TOEIC", "TOEIC Speaking 180-200", 5, 10.0, 180, 200, "speaking"),
  numeric("band_5", "TOEIC", "TOEIC Reading 455-495", 5, 10.0, 455, 495, "reading"),
  numeric("band_5", "TOEIC", "TOEIC Writing 180-200", 5, 10.0, 180, 200, "writing"),
  numeric("band_5", "TOEFL_IBT", "TOEFL iBT 94-120", 5, 10.0, 94, 120),
  numeric("band_5", "TOEFL_ITP", "TOEFL ITP 627-677", 5, 10.0, 627, 677),
  level("band_5", "DELF_DALF", "DALF C1 50-100 / DALF C2 50-100", 5, 10.0),
  numeric("band_5", "TCF", "TCF 400-699", 5, 10.0, 400, 699),
  level("band_5", "TESTDAF", "TDN4 / TDN5", 5, 10.0),
  level("band_5", "GOETHE_OSD_TELC_ECL", "C1/C2", 5, 10.0),
  level("band_5", "DSH", "DSH2 / DSH3", 5, 10.0),
  level("band_5", "DSD", "DSD2", 5, 10.0),
  level("band_5", "JLPT", "N1 100-180", 5, 10.0),
  level("band_5", "HSK", "HSK6 180-300", 5, 10.0),
  level("band_5", "HSKK", "HSKK cao cấp 60-100", 5, 10.0),
  level("band_5", "TOPIK", "TOPIK 6 230-300", 5, 10.0),
];

export function isLanguageCertificateType(
  value: unknown,
): value is LanguageCertificateType {
  return typeof value === "string" && certificateTypes.includes(value as LanguageCertificateType);
}

export function getLanguageCertificateTypes() {
  return certificateTypes;
}

export function getLanguageCertificateBands(
  certificateType: LanguageCertificateType,
) {
  return HUST_LANGUAGE_CERTIFICATE_CONVERSION_BANDS_2026.filter(
    (bandItem) => bandItem.certificateType === certificateType && !bandItem.skillName,
  );
}

export function getLanguageCertificateInputMode(
  certificateType: LanguageCertificateType,
): "numeric" | "level" | "toeic" {
  if (certificateType === "TOEIC") return "toeic";

  return getLanguageCertificateBands(certificateType).some(
    (bandItem) => bandItem.minScore !== undefined || bandItem.maxScore !== undefined,
  )
    ? "numeric"
    : "level";
}

export function getLanguageCertificateLevelOptions(
  certificateType: LanguageCertificateType,
) {
  return getLanguageCertificateBands(certificateType)
    .filter((bandItem) => bandItem.textValue)
    .map((bandItem) => ({
      value: bandItem.id,
      label: bandItem.label,
      bandId: bandItem.id,
      bonusScoreOutOf10: bandItem.bonusScoreOutOf10,
      convertedSubjectScoreOutOf10: bandItem.convertedSubjectScoreOutOf10,
    }));
}

export function getLanguageCertificateScoreRange(
  certificateType: LanguageCertificateType,
) {
  const numericBands = getLanguageCertificateBands(certificateType).filter(
    (bandItem) => bandItem.minScore !== undefined && bandItem.maxScore !== undefined,
  );
  if (!numericBands.length) return null;

  return {
    minScore: Math.min(...numericBands.map((bandItem) => bandItem.minScore ?? 0)),
    maxScore: Math.max(...numericBands.map((bandItem) => bandItem.maxScore ?? 0)),
  };
}

function bandToResult(
  bandItem: LanguageCertificateConversionBand,
): LanguageCertificateConversionResult {
  return {
    certificateType: bandItem.certificateType,
    bandId: bandItem.id,
    bonusScoreOutOf10: bandItem.bonusScoreOutOf10,
    convertedSubjectScoreOutOf10: bandItem.convertedSubjectScoreOutOf10,
    label: bandItem.label,
  };
}

function isScoreInBand(score: number, bandItem: LanguageCertificateConversionBand) {
  if (bandItem.minScore === undefined || bandItem.maxScore === undefined) {
    return false;
  }

  return score >= bandItem.minScore && score <= bandItem.maxScore;
}

export function convertLanguageCertificateToBand(
  input: LanguageCertificateConversionInput,
): LanguageCertificateConversionResult | null {
  if (!isLanguageCertificateType(input.certificateType)) return null;
  if (input.certificateType === "TOEIC") return null;

  const bands = getLanguageCertificateBands(input.certificateType);

  if (input.bandId) {
    const bandItem = bands.find((candidate) => candidate.id === input.bandId) ?? null;
    return bandItem ? bandToResult(bandItem) : null;
  }

  if (input.score !== undefined) {
    if (typeof input.score !== "number" || !Number.isFinite(input.score)) {
      return null;
    }

    const bandItem = bands.find((candidate) => isScoreInBand(input.score as number, candidate));
    return bandItem ? bandToResult(bandItem) : null;
  }

  if (input.textValue) {
    const matchingBands = bands.filter(
      (candidate) =>
        candidate.textValue === input.textValue || candidate.label === input.textValue,
    );
    if (matchingBands.length !== 1) return null;

    return bandToResult(matchingBands[0]);
  }

  return null;
}

export function convertLanguageCertificateToSubjectScore(
  input: LanguageCertificateConversionInput,
) {
  return convertLanguageCertificateToBand(input)?.convertedSubjectScoreOutOf10 ?? null;
}

export function convertLanguageCertificateToBonusScore(
  input: LanguageCertificateConversionInput,
) {
  return convertLanguageCertificateToBand(input)?.bonusScoreOutOf10 ?? null;
}

function convertToeicSkillToBand(skillName: ToeicSkillName, score: number) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  const bandItem = HUST_LANGUAGE_CERTIFICATE_CONVERSION_BANDS_2026.find(
    (candidate) =>
      candidate.certificateType === "TOEIC" &&
      candidate.skillName === skillName &&
      isScoreInBand(score, candidate),
  );

  return bandItem ? bandToResult(bandItem) : null;
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function convertToeicFourSkills(
  input: ToeicFourSkillsInput,
): ToeicFourSkillsConversionResult | null {
  const listening = convertToeicSkillToBand("listening", input.listening as number);
  const speaking = convertToeicSkillToBand("speaking", input.speaking as number);
  const reading = convertToeicSkillToBand("reading", input.reading as number);
  const writing = convertToeicSkillToBand("writing", input.writing as number);

  if (!listening || !speaking || !reading || !writing) return null;

  const skillBands = {
    listening,
    speaking,
    reading,
    writing,
  };

  return {
    certificateType: "TOEIC",
    bonusScoreOutOf10: average(
      Object.values(skillBands).map((skillBand) => skillBand.bonusScoreOutOf10),
    ),
    convertedSubjectScoreOutOf10: average(
      Object.values(skillBands).map(
        (skillBand) => skillBand.convertedSubjectScoreOutOf10,
      ),
    ),
    skillBands,
  };
}
