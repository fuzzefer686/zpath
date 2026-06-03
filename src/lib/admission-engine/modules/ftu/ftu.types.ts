// Kiểu dữ liệu dùng chung cho engine tính điểm xét tuyển FTU (Đại học Ngoại thương) 2026.

export type FtuFormulaGroup = 1 | 2 | 3;

export type FtuSubjectKey =
  | "math"
  | "physics"
  | "chemistry"
  | "literature"
  | "english"
  | "french"
  | "japanese"
  | "chinese"
  | "russian";

export type FtuCombinationCode =
  | "A00"
  | "A01"
  | "D01"
  | "D02"
  | "D03"
  | "D04"
  | "D06"
  | "D07";

export type FtuSubjectScores = Partial<Record<FtuSubjectKey, number>>;

// Chứng chỉ ngoại ngữ quốc tế (CCNNQT) dùng cho phương thức kết hợp.
export type FtuEnglishCertType = "IELTS" | "TOEFL_IBT" | "CAMBRIDGE";
export type FtuOtherLanguageCertType = "JLPT" | "EJU" | "HSK" | "DELF_DALF";

export type FtuOtherLanguageCertPayload =
  | { type: "JLPT"; level: "N1" | "N2" | "N3"; score?: number }
  | { type: "EJU"; score: number }
  | {
      type: "HSK";
      level: 3 | 4 | 5 | 6;
      score?: number;
      hskk: "TRUNG_CAP" | "CAO_CAP";
      hskkScore: number;
    }
  | {
      type: "DELF_DALF";
      level: "DELF_B1" | "DELF_B2" | "DALF_C1" | "DALF_C2";
      score?: number;
    };

export type FtuCertificatePayload =
  | { kind: "english"; type: FtuEnglishCertType; value: number }
  | ({ kind: "other" } & FtuOtherLanguageCertPayload);

// Loại giải thưởng dùng để cộng điểm thưởng theo Phụ lục 2.
export type FtuAwardType =
  | "OLYMPIC_INTL"
  | "NATIONAL_FIRST"
  | "NATIONAL_SECOND"
  | "NATIONAL_THIRD"
  | "NATIONAL_CONSOLATION"
  | "NATIONAL_TEAM"
  | "SCIENCE_INTL"
  | "SCIENCE_NATIONAL_FIRST"
  | "SCIENCE_NATIONAL_SECOND"
  | "SCIENCE_NATIONAL_THIRD"
  | "SCIENCE_NATIONAL_FOURTH";

export type FtuPriorityInput = {
  // Mức điểm ưu tiên khu vực và đối tượng (tính trên thang 30, theo Quy chế Bộ 2026).
  regionPriority?: number;
  subjectPriority?: number;
  // Danh sách giải thưởng để hệ thống tự tính điểm thưởng (chọn giải cao nhất).
  awards?: FtuAwardType[];
  // Điểm thưởng nhập tay (thang 30) khi không dùng danh sách giải.
  bonusScore?: number;
};

export type FtuHocBaPayload = {
  programCode: string;
  combinationCode: FtuCombinationCode;
  // Điểm trung bình chung cả năm lớp 10, 11, 12 của từng môn.
  scores: FtuSubjectScores;
  // Phương thức kết hợp CCNNQT: môn ngoại ngữ (M3) thay bằng điểm quy đổi chứng chỉ.
  useCertificate?: boolean;
  certificate?: FtuCertificatePayload;
  priority?: FtuPriorityInput;
};

// Cấu trúc payload Thi tốt nghiệp THPT trùng với học bạ (chỉ khác nguồn điểm).
export type FtuThptPayload = FtuHocBaPayload;

export type FtuDgnlTestType = "HSA" | "VACT" | "TSA" | "SAT" | "ACT" | "ALEVEL";

export type FtuDgnlPayload = {
  programCode: string;
  testType: FtuDgnlTestType;
  // Điểm bài thi gốc (HSA thang 150, V-ACT thang 1200, TSA thang 100, SAT/ACT theo thang gốc).
  testScore?: number;
  // HSA Phần 3: "science" (Lý + Hóa) hoặc "english" (Tiếng Anh).
  hsaSection?: "science" | "english";
  // ĐGNL quốc tế kết hợp CCNNQT.
  certificate?: FtuCertificatePayload;
  // A-Level: điểm môn Toán và một môn bất kỳ khác Toán (chữ cái A*..E).
  aLevelMath?: string;
  aLevelOther?: string;
  priority?: FtuPriorityInput;
};

export type FtuXttObject =
  | "a" // Anh hùng lao động / LLVT / Chiến sĩ thi đua toàn quốc
  | "b" // Olympic quốc tế
  | "c" // Giải Nhất/Nhì/Ba HSG quốc gia
  | "d" // Giải chính thức nghệ thuật quốc tế
  | "e" // Người khuyết tật đặc biệt nặng
  | "f" // Người nước ngoài / học THPT ở nước ngoài
  | "g"; // Dân tộc thiểu số rất ít người

export type FtuXttPayload = {
  programCode?: string;
  object: FtuXttObject;
  // Riêng đối tượng d cần tổng 3 môn thi TN THPT theo tổ hợp >= 24.0.
  totalThreeSubjects?: number;
  // Năm đạt giải (để kiểm tra thời hạn còn hiệu lực).
  awardYear?: number;
};
