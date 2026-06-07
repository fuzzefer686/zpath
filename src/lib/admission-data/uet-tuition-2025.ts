export type UetTuition2025Row = {
  programCode: string;
  programName: string;
  minFee: number;
  maxFee: number;
  currency: "VND";
  unit: "học kỳ";
  description: string;
  note?: string;
  sourceUrl: string;
};

export const UET_TUITION_2025: UetTuition2025Row[] = [
  {
    programCode: "CN1",
    programName: "Công nghệ thông tin",
    minFee: 15000000,
    maxFee: 17500000,
    currency: "VND",
    unit: "học kỳ",
    description: "Học phí tạm tính theo quy định cơ chế tự chủ và định mức học phí của ĐHQGHN năm học 2025-2026.",
    sourceUrl: "https://tuyensinh.uet.vnu.edu.vn",
  },
  {
    programCode: "CN9",
    programName: "Sư phạm Công nghệ",
    minFee: 0,
    maxFee: 0,
    currency: "VND",
    unit: "học kỳ",
    description: "Miễn học phí theo quy định.",
    sourceUrl: "https://tuyensinh.uet.vnu.edu.vn",
  },
  {
    programCode: "CN21",
    programName: "Công nghệ vi mạch bán dẫn",
    minFee: 15000000,
    maxFee: 17500000,
    currency: "VND",
    unit: "học kỳ",
    description: "Học phí tạm tính theo quy định cơ chế tự chủ và định mức học phí của ĐHQGHN năm học 2025-2026.",
    sourceUrl: "https://tuyensinh.uet.vnu.edu.vn",
  },
];
