import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { University } from "@/data/universities";
import { createSchoolSlug } from "@/lib/school-slug";
import { getAbsoluteUrl, SITE_NAME } from "@/lib/seo";
import {
  findVisibleUnimapUniversityByRouteParam,
  getVisibleUnimapUniversities,
  isVisibleUnimapCode,
  mapRecordToUniversity,
} from "@/lib/unimap-visible-schools";
import {
  getSchoolAdmissionInfo,
  getSchoolAdmissionMethods,
  getSchoolBenchmarks,
  getSchoolBySlugOrCode,
  getSchoolDataYears,
  type SchoolDataYears,
  getSchoolPrograms,
  getSchoolSlugs,
  getSchoolTuitionFees,
} from "@/src/lib/admission-data";
import type {
  AdmissionInfo,
  AdmissionMethodRecord,
  AdmissionProgram,
  Benchmark,
  School,
  TuitionFee,
} from "@/src/types/admission-data";
import { FtuUnimapPage, getUnimapTheme } from "@/src/components/admission/FtuUnimapPage";
import { loadUetStaticData } from "@/src/lib/admission-data/uet-static-data";

interface UniversityDetailPageProps {
  params: Promise<{
    code: string;
  }>;
  searchParams?: Promise<{
    year?: string | string[];
    programYear?: string | string[];
    benchmarkYear?: string | string[];
    tuitionYear?: string | string[];
    variant?: string | string[];
  }>;
}

const FALLBACK_YEAR = 2025;
const PROGRAMS_DEFAULT_YEAR = 2026;
const BENCHMARKS_DEFAULT_YEAR = 2025;
const TUITION_DEFAULT_YEAR = 2025;
const ADMISSION_YEAR_OPTIONS = [2026, 2025, 2024, 2023] as const;

async function getAdmissionSchoolBySlug(slug: string) {
  try {
    return await getSchoolBySlugOrCode(slug);
  } catch (error) {
    console.error("Cannot load admission school detail:", error);
    return null;
  }
}

function findVisibleUniversityForRoute(routeParam: string, school?: School | null) {
  const university = findVisibleUnimapUniversityByRouteParam(routeParam);
  if (university) return university;

  return school?.code && isVisibleUnimapCode(school.code)
    ? findVisibleUnimapUniversityByRouteParam(school.code.toLowerCase())
    : null;
}

function createFallbackSchool(university: University): School {
  return {
    id: `fallback-school-${university.code.toLowerCase()}`,
    code: university.code,
    name: university.name,
    short_name: university.code,
    aliases: [],
    slug: createSchoolSlug(university.name),
    english_name: null,
    type: university.code === "VINUNI" ? "Tư thục" : "Công lập",
    city: university.city,
    address: null,
    website: university.website ?? null,
    fanpage: null,
    hero_image_url: university.heroImageUrl ?? null,
    logo_url: university.unimapImageUrl ?? null,
    description: university.about,
    source_url: university.website ?? null,
    last_checked_at: null,
    created_at: null,
    updated_at: null,
  };
}

function applyUniversityMediaToSchool(school: School, university: University): School {
  return {
    ...school,
    hero_image_url: university.heroImageUrl ?? school.hero_image_url ?? null,
    logo_url: university.unimapImageUrl ?? school.logo_url ?? null,
  };
}

function getSelectedAdmissionYear(
  yearParam: string | string[] | undefined,
  defaultYear = FALLBACK_YEAR,
) {
  const rawYear = Array.isArray(yearParam) ? yearParam[0] : yearParam;
  const parsedYear = rawYear ? Number.parseInt(rawYear, 10) : defaultYear;

  return ADMISSION_YEAR_OPTIONS.includes(parsedYear as (typeof ADMISSION_YEAR_OPTIONS)[number])
    ? parsedYear
    : defaultYear;
}

function createFallbackPrograms(university: University, year: number): AdmissionProgram[] {
  return (university.programs ?? []).map((program, index) => ({
    id: `fallback-program-${university.code.toLowerCase()}-${index}`,
    school_code: university.code,
    program_code: program.programCode,
    program_name: program.name,
    major_code: program.majorCode ?? null,
    major_name: program.majorCode ?? null,
    year,
    quota: null,
    degree_level: "Đại học",
    training_type: "Chính quy",
    note: "Dữ liệu demo UniMap, cần đối chiếu đề án tuyển sinh chính thức.",
    source_url: university.website ?? null,
    created_at: null,
  }));
}

