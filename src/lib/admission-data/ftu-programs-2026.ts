import type {
  AdmissionMethod,
} from "@/src/lib/admission-engine/core/types";
import type {
  FtuCombinationCode,
  FtuFormulaGroup,
  FtuSubjectKey,
} from "@/src/lib/admission-engine/modules/ftu/ftu.types";

// Cấu hình chương trình/mã xét tuyển FTU 2026 theo Phụ lục 1 (QĐ 1566/QĐ-ĐHNT, 08/04/2026).

export type FtuLocation = "HN" | "HCM" | "QN";

export type FtuProgramType =
  | "TC" // Chương trình tiêu chuẩn
  | "CLC" // Chất lượng cao
  | "TT" // Tiên tiến
  | "DHNNQT" // Định hướng nghề nghiệp quốc tế
  | "DHPTQT" // Định hướng phát triển quốc tế
  | "TH"; // Tích hợp

export const FTU_LOCATION_LABELS: Record<FtuLocation, string> = {
  HN: "Hà Nội",
  HCM: "TP. Hồ Chí Minh",
  QN: "Quảng Ninh",
};

export const FTU_FORMULA_GROUP_LABELS: Record<FtuFormulaGroup, string> = {
  1: "Nhóm 1 - Không nhân hệ số (thang 30)",
  2: "Nhóm 2 - Toán nhân đôi (thang 40)",
  3: "Nhóm 3 - Văn & Ngoại ngữ hệ số 1.5 (thang 40)",
};

export const FTU_SUBJECT_LABELS: Record<FtuSubjectKey, string> = {
  math: "Toán",
  physics: "Vật lý",
  chemistry: "Hóa học",
  literature: "Ngữ văn",
  english: "Tiếng Anh",
  french: "Tiếng Pháp",
  japanese: "Tiếng Nhật",
  chinese: "Tiếng Trung",
  russian: "Tiếng Nga",
};

export type FtuCombinationDefinition = {
  code: FtuCombinationCode;
  // Thứ tự môn: [Toán, môn 2, môn 3].
  subjects: FtuSubjectKey[];
  // Môn ngoại ngữ trong tổ hợp (nếu có) - dùng cho phương thức kết hợp CCNNQT và nhóm 3.
  foreignLanguage?: FtuSubjectKey;
};

export const FTU_COMBINATIONS_2026: Record<FtuCombinationCode, FtuCombinationDefinition> = {
  A00: { code: "A00", subjects: ["math", "physics", "chemistry"] },
  A01: { code: "A01", subjects: ["math", "physics", "english"], foreignLanguage: "english" },
  D01: { code: "D01", subjects: ["math", "literature", "english"], foreignLanguage: "english" },
  D02: { code: "D02", subjects: ["math", "literature", "russian"], foreignLanguage: "russian" },
  D03: { code: "D03", subjects: ["math", "literature", "french"], foreignLanguage: "french" },
  D04: { code: "D04", subjects: ["math", "literature", "chinese"], foreignLanguage: "chinese" },
  D06: { code: "D06", subjects: ["math", "literature", "japanese"], foreignLanguage: "japanese" },
  D07: { code: "D07", subjects: ["math", "chemistry", "english"], foreignLanguage: "english" },
};

export type FtuAdmissionProgram2026 = {
  code: string;
  name: string;
  location: FtuLocation;
  programType: FtuProgramType;
  formulaGroup: FtuFormulaGroup;
  combinations: FtuCombinationCode[];
  quota: number;
  methods: AdmissionMethod[];
};

const FTU_DEFAULT_METHODS: AdmissionMethod[] = ["HOC_BA", "THPT", "DGNL", "XTT"];

const withDefaults = (
  program: Omit<FtuAdmissionProgram2026, "methods"> &
    Partial<Pick<FtuAdmissionProgram2026, "methods">>,
): FtuAdmissionProgram2026 => ({
  methods: FTU_DEFAULT_METHODS,
  ...program,
});

