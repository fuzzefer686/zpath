export type HustAdmissionProgramGroup =
  | "standard"
  | "english_advanced"
  | "foreign_language"
  | "pfiev"
  | "international_cooperation"
  | "international_joint";

export type HustSubjectKey =
  | "math"
  | "physics"
  | "chemistry"
  | "english"
  | "biology"
  | "literature"
  | "chinese"
  | "korean"
  | "informatics";

export type HustThptCombinationCode =
  | "K01"
  | "A00"
  | "A01"
  | "B00"
  | "D01"
  | "D04"
  | "D07"
  | "DD2";

export type HustThptFormulaType = "NORMAL" | "K01" | "MATH_COEFFICIENT_2";

export type HustThptCombinationConfig = {
  combinationCode: HustThptCombinationCode;
  subjects: HustSubjectKey[];
  formulaType: HustThptFormulaType;
  mainSubject?: HustSubjectKey;
  mainSubjectCoefficient: 1 | 2;
  isMainSubjectDoubled: boolean;
  mathCoefficient?: 1 | 2 | 3;
};

export type HustAdmissionProgram2026 = {
  order: number;
  code: string;
  name: string;
  quota: number;
  group: HustAdmissionProgramGroup;
  methods: {
    xttn: boolean;
    dgtd: boolean;
    thpt: string[];
  };
  mathCoefficient2Thpt?: string[];
  thptCombinations: HustThptCombinationConfig[];
  languageRequirement?: {
    note: string;
  };
};

type HustAdmissionProgram2026Seed = Omit<
  HustAdmissionProgram2026,
  "thptCombinations"
>;

export const HUST_PROGRAM_GROUP_LABELS: Record<HustAdmissionProgramGroup, string> = {
  standard: "Các chương trình đào tạo chuẩn",
  english_advanced: "Các chương trình tiên tiến giảng dạy bằng tiếng Anh",
  foreign_language: "Các chương trình có tăng cường ngoại ngữ",
  pfiev: "Các chương trình Việt - Pháp (PFIEV)",
  international_cooperation: "Chương trình hợp tác quốc tế",
  international_joint: "Chương trình liên kết đào tạo quốc tế",
};

const allMethods = (thpt: string[]) => ({
  xttn: true,
  dgtd: true,
  thpt,
});

const COMBINATION_SUBJECTS: Record<HustThptCombinationCode, HustSubjectKey[]> = {
  K01: ["math", "literature", "physics", "chemistry", "biology", "informatics"],
  A00: ["math", "physics", "chemistry"],
  A01: ["math", "physics", "english"],
  B00: ["math", "chemistry", "biology"],
  D01: ["math", "literature", "english"],
  D04: ["math", "literature", "chinese"],
  D07: ["math", "chemistry", "english"],
  DD2: ["math", "literature", "korean"],
};

const SUPPORTED_THPT_COMBINATIONS = new Set<string>(Object.keys(COMBINATION_SUBJECTS));

const HUST_MATH_COEFFICIENT_2_BY_PROGRAM: Record<string, string[]> = {
  BF1: ["A00", "B00", "D07"],
  BF2: ["A00", "B00", "D07"],
  CH1: ["A00", "B00", "D07"],
  CH2: ["A00", "B00", "D07"],
  EE1: ["A00", "A01"],
  EE2: ["A00", "A01"],
  ET1: ["A00", "A01"],
  ET2: ["A00", "A01", "B00"],
  EV1: ["A00", "B00", "D07"],
  EV2: ["A00", "B00", "D07"],
  HE1: ["A00", "A01"],
  IT1: ["A00", "A01"],
  IT2: ["A00", "A01"],
  ME1: ["A00", "A01"],
  ME2: ["A00", "A01"],
  MI1: ["A00", "A01"],
  MI2: ["A00", "A01"],
  MS1: ["A00", "A01", "D07"],
  MS2: ["A00", "A01", "D07"],
  MS3: ["A00", "A01", "D07"],
  MS5: ["A00", "A01", "D07"],
  PH1: ["A00", "A01"],
  PH2: ["A00", "A01"],
  PH3: ["A00", "A01"],
  TE1: ["A00", "A01"],
  TE2: ["A00", "A01"],
  TE3: ["A00", "A01"],
  TX1: ["A00", "A01", "D07"],
  "BF-E12": ["A00", "B00", "D07"],
  "BF-E19": ["A00", "B00", "D07"],
  "CH-E11": ["A00", "B00", "D07"],
  "EE-E8": ["A00", "A01"],
  "EE-E18": ["A00", "A01"],
  "ET-E4": ["A00", "A01"],
  "ET-E5": ["A00", "A01"],
  "ET-E16": ["A00", "A01"],
  "IT-E7": ["A00", "A01"],
  "IT-E10": ["A00", "A01"],
  "IT-E15": ["A00", "A01"],
  "ME-E1": ["A00", "A01"],
  "MS-E3": ["A00", "A01", "D07"],
  "TE-E2": ["A00", "A01"],
  "ET-E9": ["A00", "A01"],
  "IT-E6": ["A00", "A01"],
  "IT-EP": ["A00", "A01"],
  "EE-EP": ["A00", "A01"],
  "TE-EP": ["A00", "A01"],
  "ET-LUH": ["A00", "A01"],
  "ME-GU": ["A00", "A01"],
  "ME-LUH": ["A00", "A01"],
  "ME-NUT": ["A00", "A01"],
  "TROY-IT": ["A00", "A01"],
};