function createFallbackMethods(schoolCode: string, year: number): AdmissionMethodRecord[] {
  return [
    ["THPT", "Xét tuyển theo điểm thi tốt nghiệp THPT"],
    ["TSA", "Xét tuyển theo điểm đánh giá tư duy/năng lực"],
    ["XTTN", "Xét tuyển tài năng hoặc phương thức riêng"],
  ].map(([methodCode, methodName]) => ({
    id: `fallback-method-${schoolCode.toLowerCase()}-${methodCode.toLowerCase()}`,
    school_code: schoolCode,
    method_code: methodCode,
    method_name: methodName,
    year,
    description: "Phương thức demo để giữ cấu trúc trang giống HUST trong MVP.",
    is_active: true,
    source_url: null,
    created_at: null,
  }));
}

function createFallbackAdmissionInfo(school: School, year: number): AdmissionInfo {
  return {
    id: `fallback-admission-info-${school.code.toLowerCase()}`,
    school_code: school.code,
    year,
    total_quota: null,
    admission_scope: "Toàn quốc",
    application_timeline: "Cập nhật theo đề án tuyển sinh từng năm.",
    eligibility: "Theo quy chế tuyển sinh đại học hiện hành.",
    notes: "Dữ liệu demo UniMap, cần đối chiếu thông báo chính thức của trường.",
    source_url: school.website,
    created_at: null,
  };
}

function createFallbackBenchmarks(
  university: University,
  programs: AdmissionProgram[],
  year: number,
): Benchmark[] {
  const scoreByProgramCode = new Map(
    (university.programs ?? []).map((program) => [
      program.programCode,
      program.admissionScore2025,
    ]),
  );

  return programs.flatMap((program) => {
    const score = program.program_code
      ? scoreByProgramCode.get(program.program_code)
      : undefined;
    if (score === undefined) return [];

    return {
      id: `fallback-benchmark-${program.id}`,
      school_code: university.code,
      program_id: program.id,
      year,
      method_code: "THPT",
      combination_code: null,
      score,
      scale: 30,
      note: "Mốc demo UniMap, chưa phải dữ liệu tuyển sinh chính thức.",
      source_url: university.website ?? null,
      created_at: null,
    } satisfies Benchmark;
  });
}

function createFallbackTuitionFees(
  university: University,
  programs: AdmissionProgram[],
  year: number,
): TuitionFee[] {
  const tuitionByProgramCode = new Map(
    (university.programs ?? []).map((program) => [
      program.programCode,
      program.tuitionPerSemester * 1_000_000,
    ]),
  );

  return programs.flatMap((program) => {
    const tuition = program.program_code
      ? tuitionByProgramCode.get(program.program_code)
      : undefined;
    if (tuition === undefined) return [];

    return {
      id: `fallback-tuition-${program.id}`,
      school_code: university.code,
      program_id: program.id,
      year,
      min_fee: tuition,
      max_fee: tuition,
      currency: "VND",
      unit: "học kỳ",
      description: "Học phí demo theo dữ liệu UniMap.",
      note: "Cần đối chiếu biểu phí chính thức của trường.",
      source_url: university.website ?? null,
      created_at: null,
    } satisfies TuitionFee;
  });
}

async function loadOrFallback<T>(
  load: () => Promise<T>,
  fallback: T,
  label: string,
) {
  try {
    return await load();
  } catch (error) {
    console.error(`Cannot load ${label}:`, error);
    return fallback;
  }
}

