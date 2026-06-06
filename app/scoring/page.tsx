import type { Metadata } from "next";

import { AdmissionCalculatorSection } from "@/src/components/admission/AdmissionCalculatorSection";
import {
  ScoringSchoolSelector,
  type ScoringSchoolCode,
  type ScoringSchoolOption,
} from "@/src/components/admission/ScoringSchoolSelector";
import {
  getSchoolAdmissionMethods,
  getSchoolBenchmarks,
  getSchoolPrograms,
} from "@/src/lib/admission-data";

export const metadata: Metadata = {
  title: "Tính điểm xét tuyển - ZPATH",
  description:
    "Công cụ tính điểm xét tuyển và so sánh với điểm chuẩn tham chiếu trong ZPATH.",
};

const SCORING_SCHOOL_CODE = "HUST";
const SCORING_ADMISSION_YEAR = 2026;
const SCORING_BENCHMARK_YEAR = 2025;

const SCORING_SCHOOLS: ScoringSchoolOption[] = [
  {
    code: "HUST",
    shortName: "HUST",
    name: "Đại học Bách khoa Hà Nội",
    status: "available",
    avatarColor: "#ef4444",
    accentTextClassName: "text-red-500",
    accentBorderClassName: "border-red-500",
    accentRingClassName: "ring-red-500/25",
    accentSoftClassName: "bg-red-50",
  },
  {
    code: "FTU",
    shortName: "FTU",
    name: "Đại học Ngoại Thương",
    status: "available",
    avatarUrl: "/FTU_logo_2020.png",
    avatarColor: "#b91c1c",
    accentTextClassName: "text-red-700",
    accentBorderClassName: "border-red-700",
    accentRingClassName: "ring-red-700/25",
    accentSoftClassName: "bg-red-700/10",
  },
  {
    code: "NEU",
    shortName: "NEU",
    name: "Đại học Kinh tế Quốc dân",
    status: "coming_soon",
    avatarUrl: "/Logo-NEU.png",
    avatarColor: "#0ea5e9",
    accentTextClassName: "text-sky-500",
    accentBorderClassName: "border-sky-500",
    accentRingClassName: "ring-sky-500/25",
    accentSoftClassName: "bg-sky-500/10",
  },
];

type ScoringPageProps = {
  searchParams?: Promise<{
    school?: string | string[];
  }>;
};

function getSelectedSchoolCode(
  schoolParam: string | string[] | undefined,
): ScoringSchoolCode {
  const rawSchool = Array.isArray(schoolParam) ? schoolParam[0] : schoolParam;
  const normalizedSchool = rawSchool?.toUpperCase();

  return SCORING_SCHOOLS.some((school) => school.code === normalizedSchool)
    ? (normalizedSchool as ScoringSchoolCode)
    : SCORING_SCHOOL_CODE;
}

async function loadOrFallback<T>(
  load: () => Promise<T>,
  fallback: T,
  label: string,
) {
  try {
    return await load();
  } catch (error) {
    console.error(`Cannot load scoring ${label}:`, error);
    return fallback;
  }
}

export default async function ScoringPage({ searchParams }: ScoringPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedSchoolCode = getSelectedSchoolCode(resolvedSearchParams?.school);
  const [programs, methods, benchmarks] = await Promise.all([
    loadOrFallback(
      () => getSchoolPrograms(selectedSchoolCode, SCORING_ADMISSION_YEAR),
      [],
      "programs",
    ),
    loadOrFallback(
      () => getSchoolAdmissionMethods(selectedSchoolCode, SCORING_ADMISSION_YEAR),
      [],
      "admission methods",
    ),
    loadOrFallback(
      () => getSchoolBenchmarks(selectedSchoolCode, SCORING_BENCHMARK_YEAR),
      [],
      "benchmarks",
    ),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="container-page space-y-6 py-6 md:py-8">
        <ScoringSchoolSelector
          options={SCORING_SCHOOLS}
          selectedSchoolCode={selectedSchoolCode}
        />

        <AdmissionCalculatorSection
          schoolCode={selectedSchoolCode}
          programs={programs}
          benchmarks={benchmarks}
          methods={methods}
          benchmarkYear={SCORING_BENCHMARK_YEAR}
        />
      </section>
    </div>
  );
}