function createThptCombinationConfig(
  code: string,
  doubledCombinationCodes: Set<string>,
): HustThptCombinationConfig | null {
  if (!SUPPORTED_THPT_COMBINATIONS.has(code)) return null;

  const combinationCode = code as HustThptCombinationCode;
  const isMainSubjectDoubled =
    combinationCode !== "K01" && doubledCombinationCodes.has(combinationCode);

  return {
    combinationCode,
    subjects: COMBINATION_SUBJECTS[combinationCode],
    formulaType:
      combinationCode === "K01"
        ? "K01"
        : isMainSubjectDoubled
          ? "MATH_COEFFICIENT_2"
          : "NORMAL",
    mainSubject: combinationCode === "K01" ? undefined : "math",
    mainSubjectCoefficient: isMainSubjectDoubled ? 2 : 1,
    isMainSubjectDoubled,
    mathCoefficient: combinationCode === "K01" ? 3 : isMainSubjectDoubled ? 2 : 1,
  };
}

function withThptConfig<T extends Omit<HustAdmissionProgram2026, "thptCombinations">>(
  program: T,
): HustAdmissionProgram2026 {
  const doubledCombinationCodes = new Set(
    program.mathCoefficient2Thpt ??
      HUST_MATH_COEFFICIENT_2_BY_PROGRAM[program.code] ??
      [],
  );
  const thptCombinations = program.methods.thpt
    .map((code) => createThptCombinationConfig(code, doubledCombinationCodes))
    .filter((config): config is HustThptCombinationConfig => Boolean(config));

  return {
    ...program,
    thptCombinations,
  };
}