async function renderAdmissionSchoolDetail(
  school: School,
  university: University,
  selectedProgramYear: number,
  selectedBenchmarkYear: number,
  selectedTuitionYear: number,
) {
  // Static fallback (used only when a curated school has local data but the DB
  // returns nothing for the selected year).
  const canUseStaticFallback = Boolean(university.programs?.length);
  const fallbackPrograms = canUseStaticFallback
    ? createFallbackPrograms(university, selectedProgramYear)
    : [];
  const fallbackBenchmarkPrograms = canUseStaticFallback
    ? createFallbackPrograms(university, selectedBenchmarkYear)
    : [];
  const fallbackTuitionPrograms = canUseStaticFallback
    ? createFallbackPrograms(university, selectedTuitionYear)
    : [];
  const fallbackMethods = canUseStaticFallback
    ? createFallbackMethods(school.code, selectedProgramYear)
    : [];
  const fallbackAdmissionInfo = canUseStaticFallback
    ? createFallbackAdmissionInfo(school, selectedProgramYear)
    : null;

  let loadedPrograms: AdmissionProgram[];
  let loadedMethods: AdmissionMethodRecord[];
  let loadedBenchmarks: Benchmark[];
  let loadedTuitionFees: TuitionFee[];
  let loadedAdmissionInfo: AdmissionInfo | null;
  let loadedBenchmarkPrograms: AdmissionProgram[];
  let loadedTuitionPrograms: AdmissionProgram[];

  if (school.code === "UET") {
    const localData = loadUetStaticData(selectedProgramYear, selectedBenchmarkYear, selectedTuitionYear);
    loadedPrograms = localData.programs;
    loadedMethods = localData.methods;
    loadedBenchmarks = localData.benchmarks;
    loadedTuitionFees = localData.tuitionFees;
    loadedAdmissionInfo = localData.admissionInfo;
    loadedBenchmarkPrograms = localData.benchmarkPrograms;
    loadedTuitionPrograms = localData.tuitionPrograms;
  } else {
    [
      loadedPrograms,
      loadedMethods,
      loadedBenchmarks,
      loadedTuitionFees,
      loadedAdmissionInfo,
      loadedBenchmarkPrograms,
      loadedTuitionPrograms,
    ] = await Promise.all([
      loadOrFallback(() => getSchoolPrograms(school.code, selectedProgramYear), [], "school programs"),
      loadOrFallback(
        () => getSchoolAdmissionMethods(school.code, selectedProgramYear),
        [],
        "admission methods",
      ),
      loadOrFallback(
        () => getSchoolBenchmarks(school.code, selectedBenchmarkYear),
        [],
        "benchmarks",
      ),
      loadOrFallback(
        () => getSchoolTuitionFees(school.code, selectedTuitionYear),
        [],
        "tuition fees",
      ),
      loadOrFallback(
        () => getSchoolAdmissionInfo(school.code, selectedProgramYear),
        null,
        "admission info",
      ),
      loadOrFallback(
        () => getSchoolPrograms(school.code, selectedBenchmarkYear),
        [],
        "benchmark programs",
      ),
      loadOrFallback(
        () => getSchoolPrograms(school.code, selectedTuitionYear),
        [],
        "tuition programs",
      ),
    ]);
  }

  const programs = loadedPrograms.length ? loadedPrograms : fallbackPrograms;
  const methods = loadedMethods.length ? loadedMethods : fallbackMethods;
  const benchmarkPrograms = loadedBenchmarkPrograms.length
    ? loadedBenchmarkPrograms
    : fallbackBenchmarkPrograms;
  const tuitionPrograms = loadedTuitionPrograms.length
    ? loadedTuitionPrograms
    : fallbackTuitionPrograms;
  const benchmarks = loadedBenchmarks.length
    ? loadedBenchmarks
    : canUseStaticFallback
      ? createFallbackBenchmarks(university, benchmarkPrograms, selectedBenchmarkYear)
      : [];
  const tuitionFees = loadedTuitionFees.length
    ? loadedTuitionFees
    : canUseStaticFallback
      ? createFallbackTuitionFees(university, tuitionPrograms, selectedTuitionYear)
      : [];
  const admissionInfo = loadedAdmissionInfo ?? fallbackAdmissionInfo;

  return (
    <FtuUnimapPage
      school={school}
      programs={programs}
      methods={methods}
      benchmarks={benchmarks}
      benchmarkPrograms={benchmarkPrograms}
      tuitionFees={tuitionFees}
      tuitionPrograms={tuitionPrograms}
      admissionInfo={admissionInfo}
      selectedProgramYear={selectedProgramYear}
      selectedBenchmarkYear={selectedBenchmarkYear}
      selectedTuitionYear={selectedTuitionYear}
      availableYears={ADMISSION_YEAR_OPTIONS}
      brand={getUnimapTheme(school.code)}
    />
  );
}

