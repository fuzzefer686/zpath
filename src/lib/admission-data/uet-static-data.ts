import type {
  AdmissionInfo,
  AdmissionMethodRecord,
  AdmissionProgram,
  Benchmark,
  TuitionFee,
  ProgramCombination,
} from "@/src/types/admission-data";

// The 20 majors for UET
const UET_BASE_PROGRAMS = [
  { code: "CN1", name: "Công nghệ thông tin", majorCode: "7480201", quota2026: 480, note: "Ngành trọng điểm" },
  { code: "CN2", name: "Kỹ thuật máy tính", majorCode: "7480106", quota2026: 420, note: null },
  { code: "CN3", name: "Vật lý kỹ thuật", majorCode: "7520401", quota2026: 180, note: null },
  { code: "CN4", name: "Cơ kỹ thuật", majorCode: "7520101", quota2026: 60, note: null },
  { code: "CN5", name: "Công nghệ kỹ thuật xây dựng", majorCode: "7510103", quota2026: 180, note: null },
  { code: "CN6", name: "Công nghệ kỹ thuật cơ điện tử", majorCode: "7510406", quota2026: 180, note: null },
  { code: "CN7", name: "Công nghệ hàng không vũ trụ", majorCode: "7520120", quota2026: 120, note: "Chương trình thí điểm" },
  { code: "CN8", name: "Khoa học máy tính", majorCode: "7480101", quota2026: 420, note: null },
  { code: "CN9", name: "Công nghệ kỹ thuật điện tử - viễn thông", majorCode: "7510401", quota2026: 480, note: null },
  { code: "CN10", name: "Công nghệ nông nghiệp", majorCode: "7620115", quota2026: 60, note: "Chương trình thí điểm" },
  { code: "CN11", name: "Kỹ thuật điều khiển và tự động hóa", majorCode: "7520216", quota2026: 120, note: null },
  { code: "CN12", name: "Trí tuệ nhân tạo", majorCode: "7480107", quota2026: 300, note: null },
  { code: "CN13", name: "Kỹ thuật năng lượng", majorCode: "7520215", quota2026: 60, note: "Chương trình thí điểm" },
  { code: "CN14", name: "Hệ thống thông tin", majorCode: "7480104", quota2026: 240, note: null },
  { code: "CN15", name: "Mạng máy tính và truyền thông dữ liệu", majorCode: "7480102", quota2026: 120, note: null },
  { code: "CN17", name: "Kỹ thuật Robot", majorCode: "7520218", quota2026: 120, note: "Chương trình thí điểm" },
  { code: "CN18", name: "Thiết kế công nghiệp và Đồ họa", majorCode: "7529001", quota2026: 240, note: "Chương trình thí điểm" },
  { code: "CN19", name: "Công nghệ vật liệu và Vi điện tử", majorCode: "7510402", quota2026: 120, note: "Ngành mới" },
  { code: "CN20", name: "Khoa học và Kỹ thuật dữ liệu", majorCode: "7480109", quota2026: 120, note: "Ngành mới" },
  { code: "CN21", name: "Công nghệ kỹ thuật sinh học", majorCode: "7420201", quota2026: 60, note: "Ngành mới" },
];

// Benchmark scores mapping
const UET_BENCHMARK_SCORES: Record<
  string,
  {
    thpt25: number;
    thpt24: number | null;
    hsa24: number | null;
    ielts24: number | null;
    sat24: number | null;
  }
> = {
  CN1: { thpt25: 28.19, thpt24: 27.80, hsa24: 23.50, ielts24: 27.00, sat24: 28.00 },
  CN2: { thpt25: 27.00, thpt24: 26.97, hsa24: 20.00, ielts24: 26.50, sat24: 26.25 },
  CN3: { thpt25: 25.20, thpt24: 25.24, hsa24: 17.00, ielts24: 23.00, sat24: 23.40 },
  CN4: { thpt25: 26.15, thpt24: 26.03, hsa24: 17.00, ielts24: 23.00, sat24: 23.40 },
  CN5: { thpt25: 22.25, thpt24: 23.91, hsa24: 17.00, ielts24: 23.00, sat24: 23.40 },
  CN6: { thpt25: 26.73, thpt24: 26.27, hsa24: 20.00, ielts24: 24.00, sat24: 23.40 },
  CN7: { thpt25: 23.96, thpt24: 24.61, hsa24: 17.00, ielts24: 23.00, sat24: 23.40 },
  CN8: { thpt25: 27.86, thpt24: 27.58, hsa24: 22.00, ielts24: 27.00, sat24: 27.15 },
  CN9: { thpt25: 26.63, thpt24: 26.30, hsa24: 20.00, ielts24: 25.00, sat24: 24.00 },
  CN10: { thpt25: 22.00, thpt24: 22.50, hsa24: 17.00, ielts24: 23.00, sat24: 23.40 },
  CN11: { thpt25: 27.90, thpt24: 27.05, hsa24: 22.00, ielts24: 26.50, sat24: 27.00 },
  CN12: { thpt25: 27.75, thpt24: 27.12, hsa24: 22.00, ielts24: 27.00, sat24: 27.75 },
  CN13: { thpt25: 24.87, thpt24: 24.59, hsa24: 17.00, ielts24: 23.00, sat24: 23.40 },
  CN14: { thpt25: 26.38, thpt24: 26.87, hsa24: 20.00, ielts24: 25.00, sat24: 24.00 },
  CN15: { thpt25: 26.73, thpt24: 26.92, hsa24: 20.00, ielts24: 25.00, sat24: 24.00 },
  CN17: { thpt25: 26.00, thpt24: 25.99, hsa24: 19.00, ielts24: 24.00, sat24: 23.40 },
  CN18: { thpt25: 24.20, thpt24: 24.64, hsa24: 18.00, ielts24: 24.00, sat24: 23.40 },
  CN19: { thpt25: 25.60, thpt24: null, hsa24: null, ielts24: null, sat24: null },
  CN20: { thpt25: 27.38, thpt24: null, hsa24: null, ielts24: null, sat24: null },
  CN21: { thpt25: 22.13, thpt24: null, hsa24: null, ielts24: null, sat24: null },
};

