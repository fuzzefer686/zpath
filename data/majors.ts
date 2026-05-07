export interface Major {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
}

export interface Program {
  id: string;
  majorId: string;
  universityCode: string;
  universityName: string;
  tuitionPerYear: number;
  durationYears: number;
  employmentRate: number;
  avgStartingSalary: number;
  admissionScore: number;
  curriculumHighlights: string[];
  description: string;
}

export const MAJORS: Major[] = [
  {
    id: "cntt",
    code: "CNTT",
    name: "Công nghệ Thông tin",
    category: "Công nghệ",
    description:
      "Ngành học về phần mềm, hệ thống máy tính, dữ liệu và sản phẩm số. Phù hợp với học sinh thích logic, giải quyết vấn đề và xây dựng công cụ thực tế.",
    tags: ["Lập trình", "Phần mềm", "Dữ liệu", "AI"],
  },
  {
    id: "ds",
    code: "DS",
    name: "Khoa học Dữ liệu",
    category: "Công nghệ",
    description:
      "Tập trung vào thống kê, lập trình và mô hình hóa dữ liệu để tạo insight, dự báo và hỗ trợ ra quyết định.",
    tags: ["Data", "Machine Learning", "Thống kê"],
  },
  {
    id: "mkt",
    code: "MKT",
    name: "Marketing",
    category: "Kinh doanh",
    description:
      "Kết hợp nghiên cứu khách hàng, thương hiệu, truyền thông và tăng trưởng doanh thu. Phù hợp với người sáng tạo nhưng vẫn thích dữ liệu.",
    tags: ["Thương hiệu", "Digital", "Nội dung", "Tăng trưởng"],
  },
  {
    id: "fin",
    code: "FIN",
    name: "Tài chính - Ngân hàng",
    category: "Kinh doanh",
    description:
      "Ngành học về dòng tiền, đầu tư, thị trường tài chính và quản trị rủi ro trong tổ chức.",
    tags: ["Đầu tư", "Ngân hàng", "Phân tích", "Rủi ro"],
  },
  {
    id: "ktdn",
    code: "KTDN",
    name: "Kinh tế Đối ngoại",
    category: "Kinh doanh quốc tế",
    description:
      "Nghiên cứu thương mại quốc tế, logistics, đàm phán, thị trường và vận hành kinh doanh xuyên biên giới.",
    tags: ["Thương mại", "Logistics", "Quốc tế"],
  },
  {
    id: "spt",
    code: "SPT",
    name: "Sư phạm Toán",
    category: "Giáo dục",
    description:
      "Đào tạo giáo viên Toán và chuyên gia giáo dục có nền tảng toán học, phương pháp sư phạm và năng lực truyền đạt.",
    tags: ["Giáo dục", "Toán học", "Sư phạm"],
  },
  {
    id: "ykhoa",
    code: "YKHOA",
    name: "Y khoa",
    category: "Sức khỏe",
    description:
      "Ngành đào tạo bác sĩ đa khoa với cường độ học cao, yêu cầu kỷ luật, khả năng chịu áp lực và tinh thần phục vụ cộng đồng.",
    tags: ["Bác sĩ", "Sức khỏe", "Lâm sàng"],
  },
  {
    id: "lkt",
    code: "LKT",
    name: "Luật Kinh tế",
    category: "Pháp lý",
    description:
      "Tập trung vào pháp luật doanh nghiệp, hợp đồng, đầu tư, thương mại và giải quyết tranh chấp trong hoạt động kinh doanh.",
    tags: ["Doanh nghiệp", "Hợp đồng", "Pháp lý"],
  },
];

