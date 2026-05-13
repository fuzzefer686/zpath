/**
 * Type system cho module Tư vấn Chọn Ngành (Advisor)
 * Tách riêng khỏi lib/types.ts cũ để không ảnh hưởng TrialForm / matching-engine
 */

import type { AdvisorScoreWeightKey } from "@/lib/advisor-weight-schema";

// ── Hồ sơ người dùng nhập từ form ──────────────────────────────────────────
export type AdvisorSubject =
  | "english"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "geography"
  | "civicEducation"
  | "informatics"
  | "technology";

export type AdvisorElectiveScore = {
  subject: AdvisorSubject;
  score: number;
};

export type AdvisorUserProfile = {
  /** Điểm Toán (thang 10) */
  math: number;
  /** Điểm Văn (thang 10) */
  literature: number;
  /** Hai môn tổ hợp tự chọn (thang 10) */
  electives: [AdvisorElectiveScore, AdvisorElectiveScore];
  /** IELTS band – optional */
  ielts?: number | null;
  /** SAT score – optional */
  sat?: number | null;
  /** Mã tính cách MBTI hoặc SBTI – optional */
  personality?: string | null;
  /** Danh sách sở thích đã chọn */
  interests: string[];
  /** Danh sách mục tiêu nghề nghiệp đã chọn */
  careerGoals: string[];
  /** Danh sách điều không thích – optional */
  dislikes?: string[];
};

// ── Dữ liệu một ngành học (load từ majors.json) ────────────────────────────
export type Major = {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Trọng số yêu cầu môn học (0-1). Tổng không nhất thiết = 1 */
  recommendedSubjects: Partial<Record<"math" | "literature" | AdvisorSubject, number>>;
  /** Trọng số các nhóm tiêu chí tính điểm cuối */
  scoreWeights?: Partial<Record<AdvisorScoreWeightKey, number>>;
  /** Tags sở thích liên quan */
  interestTags: string[];
  /** Tags mục tiêu nghề nghiệp liên quan */
  careerGoalTags: string[];
  /** Mã MBTI/SBTI phù hợp */
  personalityTags: string[];
  /** Kỹ năng nên rèn luyện */
  skillsToImprove: string[];
  /** Nghề nghiệp đầu ra */
  careerPaths: string[];
};

// ── Kết quả chấm điểm 1 ngành ──────────────────────────────────────────────
export type RecommendationResult = {
  major: Major;
  /** Điểm tổng kết (0-100) */
  finalScore: number;
  /** Điểm phù hợp học lực (0-100) */
  academicFit: number;
  /** Điểm phù hợp sở thích (0-100) */
  interestFit: number;
  /** Điểm phù hợp mục tiêu nghề nghiệp (0-100) */
  careerGoalFit: number;
  /** Điểm phù hợp tính cách (0-100) */
  personalityFit: number;
};

// ── Danh sách sở thích cho UI multi-select ──────────────────────────────────
export const INTEREST_OPTIONS = [
  "Công nghệ",
  "Kinh doanh",
  "Giao tiếp",
  "Sáng tạo",
  "Ngôn ngữ",
  "Du lịch",
  "Y tế",
  "Giáo dục",
  "Phân tích dữ liệu",
  "Thiết kế",
  "Luật",
  "Tài chính",
] as const;

// ── Danh sách mục tiêu nghề nghiệp cho UI multi-select ─────────────────────
export const CAREER_GOAL_OPTIONS = [
  "Thu nhập cao",
  "Công việc ổn định",
  "Môi trường quốc tế",
  "Công việc sáng tạo",
  "Làm việc với con người",
  "Làm việc với dữ liệu",
  "Có cơ hội thăng tiến",
  "Có thể làm freelancer/remote",
] as const;

export const ADVISOR_SUBJECT_OPTIONS: { value: AdvisorSubject; label: string }[] = [
  { value: "english", label: "Tiếng Anh" },
  { value: "physics", label: "Vật lý" },
  { value: "chemistry", label: "Hóa học" },
  { value: "biology", label: "Sinh học" },
  { value: "history", label: "Lịch sử" },
  { value: "geography", label: "Địa lý" },
  { value: "civicEducation", label: "GDKT & Pháp luật" },
  { value: "informatics", label: "Tin học" },
  { value: "technology", label: "Công nghệ" },
];
