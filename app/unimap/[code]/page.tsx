import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import hustProMaxData from "@/data/hust-pro-max.json";
import type { University } from "@/data/universities";
import { createSchoolSlug } from "@/lib/school-slug";
import {
  findVisibleUnimapUniversityByRouteParam,
  getVisibleUnimapUniversities,
  isVisibleUnimapCode,
  UNIMAP_VISIBLE_CODES,
} from "@/lib/unimap-visible-schools";
import {
  getProgramCombinations,
  getSchoolAdmissionInfo,
  getSchoolAdmissionMethods,
  getSchoolBenchmarks,
  getSchoolBySlugOrCode,
  getSchoolPrograms,
  getSchoolSlugs,
  getSchoolTuitionFees,
  getSubjectCombinations,
} from "@/src/lib/admission-data";
import type {
  AdmissionInfo,
  AdmissionMethodRecord,
  AdmissionProgram,
  Benchmark,
  ProgramCombination,
  School,
  SubjectCombination,
  TuitionFee,
} from "@/src/types/admission-data";
import { AdmissionCalculatorSection } from "@/src/components/admission/AdmissionCalculatorSection";
import { CollapsibleAdmissionSection } from "@/src/components/admission/CollapsibleAdmissionSection";
import { AdmissionInfoSection } from "@/src/components/admission/AdmissionInfoSection";
import { AdmissionProgramsSection } from "@/src/components/admission/AdmissionProgramsSection";
import {
  AdmissionSectionNavigator,
  PRO_MAX_NAV_ITEMS,
} from "@/src/components/admission/AdmissionSectionNavigator";
import { BenchmarksSection } from "@/src/components/admission/BenchmarksSection";
import {
  BRANDED_UNIMAP_THEMES,
  FtuUnimapPage,
} from "@/src/components/admission/FtuUnimapPage";
import {
  ProMaxCalculatorLinkSection,
  ProMaxContentSection,
  ProMaxMediaGrid,
  ProMaxPlaceholderSection,
  type ProMaxContentBlock,
} from "@/src/components/admission/ProMaxSections";
import { SchoolHeader } from "@/src/components/admission/SchoolHeader";
import { SchoolOverviewSection } from "@/src/components/admission/SchoolOverviewSection";
import { SubjectCombinationsSection } from "@/src/components/admission/SubjectCombinationsSection";
import { TuitionSection } from "@/src/components/admission/TuitionSection";

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
const BENCHMARK_REFERENCE_YEAR = 2025;
const BENCHMARKS_DEFAULT_YEAR = 2025;
const TUITION_DEFAULT_YEAR = 2025;
const ADMISSION_YEAR_OPTIONS = [2026, 2025, 2024, 2023] as const;
const PRO_MAX_VARIANT = "pro-max";
const PRO_MAX_PLACEHOLDER_MESSAGE =
  "Bạn vui lòng qua page Mặc định nhé, Dev ở đây đình công rồi :D";

type AdmissionPageVariant = "default" | typeof PRO_MAX_VARIANT;

type ProMaxSchoolContent = {
  overview: ProMaxContentBlock[];
  admissionInfo: ProMaxContentBlock[];
  combinations: ProMaxContentBlock[];
  placeholders: {
    programs?: string;
    benchmarks?: string;
    tuition?: string;
  };
};

const PRO_MAX_CONTENT_BY_CODE = hustProMaxData as Record<string, ProMaxSchoolContent>;

const FALLBACK_SUBJECT_COMBINATIONS: SubjectCombination[] = [
  {
    id: "fallback-a00",
    code: "A00",
    subjects: ["Toán", "Vật lý", "Hóa học"],
    description: "Tổ hợp xét tuyển phổ biến cho khối kỹ thuật, kinh tế và công nghệ.",
  },
  {
    id: "fallback-a01",
    code: "A01",
    subjects: ["Toán", "Vật lý", "Tiếng Anh"],
    description: "Tổ hợp phù hợp với các chương trình có yêu cầu ngoại ngữ.",
  },
  {
    id: "fallback-d01",
    code: "D01",
    subjects: ["Toán", "Ngữ văn", "Tiếng Anh"],
    description: "Tổ hợp phổ biến cho nhóm kinh tế, kinh doanh và xã hội.",
  },
];

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
    slug: createSchoolSlug(university.name),
    english_name: null,
    type: university.code === "VINUNI" ? "Tư thục" : "Công lập",
    city: university.city,
    address: null,
    website: university.website ?? null,
    fanpage: null,
    hero_image_url: university.heroImageUrl ?? null,
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

