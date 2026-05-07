export type Tier = "LOW" | "MID" | "HIGH";

export const SBTI_TYPES = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const;

export type SbtiType = (typeof SBTI_TYPES)[number];

export const SUBJECTS = ["Lý", "Hóa", "Sinh", "Sử", "Địa", "Anh", "GDKT-PL", "Tin"] as const;
export type Subject = (typeof SUBJECTS)[number];

export interface TrialFormData {
  sbti: SbtiType | "";
  scoreMath: number;
  scoreLiterature: number;
  electiveSubject1: Subject | "";
  electiveScore1: number;
  electiveSubject2: Subject | "";
  electiveScore2: number;
  ielts: number;
  culturalAward: "none" | "encouragement" | "third" | "second" | "first";
  region: string;
}

export interface TrialResult {
  tier: Tier;
  totalScore: number;
  bonus: number;
  message: string;
}

export const REGIONS = [
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "Nghệ An",
  "Thanh Hóa",
  "Nam Định",
  "Quảng Ninh",
  "Khác",
];