export const FTU_ADMISSION_PROGRAMS_2026: FtuAdmissionProgram2026[] = [
  // --- Cơ sở Hà Nội ---
  withDefaults({ code: "NTH.KT.H01", name: "CT TT Kinh tế đối ngoại", location: "HN", programType: "TT", formulaGroup: 1, combinations: ["A01", "D01", "D07"], quota: 80 }),
  withDefaults({ code: "NTH.KT.H02", name: "Kinh tế đối ngoại (CLC/TC)", location: "HN", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D02", "D03", "D04", "D06", "D07"], quota: 640 }),
  withDefaults({ code: "NTH.KT.H03", name: "CT ĐHNNQT Logistics toàn cầu và đổi mới chuỗi cung ứng", location: "HN", programType: "DHNNQT", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 50 }),
  withDefaults({ code: "NTH.KT.H04", name: "Kinh tế quốc tế (CLC/TC/ĐHNNQT KT số & PT dữ liệu)", location: "HN", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D03", "D07"], quota: 340 }),
  withDefaults({ code: "NTH.KD.H05", name: "CT TT i-Hons Kinh doanh quốc tế & Phân tích dữ liệu kinh doanh", location: "HN", programType: "TT", formulaGroup: 1, combinations: ["A01", "D01", "D07"], quota: 70 }),
  withDefaults({ code: "NTH.KD.H06", name: "Kinh doanh quốc tế (CLC/TC)", location: "HN", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 190 }),
  withDefaults({ code: "NTH.KD.H07", name: "CT ĐHNNQT Kinh doanh số toàn cầu / KDQT theo mô hình tiên tiến Nhật Bản", location: "HN", programType: "DHNNQT", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D06", "D07"], quota: 130 }),
  withDefaults({ code: "NTH.KD.H08", name: "CT ĐHNNQT Kinh doanh sáng tạo & CN văn hóa / Quản lý công nghiệp thông minh", location: "HN", programType: "DHNNQT", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 100 }),
  withDefaults({ code: "NTH.QT.H09", name: "CT TT Quản trị kinh doanh", location: "HN", programType: "TT", formulaGroup: 1, combinations: ["A01", "D01", "D07"], quota: 80 }),
  withDefaults({ code: "NTH.QT.H10", name: "Quản trị kinh doanh (CLC/TC/ĐHNNQT QT nguồn nhân lực số)", location: "HN", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 230 }),
  withDefaults({ code: "NTH.TM.H11", name: "CT ĐHNNQT Thương mại số thông minh và đổi mới kinh doanh", location: "HN", programType: "DHNNQT", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 100 }),
  withDefaults({ code: "NTH.QK.H12", name: "CT ĐHNNQT Marketing số / Quản trị khách sạn / ĐHPTQT Kinh tế chính trị quốc tế", location: "HN", programType: "DHNNQT", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 100 }),
  withDefaults({ code: "NTH.TC.H14", name: "CT TT Tài chính - Ngân hàng", location: "HN", programType: "TT", formulaGroup: 1, combinations: ["A01", "D01", "D07"], quota: 40 }),
  withDefaults({ code: "NTH.TC.H15", name: "Tài chính - Ngân hàng (CLC/TC/ĐHNNQT Công nghệ tài chính & Tài chính bền vững)", location: "HN", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 300 }),
  withDefaults({ code: "NTH.KE.H16", name: "Kế toán - Kiểm toán (TC/ĐHNNQT ACCA/Kiểm toán tích hợp công nghệ)", location: "HN", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 200 }),
  withDefaults({ code: "NTH.LS.H17", name: "Luật (TMQT/ĐHNNQT Luật KDQT/Luật KT & KD số/TH Luật dân sự & tố tụng dân sự)", location: "HN", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 220 }),
  withDefaults({ code: "NTH.CN.H18", name: "CT TH Khoa học máy tính / Trí tuệ nhân tạo / Khoa học dữ liệu trong kinh tế và kinh doanh", location: "HN", programType: "TH", formulaGroup: 2, combinations: ["A00", "A01", "D01", "D07"], quota: 150 }),
  withDefaults({ code: "NTH.NN.H19", name: "CT TH Tiếng Anh thương mại", location: "HN", programType: "TH", formulaGroup: 3, combinations: ["D01"], quota: 170 }),
  withDefaults({ code: "NTH.NN.H20", name: "CT TH Tiếng Trung thương mại", location: "HN", programType: "TH", formulaGroup: 3, combinations: ["D01", "D04"], quota: 120 }),
  withDefaults({ code: "NTH.NN.H21", name: "CT TH Tiếng Nhật thương mại", location: "HN", programType: "TH", formulaGroup: 3, combinations: ["D01", "D06"], quota: 120 }),
  withDefaults({ code: "NTH.NN.H22", name: "CT TH Tiếng Pháp thương mại", location: "HN", programType: "TH", formulaGroup: 3, combinations: ["D01", "D03"], quota: 60 }),
  // --- Cơ sở TP. Hồ Chí Minh ---
  withDefaults({ code: "NTH.KT.S23", name: "Kinh tế đối ngoại (CLC/TC)", location: "HCM", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D06", "D07"], quota: 520 }),
  withDefaults({ code: "NTH.KT.S24", name: "CT ĐHNNQT Logistics toàn cầu và đổi mới chuỗi cung ứng", location: "HCM", programType: "DHNNQT", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 50 }),
  withDefaults({ code: "NTH.QT.S25", name: "Quản trị kinh doanh (CLC/TC)", location: "HCM", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 140 }),
  withDefaults({ code: "NTH.MT.S26", name: "CT ĐHNNQT Truyền thông Marketing tích hợp", location: "HCM", programType: "DHNNQT", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 50 }),
  withDefaults({ code: "NTH.TC.S27", name: "Tài chính - Ngân hàng (CLC/TC)", location: "HCM", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 120 }),
  withDefaults({ code: "NTH.KE.S28", name: "Kế toán - Kiểm toán (TC)", location: "HCM", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 70 }),
  // --- Cơ sở Quảng Ninh ---
  withDefaults({ code: "NTH.KK.Q29", name: "Kế toán - Kiểm toán / Kinh doanh quốc tế (TC)", location: "QN", programType: "TC", formulaGroup: 1, combinations: ["A00", "A01", "D01", "D07"], quota: 100 }),
];

export function getFtuProgram2026(programCode: string): FtuAdmissionProgram2026 | null {
  return (
    FTU_ADMISSION_PROGRAMS_2026.find((program) => program.code === programCode) ?? null
  );
}

export function listFtuPrograms2026(): FtuAdmissionProgram2026[] {
  return FTU_ADMISSION_PROGRAMS_2026;
}

export function getFtuCombinationDefinition(
  combinationCode: string,
): FtuCombinationDefinition | null {
  return (
    FTU_COMBINATIONS_2026[combinationCode as FtuCombinationCode] ?? null
  );
}

export function getFtuProgramCombination(
  programCode: string,
  combinationCode: string,
): FtuCombinationDefinition | null {
  const program = getFtuProgram2026(programCode);
  if (!program) return null;
  if (!program.combinations.includes(combinationCode as FtuCombinationCode)) {
    return null;
  }
  return getFtuCombinationDefinition(combinationCode);
}

export function getFtuCombinationSubjectLabel(combinationCode: string): string {
  const definition = getFtuCombinationDefinition(combinationCode);
  if (!definition) return combinationCode;
  return definition.subjects
    .map((subject) => FTU_SUBJECT_LABELS[subject])
    .join(" + ");
}