export async function generateStaticParams() {
  const params = new Set<string>();

  try {
    const slugs = await getSchoolSlugs();
    slugs.forEach((slug) => params.add(slug));
  } catch (error) {
    console.error("Cannot generate school static params:", error);
  }

  getVisibleUnimapUniversities().forEach((university) => {
    params.add(university.code.toLowerCase());
    params.add(createSchoolSlug(university.name));
  });

  return Array.from(params).map((code) => ({ code }));
}

export async function generateMetadata({ params }: UniversityDetailPageProps): Promise<Metadata> {
  const { code } = await params;
  const routeParam = code.toLowerCase();
  const school = await getAdmissionSchoolBySlug(routeParam);
  const university =
    findVisibleUniversityForRoute(routeParam, school) ??
    (school ? mapRecordToUniversity(school) : null);

  if (!university) {
    return {
      title: "Không tìm thấy trường",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const schoolName = school?.name ?? university.name;
  const canonicalPath = `/unimap/${school?.slug ?? university.code.toLowerCase()}`;
  const title = `Điểm chuẩn ${schoolName} 2026`;
  const description =
    `Tra cứu điểm chuẩn ${schoolName} 2026, ngành tuyển sinh, tổ hợp xét tuyển, học phí và công cụ tính điểm phù hợp trên ZPATH.`;
  const imageUrl =
    school?.hero_image_url ??
    university.heroImageUrl ??
    university.unimapImageUrl ??
    undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      type: "website",
      images: imageUrl ? [{ url: getAbsoluteUrl(imageUrl) }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: imageUrl ? [getAbsoluteUrl(imageUrl)] : undefined,
    },
  };
}

export default async function UniversityDetailPage({
  params,
  searchParams,
}: UniversityDetailPageProps) {
  const { code } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const routeParam = code.toLowerCase();
  const school = await getAdmissionSchoolBySlug(routeParam);

  // Default each section to the newest year that actually has data for this
  // school (programs -> 2026, benchmarks -> 2025 reference, tuition -> 2026 for
  // imported schools), so sections don't look empty from a year mismatch.
  // UET serves static data, so keep its constant-based defaults.
  const dataYears =
    school && school.code !== "UET"
      ? await loadOrFallback<SchoolDataYears | null>(
          () => getSchoolDataYears(school.code),
          null,
          "school data years",
        )
      : null;
  const latestYear = (years: number[] | undefined, fallback: number) =>
    years && years.length ? years[0] : fallback;

  const selectedProgramYear = getSelectedAdmissionYear(
    resolvedSearchParams?.programYear ?? resolvedSearchParams?.year,
    latestYear(dataYears?.programs, PROGRAMS_DEFAULT_YEAR),
  );
  const selectedBenchmarkYear = getSelectedAdmissionYear(
    resolvedSearchParams?.benchmarkYear,
    latestYear(dataYears?.benchmarks, BENCHMARKS_DEFAULT_YEAR),
  );
  const selectedTuitionYear = getSelectedAdmissionYear(
    resolvedSearchParams?.tuitionYear,
    // Prefer 2025 when the school has it (HUST has 65 rows in 2025 vs 1 stray in
    // 2026); otherwise fall back to the newest year that has tuition data.
    dataYears?.tuition?.includes(2025)
      ? 2025
      : latestYear(dataYears?.tuition, TUITION_DEFAULT_YEAR),
  );
  const university =
    findVisibleUniversityForRoute(routeParam, school) ??
    (school ? mapRecordToUniversity(school) : null);

  if (!university) {
    return <UniversityNotFound code={code} />;
  }

  // Prefer the real DB school (curated or imported); only synthesize a school
  // from local University data when the route resolved to a curated entry that
  // has no DB row yet.
  const visibleSchool = school
    ? applyUniversityMediaToSchool(school, university)
    : createFallbackSchool(university);

  return renderAdmissionSchoolDetail(
    visibleSchool,
    university,
    selectedProgramYear,
    selectedBenchmarkYear,
    selectedTuitionYear,
  );
}

function UniversityNotFound({ code }: { code: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container-page flex flex-col items-center justify-center py-24 text-center">
        <GraduationCap className="h-14 w-14 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl font-bold">Không tìm thấy trường</h1>
        <p className="mt-2 text-muted-foreground">Trường &quot;{code}&quot; không có trong UniMap.</p>
        <Button asChild className="mt-6" variant="hero">
          <Link href="/unimap">Quay lại danh sách</Link>
        </Button>
      </div>
    </div>
  );
}