const HUST_ADMISSION_PROGRAMS_2026_SEED: HustAdmissionProgram2026Seed[] = [
  { order: 1, code: "BF1", name: "Kỹ thuật Sinh học", quota: 160, group: "standard", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 2, code: "BF2", name: "Kỹ thuật Thực phẩm", quota: 360, group: "standard", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 3, code: "CH1", name: "Kỹ thuật Hoá học", quota: 680, group: "standard", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 4, code: "CH2", name: "Hoá học", quota: 160, group: "standard", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 5, code: "ED2", name: "Công nghệ Giáo dục", quota: 120, group: "standard", methods: allMethods(["K01", "A00", "A01", "D01"]) },
  { order: 6, code: "ED3", name: "Quản lý Giáo dục", quota: 60, group: "standard", methods: allMethods(["K01", "A00", "A01", "D01"]) },
  { order: 7, code: "EE1", name: "Kỹ thuật Điện", quota: 240, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 8, code: "EE2", name: "Kỹ thuật Điều khiển & Tự động hoá", quota: 500, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 9, code: "EM1", name: "Quản lý năng lượng", quota: 60, group: "standard", methods: allMethods(["K01", "A00", "A01", "D01"]) },
  { order: 10, code: "EM2", name: "Quản lý Công nghiệp", quota: 80, group: "standard", methods: allMethods(["K01", "A00", "A01", "D01"]) },
  { order: 11, code: "EM3", name: "Quản trị Kinh doanh", quota: 120, group: "standard", methods: allMethods(["K01", "A00", "A01", "D01"]) },
  { order: 12, code: "EM4", name: "Kế toán", quota: 80, group: "standard", methods: allMethods(["K01", "A00", "A01", "D01"]) },
  { order: 13, code: "EM5", name: "Tài chính - Ngân hàng", quota: 80, group: "standard", methods: allMethods(["K01", "A00", "A01", "D01"]) },
  { order: 14, code: "ET1", name: "Kỹ thuật Điện tử - Viễn thông", quota: 480, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 15, code: "ET2", name: "Kỹ thuật Y sinh", quota: 100, group: "standard", methods: allMethods(["K01", "A00", "A01", "B00"]) },
  { order: 16, code: "EV1", name: "Kỹ thuật Môi trường", quota: 160, group: "standard", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 17, code: "EV2", name: "Quản lý Tài nguyên và Môi trường", quota: 120, group: "standard", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 18, code: "FL1", name: "Tiếng Anh KHKT và Công nghệ", quota: 210, group: "standard", methods: allMethods(["K01", "D01"]) },
  { order: 19, code: "FL3", name: "Tiếng Trung Khoa học và Công nghệ", quota: 40, group: "standard", methods: allMethods(["K01", "D01", "D04"]) },
  { order: 20, code: "HE1", name: "Kỹ thuật Nhiệt", quota: 250, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 21, code: "IT1", name: "CNTT: Khoa học Máy tính", quota: 300, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 22, code: "IT2", name: "CNTT: Kỹ thuật Máy tính", quota: 200, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 23, code: "ME1", name: "Kỹ thuật Cơ điện tử", quota: 300, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 24, code: "ME2", name: "Kỹ thuật Cơ khí", quota: 560, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 25, code: "MI1", name: "Toán - Tin", quota: 160, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 26, code: "MI2", name: "Hệ thống thông tin quản lý", quota: 80, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 27, code: "MS1", name: "Kỹ thuật Vật liệu", quota: 280, group: "standard", methods: allMethods(["K01", "A00", "A01", "D07"]) },
  { order: 28, code: "MS2", name: "Kỹ thuật Vi điện tử và Công nghệ nano", quota: 140, group: "standard", methods: allMethods(["K01", "A00", "A01", "D07"]) },
  { order: 29, code: "MS3", name: "Công nghệ vật liệu Polyme và Compozit", quota: 80, group: "standard", methods: allMethods(["K01", "A00", "A01", "D07"]) },
  { order: 30, code: "MS5", name: "Kỹ thuật In", quota: 60, group: "standard", methods: allMethods(["K01", "A00", "A01", "D07"]) },
  { order: 31, code: "PH1", name: "Vật lý Kỹ thuật", quota: 200, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 32, code: "PH2", name: "Kỹ thuật Hạt nhân", quota: 40, group: "standard", methods: allMethods(["K01", "A00", "A01", "A02"]) },
  { order: 33, code: "PH3", name: "Vật lý Y khoa", quota: 60, group: "standard", methods: allMethods(["K01", "A00", "A01", "A02"]) },
  { order: 34, code: "TE1", name: "Kỹ thuật Ô tô", quota: 200, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 35, code: "TE2", name: "Kỹ thuật Cơ khí động lực", quota: 120, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 36, code: "TE3", name: "Kỹ thuật Hàng không", quota: 80, group: "standard", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 37, code: "TX1", name: "Công nghệ Dệt - May", quota: 240, group: "standard", methods: allMethods(["K01", "A00", "A01", "D07"]) },
  { order: 38, code: "BF-E12", name: "Kỹ thuật Thực phẩm", quota: 40, group: "english_advanced", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 39, code: "BF-E19", name: "Kỹ thuật Sinh học", quota: 40, group: "english_advanced", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 40, code: "CH-E11", name: "Kỹ thuật Hóa dược", quota: 80, group: "english_advanced", methods: allMethods(["K01", "A00", "B00", "D07"]) },
  { order: 41, code: "EE-E8", name: "Kỹ thuật Điều khiển - Tự động hoá", quota: 120, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 42, code: "EE-E18", name: "Hệ thống điện và năng lượng tái tạo", quota: 50, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 43, code: "EM-E13", name: "Phân tích kinh doanh", quota: 120, group: "english_advanced", methods: allMethods(["K01", "D07", "A01", "D01"]) },
  { order: 44, code: "EM-E14", name: "Logistics và Quản lý chuỗi cung ứng", quota: 120, group: "english_advanced", methods: allMethods(["K01", "D07", "A01", "D01"]) },
  { order: 45, code: "ET-E4", name: "Kỹ thuật Điện tử - Viễn thông", quota: 60, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 46, code: "ET-E5", name: "Kỹ thuật Y sinh", quota: 40, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 47, code: "ET-E16", name: "Truyền thông số và Kỹ thuật đa phương tiện", quota: 60, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 48, code: "IT-E7", name: "Công nghệ Thông tin", quota: 100, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 49, code: "IT-E10", name: "Khoa học Dữ liệu và Trí tuệ nhân tạo", quota: 100, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 50, code: "IT-E15", name: "An toàn không gian số - Cyber Security", quota: 40, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 51, code: "ME-E1", name: "Kỹ thuật Cơ điện tử", quota: 120, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 52, code: "MS-E3", name: "Khoa học Kỹ thuật vật liệu", quota: 50, group: "english_advanced", methods: allMethods(["K01", "A00", "A01", "D07"]) },
  { order: 53, code: "TE-E2", name: "Kỹ thuật Ô tô", quota: 80, group: "english_advanced", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 54, code: "ET-E9", name: "Hệ thống nhúng thông minh và IoT (CT tiên tiến)", quota: 60, group: "foreign_language", methods: allMethods(["K01", "A00", "A01", "D28"]) },
  { order: 55, code: "IT-E6", name: "Công nghệ thông tin (Việt - Nhật)", quota: 240, group: "foreign_language", methods: allMethods(["K01", "A00", "A01", "D28"]) },
  { order: 56, code: "IT-EP", name: "Công nghệ thông tin (Việt - Pháp)", quota: 40, group: "foreign_language", methods: allMethods(["K01", "A00", "A01", "D29"]) },
  { order: 57, code: "EE-EP", name: "Tin học công nghiệp và Tự động hóa (Chương trình Việt - Pháp PFIEV)", quota: 40, group: "pfiev", methods: allMethods(["K01", "A00", "A01", "D29"]) },
  { order: 58, code: "TE-EP", name: "Cơ khí hàng không (Chương trình Việt - Pháp PFIEV)", quota: 40, group: "pfiev", methods: allMethods(["K01", "A00", "A01", "D29"]) },
  { order: 59, code: "ET-LUH", name: "Điện tử - Viễn thông - hợp tác với Đại học Leibniz Hannover (Đức)", quota: 40, group: "international_cooperation", methods: allMethods(["K01", "A00", "A01", "D26"]) },
  { order: 60, code: "ME-GU", name: "Cơ khí - Chế tạo máy - hợp tác với Đại học Griffith (Úc)", quota: 40, group: "international_cooperation", methods: allMethods(["K01", "A00", "A01"]) },
  { order: 61, code: "ME-LUH", name: "Cơ điện tử - hợp tác với Đại học Leibniz Hannover (Đức)", quota: 50, group: "international_cooperation", methods: allMethods(["K01", "A00", "A01", "D26"]) },
  { order: 62, code: "ME-NUT", name: "Cơ điện tử - hợp tác với Đại học Công nghệ Nagaoka (Nhật Bản)", quota: 100, group: "international_cooperation", methods: allMethods(["K01", "A00", "A01", "D28"]) },
  { order: 63, code: "FL2", name: "Tiếng Anh chuyên nghiệp quốc tế", quota: 90, group: "international_joint", methods: allMethods(["K01", "D01"]) },
  { order: 64, code: "TROY-BA", name: "Quản trị kinh doanh - hợp tác với Đại học Troy (Hoa Kỳ)", quota: 60, group: "international_joint", methods: allMethods(["K01", "A00", "A01", "D01"]) },
  { order: 65, code: "TROY-IT", name: "Khoa học máy tính - hợp tác với Đại học Troy (Hoa Kỳ)", quota: 120, group: "international_joint", methods: allMethods(["K01", "A00", "A01", "D01"]) },
];

export const HUST_ADMISSION_PROGRAMS_2026: HustAdmissionProgram2026[] =
  HUST_ADMISSION_PROGRAMS_2026_SEED.map(withThptConfig);

export function getHustAdmissionProgram2026(programCode: string) {
  return HUST_ADMISSION_PROGRAMS_2026.find((program) => program.code === programCode) ?? null;
}

export function getHustThptCombinationConfig(
  programCode: string,
  combinationCode: string,
) {
  const program = getHustAdmissionProgram2026(programCode);
  if (!program) return null;

  return (
    program.thptCombinations.find(
      (combination) => combination.combinationCode === combinationCode,
    ) ?? null
  );
}