export const PROGRAMS: Program[] = [
  {
    id: "hust-cntt",
    majorId: "cntt",
    universityCode: "HUST",
    universityName: "Đại học Bách Khoa Hà Nội",
    tuitionPerYear: 32000000,
    durationYears: 4,
    employmentRate: 94,
    avgStartingSalary: 18000000,
    admissionScore: 28.53,
    curriculumHighlights: ["Cấu trúc dữ liệu", "Hệ điều hành", "Phát triển phần mềm"],
    description: "Chương trình kỹ thuật mạnh, phù hợp định hướng software engineer và hệ thống.",
  },
  {
    id: "vnu-cntt",
    majorId: "cntt",
    universityCode: "VNU",
    universityName: "Đại học Quốc gia Hà Nội",
    tuitionPerYear: 26000000,
    durationYears: 4,
    employmentRate: 91,
    avgStartingSalary: 16000000,
    admissionScore: 27.8,
    curriculumHighlights: ["Lập trình", "Mạng máy tính", "Cơ sở dữ liệu"],
    description: "Định hướng đa ngành, nhiều cơ hội nghiên cứu và chuyển tiếp sang AI/Data.",
  },
  {
    id: "hust-ds",
    majorId: "ds",
    universityCode: "HUST",
    universityName: "Đại học Bách Khoa Hà Nội",
    tuitionPerYear: 44000000,
    durationYears: 4,
    employmentRate: 92,
    avgStartingSalary: 20000000,
    admissionScore: 28.16,
    curriculumHighlights: ["Machine Learning", "Data Mining", "Xác suất thống kê"],
    description: "Phù hợp học sinh mạnh Toán, thích mô hình, dữ liệu và AI ứng dụng.",
  },
  {
    id: "neu-mkt",
    majorId: "mkt",
    universityCode: "NEU",
    universityName: "Đại học Kinh tế Quốc dân",
    tuitionPerYear: 22000000,
    durationYears: 4,
    employmentRate: 88,
    avgStartingSalary: 12000000,
    admissionScore: 28.18,
    curriculumHighlights: ["Consumer Insight", "Brand Management", "Digital Marketing"],
    description: "Mạnh về nền tảng quản trị, thị trường và marketing chiến lược.",
  },
  {
    id: "ftu-mkt",
    majorId: "mkt",
    universityCode: "FTU",
    universityName: "Đại học Ngoại Thương",
    tuitionPerYear: 24000000,
    durationYears: 4,
    employmentRate: 90,
    avgStartingSalary: 14000000,
    admissionScore: 28.1,
    curriculumHighlights: ["Marketing Quốc tế", "Thương mại", "Brand Strategy"],
    description: "Phù hợp định hướng môi trường quốc tế, ngoại ngữ và thương hiệu toàn cầu.",
  },
  {
    id: "neu-fin",
    majorId: "fin",
    universityCode: "NEU",
    universityName: "Đại học Kinh tế Quốc dân",
    tuitionPerYear: 22000000,
    durationYears: 4,
    employmentRate: 87,
    avgStartingSalary: 13000000,
    admissionScore: 27.65,
    curriculumHighlights: ["Corporate Finance", "Investment", "Risk Management"],
    description: "Nền tảng tài chính doanh nghiệp và thị trường tài chính vững.",
  },
  {
    id: "ueh-fin",
    majorId: "fin",
    universityCode: "UEH",
    universityName: "Đại học Kinh tế TP.HCM",
    tuitionPerYear: 32000000,
    durationYears: 4,
    employmentRate: 89,
    avgStartingSalary: 13500000,
    admissionScore: 27.2,
    curriculumHighlights: ["Banking", "Fintech", "Financial Analysis"],
    description: "Lợi thế network doanh nghiệp phía Nam và chương trình tài chính ứng dụng.",
  },
  {
    id: "ftu-ktdn",
    majorId: "ktdn",
    universityCode: "FTU",
    universityName: "Đại học Ngoại Thương",
    tuitionPerYear: 24000000,
    durationYears: 4,
    employmentRate: 91,
    avgStartingSalary: 15000000,
    admissionScore: 28.5,
    curriculumHighlights: ["International Trade", "Logistics", "Negotiation"],
    description: "Một trong các lựa chọn nổi bật cho thương mại quốc tế và logistics.",
  },
  {
    id: "hnue-spt",
    majorId: "spt",
    universityCode: "HNUE",
    universityName: "Đại học Sư phạm Hà Nội",
    tuitionPerYear: 0,
    durationYears: 4,
    employmentRate: 86,
    avgStartingSalary: 9000000,
    admissionScore: 28.6,
    curriculumHighlights: ["Đại số", "Giải tích", "Phương pháp dạy học Toán"],
    description: "Đào tạo giáo viên Toán bài bản, phù hợp học sinh yêu thích giảng dạy.",
  },
  {
    id: "hmu-ykhoa",
    majorId: "ykhoa",
    universityCode: "HMU",
    universityName: "Đại học Y Hà Nội",
    tuitionPerYear: 54000000,
    durationYears: 6,
    employmentRate: 95,
    avgStartingSalary: 16000000,
    admissionScore: 28.85,
    curriculumHighlights: ["Giải phẫu", "Sinh lý", "Lâm sàng"],
    description: "Lộ trình học dài và nặng, đổi lại nền tảng y khoa rất mạnh.",
  },
  {
    id: "hlu-lkt",
    majorId: "lkt",
    universityCode: "HLU",
    universityName: "Đại học Luật Hà Nội",
    tuitionPerYear: 18000000,
    durationYears: 4,
    employmentRate: 82,
    avgStartingSalary: 10000000,
    admissionScore: 27.36,
    curriculumHighlights: ["Luật doanh nghiệp", "Luật hợp đồng", "Tranh tụng"],
    description: "Phù hợp định hướng pháp chế doanh nghiệp, tư vấn luật và compliance.",
  },
];

export const COMPARE_CRITERIA = [
  { key: "tuitionPerYear", label: "Học phí / năm", lowerIsBetter: true, format: "currency" },
  { key: "durationYears", label: "Thời gian", lowerIsBetter: true, format: "years" },
  { key: "employmentRate", label: "Tỉ lệ có việc", lowerIsBetter: false, format: "percent" },
  { key: "avgStartingSalary", label: "Lương khởi điểm", lowerIsBetter: false, format: "currency" },
  { key: "admissionScore", label: "Điểm chuẩn", lowerIsBetter: true, format: "score" },
] as const;

export function getMajor(code: string) {
  return MAJORS.find((major) => major.code.toLowerCase() === code.toLowerCase());
}

export function getProgramsByMajor(majorId: string) {
  return PROGRAMS.filter((program) => program.majorId === majorId);
}

export function getMajorStats(majorId: string) {
  const programs = getProgramsByMajor(majorId);
  if (programs.length === 0) return null;

  const average = (values: number[]) =>
    Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;

  return {
    nPrograms: programs.length,
    tuitionPerYear: average(programs.map((program) => program.tuitionPerYear)),
    durationYears: average(programs.map((program) => program.durationYears)),
    employmentRate: average(programs.map((program) => program.employmentRate)),
    avgStartingSalary: average(programs.map((program) => program.avgStartingSalary)),
    admissionScore: average(programs.map((program) => program.admissionScore)),
  };
}

export function formatVND(value: number) {
  if (value === 0) return "Miễn phí";
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}
