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
import { getAofStaticConfig } from "@/src/lib/admission-engine/modules/aof/config";

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
    code: "AOF",
    shortName: "AOF",
    name: "Học viện Tài chính",
    status: "available",
    avatarColor: "#0369a1",
    accentTextClassName: "text-sky-700",
    accentBorderClassName: "border-sky-700",
    accentRingClassName: "ring-sky-700/25",
    accentSoftClassName: "bg-sky-700/10",
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

  // Schools without a dedicated hardcoded calculator are config-driven. AOF
  // uses a static config bundled in code; other schools load from Supabase.
  const genericConfig = STATIC_DEDICATED_CODES.has(selectedSchoolCode)
    ? null
    : selectedSchoolCode === "AOF"
      ? getAofStaticConfig()
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
    <div className="min-h-screen bg-background text-foreground">
      <section className="container-page space-y-6 py-6 md:py-8">
        <ScoringSchoolSelector
          options={schools}
          selectedSchoolCode={selectedSchoolCode}
        />

        <p className="text-center text-sm text-muted-foreground">
          Cần quy đổi chứng chỉ trước khi tính điểm?{" "}
          <a
            href="/certificate-converter"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Mở trang Quy đổi chứng chỉ
          </a>
        </p>

        {genericConfig && !STATIC_DEDICATED_CODES.has(selectedSchoolCode) ? (
          <p className="text-center text-sm text-muted-foreground">
            <a
              href={`/unimap/${selectedSchoolCode.toLowerCase()}#calculator`}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Xem trang UniMap đầy đủ cho {selectedSchoolCode}
            </a>
          </p>
        ) : null}

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
