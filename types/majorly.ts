export interface Major {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  icon: string;
}

export interface Program {
  id: string;
  major_id: string;
  university_code: string;
  university_name: string;
  tuition_per_year: number;
  duration_years: number;
  employment_rate: number; // 0-100
  avg_starting_salary: number; // VND/month
  admission_score: number;
  curriculum_highlights: string[];
  description: string;
}

export const COMPARE_CRITERIA = [
  { key: "tuition_per_year", label: "Học phí / năm", lowerIsBetter: true, format: "currency" },
  { key: "duration_years", label: "Thời gian (năm)", lowerIsBetter: true, format: "years" },
  { key: "employment_rate", label: "Tỉ lệ có việc", lowerIsBetter: false, format: "percent" },
  { key: "avg_starting_salary", label: "Lương khởi điểm", lowerIsBetter: false, format: "currency" },
  { key: "admission_score", label: "Điểm chuẩn", lowerIsBetter: true, format: "score" },
  { key: "n_programs", label: "Số trường đào tạo", lowerIsBetter: false, format: "count" },
  { key: "n_highlights", label: "Số môn nổi bật", lowerIsBetter: false, format: "count" },
] as const;

export type CriteriaKey = typeof COMPARE_CRITERIA[number]["key"];