function getUetProgramsForYear(year: number): AdmissionProgram[] {
  return UET_BASE_PROGRAMS.map((p) => ({
    id: `uet-program-${p.code}-${year}`,
    school_code: "UET",
    program_code: p.code,
    program_name: p.name,
    major_code: p.majorCode,
    major_name: p.name,
    year,
    quota: p.quota2026, // Fallback / default quota
    degree_level: "Đại học",
    training_type: "Chính quy",
    note: p.note,
    source_url: "https://tuyensinh.uet.vnu.edu.vn",
    created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
  }));
}

export function loadUetStaticData(
  programYear: number,
  benchmarkYear: number,
  tuitionYear: number
) {
  const programs = getUetProgramsForYear(programYear);
  const benchmarkPrograms = getUetProgramsForYear(benchmarkYear);
  const tuitionPrograms = getUetProgramsForYear(tuitionYear);
  const calculatorPrograms = getUetProgramsForYear(2025);

  // Methods
  const methodSpecs = [
    { code: "THPT", name: "Xét tuyển theo kết quả thi tốt nghiệp THPT" },
    { code: "ĐGNL", name: "Xét tuyển theo kết quả thi Đánh giá năng lực do ĐHQGHN tổ chức (HSA)" },
    { code: "CCQT", name: "Xét tuyển kết hợp chứng chỉ ngoại ngữ quốc tế (IELTS...) hoặc CCQT (SAT...)" },
    { code: "XTTN", name: "Xét tuyển thẳng, ưu tiên xét tuyển theo quy chế Bộ GD&ĐT" },
  ];

  const getMethodsForYear = (year: number): AdmissionMethodRecord[] =>
    methodSpecs.map((m) => ({
      id: `uet-method-${m.code}-${year}`,
      school_code: "UET",
      method_code: m.code,
      method_name: m.name,
      year,
      description: `Phương thức xét tuyển mã ${m.code} áp dụng cho năm tuyển sinh ${year} tại UET.`,
      is_active: true,
      source_url: "https://tuyensinh.uet.vnu.edu.vn",
      created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
    }));

  const methods = getMethodsForYear(programYear);
  const calculatorMethods = getMethodsForYear(2025);

  // Benchmarks
  const getBenchmarksForYear = (year: number): Benchmark[] => {
    const benchmarksList: Benchmark[] = [];
    
    // We only output benchmarks for 2025 or 2024
    if (year === 2025) {
      // 2025 has THPT scores in infor.md
      UET_BASE_PROGRAMS.forEach((p) => {
        const scores = UET_BENCHMARK_SCORES[p.code];
        if (scores && scores.thpt25 !== null) {
          benchmarksList.push({
            id: `uet-benchmark-${p.code}-thpt-2025`,
            school_code: "UET",
            program_id: `uet-program-${p.code}-2025`,
            year: 2025,
            method_code: "THPT",
            combination_code: p.code === "CN10" || p.code === "CN21" ? "A00, A01, A02, X06" : "A00, A01, X06",
            score: scores.thpt25,
            scale: 30,
            note: "Điểm trúng tuyển chính thức năm 2025.",
            source_url: "https://tuyensinh.uet.vnu.edu.vn",
            created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
          });
        }
      });
    } else if (year === 2024) {
      // 2024 has THPT, HSA, IELTS, SAT in infor.md
      UET_BASE_PROGRAMS.forEach((p) => {
        const scores = UET_BENCHMARK_SCORES[p.code];
        if (!scores) return;

        // THPT 2024
        if (scores.thpt24 !== null) {
          benchmarksList.push({
            id: `uet-benchmark-${p.code}-thpt-2024`,
            school_code: "UET",
            program_id: `uet-program-${p.code}-2024`,
            year: 2024,
            method_code: "THPT",
            combination_code: p.code === "CN10" || p.code === "CN21" ? "A00, A01, A02, X06" : "A00, A01, X06",
            score: scores.thpt24,
            scale: 30,
            note: "Điểm trúng tuyển chính thức năm 2024.",
            source_url: "https://tuyensinh.uet.vnu.edu.vn",
            created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
          });
        }

        // HSA 2024
        if (scores.hsa24 !== null) {
          benchmarksList.push({
            id: `uet-benchmark-${p.code}-hsa-2024`,
            school_code: "UET",
            program_id: `uet-program-${p.code}-2024`,
            year: 2024,
            method_code: "ĐGNL",
            combination_code: "HSA",
            score: scores.hsa24,
            scale: 30,
            note: "Ngưỡng điểm xét tuyển HSA ĐHQGHN quy đổi năm 2024.",
            source_url: "https://tuyensinh.uet.vnu.edu.vn",
            created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
          });
        }

        // IELTS 2024
        if (scores.ielts24 !== null) {
          benchmarksList.push({
            id: `uet-benchmark-${p.code}-ielts-2024`,
            school_code: "UET",
            program_id: `uet-program-${p.code}-2024`,
            year: 2024,
            method_code: "CCQT",
            combination_code: "IELTS",
            score: scores.ielts24,
            scale: 30,
            note: "Ngưỡng điểm xét tuyển chứng chỉ IELTS quy đổi năm 2024.",
            source_url: "https://tuyensinh.uet.vnu.edu.vn",
            created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
          });
        }

        // SAT 2024
        if (scores.sat24 !== null) {
          benchmarksList.push({
            id: `uet-benchmark-${p.code}-sat-2024`,
            school_code: "UET",
            program_id: `uet-program-${p.code}-2024`,
            year: 2024,
            method_code: "CCQT",
            combination_code: "SAT",
            score: scores.sat24,
            scale: 30,
            note: "Ngưỡng điểm xét tuyển chứng chỉ SAT quy đổi năm 2024.",
            source_url: "https://tuyensinh.uet.vnu.edu.vn",
            created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
          });
        }
      });
    }

    return benchmarksList;
  };

  const benchmarks = getBenchmarksForYear(benchmarkYear);
  const calculatorBenchmarks = getBenchmarksForYear(2025);

  // Tuition Fees
  const tuitionFees: TuitionFee[] = getUetProgramsForYear(tuitionYear).map((p) => ({
    id: `uet-tuition-${p.program_code}-${tuitionYear}`,
    school_code: "UET",
    program_id: p.id,
    year: tuitionYear,
    min_fee: 15000000,
    max_fee: 17500000,
    currency: "VND",
    unit: "học kỳ",
    description: "Học phí tạm tính theo quy định cơ chế tự chủ và định mức học phí của ĐHQGHN năm học 2025-2026.",
    note: p.program_code === "CN21" ? "Học phí tham khảo cho khối sinh học công nghệ." : "Cần đối chiếu biểu phí chính thức của trường.",
    source_url: "https://tuyensinh.uet.vnu.edu.vn",
    created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
  }));

  // Admission Info
  const admissionInfo: AdmissionInfo = {
    id: `uet-admission-info-${programYear}`,
    school_code: "UET",
    year: programYear,
    total_quota: 4080,
    admission_scope: "Toàn quốc",
    application_timeline: "Theo kế hoạch tuyển sinh chung của Bộ GD&ĐT và ĐHQGHN.",
    eligibility: "Theo quy chế tuyển sinh đại học hiện hành.",
    notes: "Giải Nhất, Nhì, Ba HSG Quốc gia môn Toán, Tin học, Vật lý, Hóa học được tuyển thẳng vào tất cả các ngành. Môn Sinh học tuyển thẳng vào Công nghệ nông nghiệp và Công nghệ sinh học. Trần điểm cộng ưu tiên không quá 3.0 điểm.",
    source_url: "https://tuyensinh.uet.vnu.edu.vn",
    created_at: new Date("2026-05-28T15:00:00.000Z").toISOString(),
  };

  return {
    programs,
    methods,
    benchmarks,
    tuitionFees,
    admissionInfo,
    benchmarkPrograms,
    tuitionPrograms,
    calculatorPrograms,
    calculatorMethods,
    calculatorBenchmarks,
  };
}

export function getUetStaticProgramCombinations(
  programIds: string[],
  year: number
): ProgramCombination[] {
  return programIds.flatMap((programId) => {
    // Extract program code from programId: e.g. "uet-program-CN10-2026" -> "CN10"
    const match = programId.match(/uet-program-([^-]+)-/);
    const code = match ? match[1] : "";

    const combinationCodes =
      code === "CN10" || code === "CN21" ? ["A00", "A01", "A02", "X06"] : ["A00", "A01", "X06"];

    return combinationCodes.map((combinationCode) => ({
      id: `uet-combination-${programId}-${combinationCode}`,
      program_id: programId,
      combination_code: combinationCode,
      year,
      method_code: "THPT",
      source_url: "https://tuyensinh.uet.vnu.edu.vn",
    }));
  });
}
