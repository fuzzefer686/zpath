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
import {
  getPublishedAdmissionConfig,
  listPublishedConfigSchools,
} from "@/src/lib/admission-config/store";

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
  {
    code: "UET",
    shortName: "UET",
    name: "Trường Đại học Công nghệ - ĐHQGHN",
    status: "available",
    avatarColor: "#0f766e",
    accentTextClassName: "text-teal-600",
    accentBorderClassName: "border-teal-600",
    accentRingClassName: "ring-teal-600/25",
    accentSoftClassName: "bg-teal-50",
  },
];

const STATIC_DEDICATED_CODES = new Set(["HUST", "FTU", "UET"]);

type ScoringPageProps = {
  searchParams?: Promise<{
    school?: string | string[];
  }>;
};

function buildConfigSchoolOption(
  code: string,
  name: string,
): ScoringSchoolOption {
  return {
    code,
    shortName: code,
    name,
    status: "available",
    avatarColor: "#6366f1",
    accentTextClassName: "text-indigo-500",
    accentBorderClassName: "border-indigo-500",
    accentRingClassName: "ring-indigo-500/25",
    accentSoftClassName: "bg-indigo-50",
  };
}

/**
 * Merges the hardcoded school list with any school that has a published
 * config-driven calculator (added via the admin PDF flow). Static options win
 * on conflict so existing schools keep their branding.
 */
async function buildScoringSchools(): Promise<ScoringSchoolOption[]> {
  const merged = [...SCORING_SCHOOLS];
  const existingCodes = new Set(merged.map((school) => school.code));

  try {
    const publishedSchools = await listPublishedConfigSchools();
    for (const school of publishedSchools) {
      if (existingCodes.has(school.schoolCode)) continue;
      merged.push(buildConfigSchoolOption(school.schoolCode, school.schoolName));
      existingCodes.add(school.schoolCode);
    }
  } catch (error) {
    console.error("Cannot load published config schools:", error);
  }

  return merged;
}

function getSelectedSchoolCode(
  schoolParam: string | string[] | undefined,
  schools: ScoringSchoolOption[],
): ScoringSchoolCode {
  const rawSchool = Array.isArray(schoolParam) ? schoolParam[0] : schoolParam;
  const normalizedSchool = rawSchool?.toUpperCase();

  return schools.some((school) => school.code === normalizedSchool)
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
  const schools = await buildScoringSchools();
  const selectedSchoolCode = getSelectedSchoolCode(
    resolvedSearchParams?.school,
    schools,
  );

  // Schools without a dedicated hardcoded calculator are config-driven: load
  // their published config so the generic calculator can render.
  const genericConfig = STATIC_DEDICATED_CODES.has(selectedSchoolCode)
    ? null
    : await loadOrFallback(
        () => getPublishedAdmissionConfig(selectedSchoolCode),
        null,
        "config",
      );

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
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] text-foreground">
      <section className="container-page space-y-6 py-6 md:py-8">
        <div className="grid gap-5 rounded-2xl border border-foreground/10 bg-card/90 p-5 shadow-sm md:grid-cols-[1fr_auto] md:items-end md:p-6">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              ZPATH Scoring
            </div>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight md:text-4xl">
              Tính điểm xét tuyển đại học
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Chọn trường, nhập điểm theo phương thức xét tuyển và so sánh nhanh với điểm chuẩn tham chiếu.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:w-72">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Năm xét tuyển
              </div>
              <div className="mt-1 text-lg font-black">{SCORING_ADMISSION_YEAR}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                So sánh
              </div>
              <div className="mt-1 text-lg font-black">{SCORING_BENCHMARK_YEAR}</div>
            </div>
          </div>
        </div>

        <ScoringSchoolSelector
          options={schools}
          selectedSchoolCode={selectedSchoolCode}
        />

        <AdmissionCalculatorSection
          schoolCode={selectedSchoolCode}
          programs={programs}
          benchmarks={benchmarks}
          methods={methods}
          benchmarkYear={SCORING_BENCHMARK_YEAR}
          genericConfig={genericConfig}
        />
      </section>
    </div>
  );
}
