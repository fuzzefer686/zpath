import type { AdmissionMethod } from "@/src/lib/admission-engine";
import type { Benchmark } from "@/src/types/admission-data";

type HustBenchmark2025Seed = {
  programCode: string;
  methodCode: AdmissionMethod;
  combinationCode: string | null;
  score: number;
  scale: number;
  note: string;
  sourceUrl: string;
};

const HUST_BENCHMARK_2025_SEED: HustBenchmark2025Seed[] = [
  {
    programCode: "IT1",
    methodCode: "THPT",
    combinationCode: null,
    score: 29.19,
    scale: 30,
    note: "Partially verified 2025 benchmark; replace with official HUST export/PDF when available.",
    sourceUrl:
      "https://baochinhphu.vn/diem-chuan-cua-dai-hoc-bach-khoa-ha-noi-nganh-khoa-hoc-du-lieu-va-tri-tue-nhan-tao-dan-dau-voi-2939-diem-102250822162052678.htm",
  },
  {
    programCode: "IT2",
    methodCode: "THPT",
    combinationCode: null,
    score: 28.87,
    scale: 30,
    note: "Partially verified 2025 benchmark from admissions aggregators; replace with official HUST export/PDF when available.",
    sourceUrl: "https://trangedu.com/diem-chuan/diem-chuan-dai-hoc-bach-khoa-ha-noi/",
  },
  {
    programCode: "IT-E10",
    methodCode: "THPT",
    combinationCode: null,
    score: 29.39,
    scale: 30,
    note: "Partially verified 2025 benchmark; replace with official HUST export/PDF when available.",
    sourceUrl:
      "https://baochinhphu.vn/diem-chuan-cua-dai-hoc-bach-khoa-ha-noi-nganh-khoa-hoc-du-lieu-va-tri-tue-nhan-tao-dan-dau-voi-2939-diem-102250822162052678.htm",
  },
  {
    programCode: "ET1",
    methodCode: "THPT",
    combinationCode: null,
    score: 28.07,
    scale: 30,
    note: "Partially verified 2025 benchmark; replace with official HUST export/PDF when available.",
    sourceUrl:
      "https://baochinhphu.vn/diem-chuan-cua-dai-hoc-bach-khoa-ha-noi-nganh-khoa-hoc-du-lieu-va-tri-tue-nhan-tao-dan-dau-voi-2939-diem-102250822162052678.htm",
  },
  {
    programCode: "ME1",
    methodCode: "THPT",
    combinationCode: null,
    score: 27.95,
    scale: 30,
    note: "Partially verified 2025 benchmark from admissions aggregators; replace with official HUST export/PDF when available.",
    sourceUrl: "https://truongvietnam.com/hust-diem-chuan-12090.html",
  },
];

export function findHustBenchmark2025({
  programCode,
  method,
  combinationCode,
}: {
  programCode: string;
  method: AdmissionMethod;
  combinationCode?: string;
}): Benchmark | null {
  const candidates = HUST_BENCHMARK_2025_SEED.filter(
    (benchmark) =>
      benchmark.programCode === programCode && benchmark.methodCode === method,
  );
  const benchmark =
    candidates.find((candidate) => candidate.combinationCode === combinationCode) ??
    candidates.find((candidate) => candidate.combinationCode === null) ??
    null;

  if (!benchmark) return null;

  return {
    id: `static-hust-2025-${benchmark.programCode}-${benchmark.methodCode}-${benchmark.combinationCode ?? "all"}`,
    school_code: "HUST",
    program_id: null,
    admission_programs: {
      program_code: benchmark.programCode,
      year: 2025,
    },
    year: 2025,
    method_code: benchmark.methodCode,
    combination_code: benchmark.combinationCode,
    score: benchmark.score,
    scale: benchmark.scale,
    note: benchmark.note,
    source_url: benchmark.sourceUrl,
    created_at: null,
  };
}