function getSelectedAdmissionVariant(
  variantParam: string | string[] | undefined,
): AdmissionPageVariant {
  const rawVariant = Array.isArray(variantParam) ? variantParam[0] : variantParam;
  return rawVariant === PRO_MAX_VARIANT ? PRO_MAX_VARIANT : "default";
}

function createVariantHref(
  routeParam: string,
  selectedProgramYear: number,
  selectedBenchmarkYear: number,
  selectedTuitionYear: number,
  variant: AdmissionPageVariant,
) {
  const params = new URLSearchParams();
  if (selectedProgramYear !== PROGRAMS_DEFAULT_YEAR) {
    params.set("programYear", String(selectedProgramYear));
  }
  if (selectedBenchmarkYear !== BENCHMARKS_DEFAULT_YEAR) {
    params.set("benchmarkYear", String(selectedBenchmarkYear));
  }
  if (selectedTuitionYear !== TUITION_DEFAULT_YEAR) {
    params.set("tuitionYear", String(selectedTuitionYear));
  }
  if (variant === PRO_MAX_VARIANT) {
    params.set("variant", PRO_MAX_VARIANT);
  }

  const query = params.toString();
  return query ? `/unimap/${routeParam}?${query}` : `/unimap/${routeParam}`;
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

function createFallbackProgramCombinations(
  programs: AdmissionProgram[],
  year: number,
): ProgramCombination[] {
  return programs.flatMap((program) =>
    ["A00", "A01", "D01"].map((combinationCode) => ({
      id: `fallback-combination-${program.id}-${combinationCode.toLowerCase()}`,
      program_id: program.id,
      combination_code: combinationCode,
      year,
      method_code: "THPT",
      source_url: program.source_url,
    })),
  );
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
  selectedVariant: AdmissionPageVariant,
  routeParam: string,
) {
  const proMaxContent = PRO_MAX_CONTENT_BY_CODE[school.code];
  const canUseProMax = false;
  const isProMax = canUseProMax && selectedVariant === PRO_MAX_VARIANT;
  const defaultCalculatorHref = `${createVariantHref(
    routeParam,
    selectedProgramYear,
    selectedBenchmarkYear,
    selectedTuitionYear,
    "default",
  )}#calculator`;
  const variantLinks = canUseProMax
    ? [
        {
          label: "Mặc định",
          href: createVariantHref(
            routeParam,
            selectedProgramYear,
            selectedBenchmarkYear,
            selectedTuitionYear,
            "default",
          ),
          isActive: !isProMax,
        },
        {
          label: "Pro Max :))",
          href: createVariantHref(
            routeParam,
            selectedProgramYear,
            selectedBenchmarkYear,
            selectedTuitionYear,
            PRO_MAX_VARIANT,
          ),
          isActive: isProMax,
        },
      ]
    : [];
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
  const fallbackCalculatorPrograms = canUseStaticFallback
    ? createFallbackPrograms(university, BENCHMARK_REFERENCE_YEAR)
    : [];
  const fallbackCalculatorMethods = canUseStaticFallback
    ? createFallbackMethods(school.code, BENCHMARK_REFERENCE_YEAR)
    : [];
  const fallbackAdmissionInfo = canUseStaticFallback
    ? createFallbackAdmissionInfo(school, selectedProgramYear)
    : null;

  const [
    loadedPrograms,
    loadedMethods,
    loadedBenchmarks,
    loadedTuitionFees,
    loadedAdmissionInfo,
    loadedSubjectCombinations,
    loadedBenchmarkPrograms,
    loadedTuitionPrograms,
    loadedCalculatorPrograms,
    loadedCalculatorMethods,
    loadedCalculatorBenchmarks,
  ] =
    await Promise.all([
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
      loadOrFallback(() => getSubjectCombinations(), [], "subject combinations"),
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
      loadOrFallback(
        () => getSchoolPrograms(school.code, BENCHMARK_REFERENCE_YEAR),
        [],
        "calculator programs",
      ),
      loadOrFallback(
        () => getSchoolAdmissionMethods(school.code, BENCHMARK_REFERENCE_YEAR),
        [],
        "calculator admission methods",
      ),
      loadOrFallback(
        () => getSchoolBenchmarks(school.code, BENCHMARK_REFERENCE_YEAR),
        [],
        "calculator benchmarks",
      ),
    ]);

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
  const calculatorPrograms = loadedCalculatorPrograms.length
    ? loadedCalculatorPrograms
    : fallbackCalculatorPrograms;
  const calculatorMethods = loadedCalculatorMethods.length
    ? loadedCalculatorMethods
    : fallbackCalculatorMethods;
  const calculatorBenchmarks = loadedCalculatorBenchmarks.length
    ? loadedCalculatorBenchmarks
    : canUseStaticFallback
      ? createFallbackBenchmarks(university, calculatorPrograms, BENCHMARK_REFERENCE_YEAR)
      : [];
  const subjectCombinations = loadedSubjectCombinations.length
    ? loadedSubjectCombinations
    : FALLBACK_SUBJECT_COMBINATIONS;
  const programCombinations = loadedPrograms.length
    ? await loadOrFallback(
        () => getProgramCombinations(programs.map((program) => program.id), selectedProgramYear),
        [],
        "program combinations",
      )
    : canUseStaticFallback
      ? createFallbackProgramCombinations(programs, selectedProgramYear)
      : [];

  const brandedTheme =
    school.code === "FTU" || school.code === "HUST" || school.code === "NEU"
      ? BRANDED_UNIMAP_THEMES[school.code]
      : null;

  if (brandedTheme && !isProMax) {
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
        brand={brandedTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SchoolHeader school={school} variantLinks={variantLinks} />

      <div className="container-page py-10 lg:pl-16">
        <AdmissionSectionNavigator items={isProMax ? PRO_MAX_NAV_ITEMS : undefined} />

        <div className="mt-6 space-y-8 lg:mt-0">
          {isProMax && proMaxContent ? (
            <>
              <CollapsibleAdmissionSection id="calculator" title="Công cụ tính điểm">
                <ProMaxCalculatorLinkSection href={defaultCalculatorHref} />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="overview" title="Tổng quan">
                <ProMaxContentSection title="Tổng quan" blocks={proMaxContent.overview} />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="admission-info" title="Thông tin tuyển sinh">
                <ProMaxContentSection
                  title="Thông tin tuyển sinh"
                  blocks={proMaxContent.admissionInfo}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="programs" title="Chương trình tuyển sinh">
                <ProMaxPlaceholderSection
                  title="Chương trình tuyển sinh"
                  message={proMaxContent.placeholders.programs ?? PRO_MAX_PLACEHOLDER_MESSAGE}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="combinations" title="Tổ hợp xét tuyển">
                <ProMaxMediaGrid
                  title="Tổ hợp xét tuyển"
                  blocks={proMaxContent.combinations}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="benchmarks" title="Điểm chuẩn tham khảo">
                <ProMaxPlaceholderSection
                  title="Điểm chuẩn tham khảo"
                  message={proMaxContent.placeholders.benchmarks ?? PRO_MAX_PLACEHOLDER_MESSAGE}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="tuition" title="Học phí">
                <ProMaxPlaceholderSection
                  title="Học phí"
                  message={proMaxContent.placeholders.tuition ?? PRO_MAX_PLACEHOLDER_MESSAGE}
                />
              </CollapsibleAdmissionSection>
            </>
          ) : (
            <>
              <CollapsibleAdmissionSection id="calculator" title="Công cụ tính điểm">
                <AdmissionCalculatorSection
                  schoolCode={school.code}
                  programs={calculatorPrograms}
                  benchmarks={calculatorBenchmarks}
                  methods={calculatorMethods}
                  benchmarkYear={BENCHMARK_REFERENCE_YEAR}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="overview" title="Tổng quan">
                <SchoolOverviewSection school={school} />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="admission-info" title="Thông tin tuyển sinh">
                <AdmissionInfoSection
                  admissionInfo={admissionInfo}
                  methods={methods}
                  selectedYear={selectedProgramYear}
                  availableYears={ADMISSION_YEAR_OPTIONS}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="programs" title="Chương trình tuyển sinh">
                <AdmissionProgramsSection
                  schoolCode={school.code}
                  programs={programs}
                  selectedYear={selectedProgramYear}
                  availableYears={ADMISSION_YEAR_OPTIONS}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="combinations" title="Tổ hợp xét tuyển">
                <SubjectCombinationsSection
                  subjectCombinations={subjectCombinations}
                  programCombinations={programCombinations}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="benchmarks" title="Điểm chuẩn tham khảo">
                <BenchmarksSection
                  benchmarks={benchmarks}
                  programs={benchmarkPrograms}
                  selectedYear={selectedBenchmarkYear}
                  availableYears={ADMISSION_YEAR_OPTIONS}
                />
              </CollapsibleAdmissionSection>

              <CollapsibleAdmissionSection id="tuition" title="Học phí">
                <TuitionSection
                  tuitionFees={tuitionFees}
                  programs={tuitionPrograms}
                  selectedYear={selectedTuitionYear}
                  availableYears={ADMISSION_YEAR_OPTIONS}
                />
              </CollapsibleAdmissionSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const params = new Set<string>();

  try {
    const slugs = await getSchoolSlugs(UNIMAP_VISIBLE_CODES);
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

export async function generateMetadata({ params }: UniversityDetailPageProps) {
  const { code } = await params;
  const routeParam = code.toLowerCase();
  const school = await getAdmissionSchoolBySlug(routeParam);
  const university = findVisibleUniversityForRoute(routeParam, school);

  if (!university) {
    return {
      title: "Không tìm thấy trường",
    };
  }

  if (school) {
    return {
      title: `${school.name} - Tuyển sinh ZPATH`,
      description: school.description ?? `Thông tin tuyển sinh ${school.name}`,
    };
  }

  return {
    title: `${university.name} - Tuyển sinh ZPATH`,
    description: university.about,
  };
}

export default async function UniversityDetailPage({
  params,
  searchParams,
}: UniversityDetailPageProps) {
  const { code } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedProgramYear = getSelectedAdmissionYear(
    resolvedSearchParams?.programYear ?? resolvedSearchParams?.year,
    PROGRAMS_DEFAULT_YEAR,
  );
  const selectedBenchmarkYear = getSelectedAdmissionYear(
    resolvedSearchParams?.benchmarkYear,
    BENCHMARKS_DEFAULT_YEAR,
  );
  const selectedTuitionYear = getSelectedAdmissionYear(
    resolvedSearchParams?.tuitionYear,
    TUITION_DEFAULT_YEAR,
  );
  const selectedVariant = getSelectedAdmissionVariant(resolvedSearchParams?.variant);
  const routeParam = code.toLowerCase();
  const school = await getAdmissionSchoolBySlug(routeParam);
  const university = findVisibleUniversityForRoute(routeParam, school);

  if (!university) {
    return <UniversityNotFound code={code} />;
  }

  const visibleSchool =
    school && isVisibleUnimapCode(school.code)
      ? applyUniversityMediaToSchool(school, university)
      : createFallbackSchool(university);

  return renderAdmissionSchoolDetail(
    visibleSchool,
    university,
    selectedProgramYear,
    selectedBenchmarkYear,
    selectedTuitionYear,
    selectedVariant,
    routeParam,
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
