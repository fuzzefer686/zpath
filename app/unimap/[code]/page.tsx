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
  getSchoolBySlug,
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
import { AdmissionInfoSection } from "@/src/components/admission/AdmissionInfoSection";
import { AdmissionProgramsSection } from "@/src/components/admission/AdmissionProgramsSection";
import {
  AdmissionSectionNavigator,
  PRO_MAX_NAV_ITEMS,
} from "@/src/components/admission/AdmissionSectionNavigator";
import { BenchmarksSection } from "@/src/components/admission/BenchmarksSection";
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
    variant?: string | string[];
  }>;
}

const FALLBACK_YEAR = 2025;
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
    return await getSchoolBySlug(slug);
  } catch (error) {
    console.error("Cannot load admission school detail:", error);
    return null;
  }
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

function getSelectedAdmissionYear(yearParam: string | string[] | undefined) {
  const rawYear = Array.isArray(yearParam) ? yearParam[0] : yearParam;
  const parsedYear = rawYear ? Number.parseInt(rawYear, 10) : FALLBACK_YEAR;

  return ADMISSION_YEAR_OPTIONS.includes(parsedYear as (typeof ADMISSION_YEAR_OPTIONS)[number])
    ? parsedYear
    : FALLBACK_YEAR;
}

function getSelectedAdmissionVariant(
  variantParam: string | string[] | undefined,
): AdmissionPageVariant {
  const rawVariant = Array.isArray(variantParam) ? variantParam[0] : variantParam;
  return rawVariant === PRO_MAX_VARIANT ? PRO_MAX_VARIANT : "default";
}

function createVariantHref(
  routeParam: string,
  selectedYear: number,
  variant: AdmissionPageVariant,
) {
  const params = new URLSearchParams();
  if (selectedYear !== FALLBACK_YEAR) {
    params.set("year", String(selectedYear));
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
  selectedYear: number,
  selectedVariant: AdmissionPageVariant,
  routeParam: string,
) {
  const canUseProMax = school.code === "HUST";
  const isProMax = canUseProMax && selectedVariant === PRO_MAX_VARIANT;
  const proMaxContent = PRO_MAX_CONTENT_BY_CODE[school.code];
  const defaultCalculatorHref = `${createVariantHref(routeParam, selectedYear, "default")}#calculator`;
  const variantLinks = canUseProMax
    ? [
        {
          label: "Mặc định",
          href: createVariantHref(routeParam, selectedYear, "default"),
          isActive: !isProMax,
        },
        {
          label: "Pro Max :))",
          href: createVariantHref(routeParam, selectedYear, PRO_MAX_VARIANT),
          isActive: isProMax,
        },
      ]
    : [];
  const canUseStaticFallback = Boolean(university.programs?.length);
  const fallbackDataYear = FALLBACK_YEAR;
  const fallbackPrograms = canUseStaticFallback
    ? createFallbackPrograms(university, fallbackDataYear)
    : [];
  const fallbackMethods = canUseStaticFallback
    ? createFallbackMethods(school.code, fallbackDataYear)
    : [];
  const fallbackAdmissionInfo = canUseStaticFallback
    ? createFallbackAdmissionInfo(school, fallbackDataYear)
    : null;

  const [loadedPrograms, loadedMethods, loadedBenchmarks, loadedTuitionFees, loadedAdmissionInfo, loadedSubjectCombinations] =
    await Promise.all([
      loadOrFallback(() => getSchoolPrograms(school.code, selectedYear), [], "school programs"),
      loadOrFallback(() => getSchoolAdmissionMethods(school.code, selectedYear), [], "admission methods"),
      loadOrFallback(() => getSchoolBenchmarks(school.code, selectedYear), [], "benchmarks"),
      loadOrFallback(() => getSchoolTuitionFees(school.code, selectedYear), [], "tuition fees"),
      loadOrFallback(() => getSchoolAdmissionInfo(school.code, selectedYear), null, "admission info"),
      loadOrFallback(() => getSubjectCombinations(), [], "subject combinations"),
    ]);

  const programs = loadedPrograms.length ? loadedPrograms : fallbackPrograms;
  const methods = loadedMethods.length ? loadedMethods : fallbackMethods;
  const benchmarks = loadedBenchmarks.length
    ? loadedBenchmarks
    : canUseStaticFallback
      ? createFallbackBenchmarks(university, programs, fallbackDataYear)
      : [];
  const tuitionFees = loadedTuitionFees.length
    ? loadedTuitionFees
    : canUseStaticFallback
      ? createFallbackTuitionFees(university, programs, fallbackDataYear)
      : [];
  const admissionInfo = loadedAdmissionInfo ?? fallbackAdmissionInfo;
  const subjectCombinations = loadedSubjectCombinations.length
    ? loadedSubjectCombinations
    : FALLBACK_SUBJECT_COMBINATIONS;
  const programCombinations = loadedPrograms.length
    ? await loadOrFallback(
        () => getProgramCombinations(programs.map((program) => program.id), selectedYear),
        [],
        "program combinations",
      )
    : canUseStaticFallback
      ? createFallbackProgramCombinations(programs, fallbackDataYear)
      : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SchoolHeader school={school} variantLinks={variantLinks} />

      <div className="container-page grid gap-6 py-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <AdmissionSectionNavigator items={isProMax ? PRO_MAX_NAV_ITEMS : undefined} />

        <div className="space-y-8">
          {isProMax && proMaxContent ? (
            <>
              <section id="calculator" className="scroll-mt-24">
                <ProMaxCalculatorLinkSection href={defaultCalculatorHref} />
              </section>

              <section id="overview" className="scroll-mt-24">
                <ProMaxContentSection title="Tổng quan" blocks={proMaxContent.overview} />
              </section>

              <section id="admission-info" className="scroll-mt-24">
                <ProMaxContentSection
                  title="Thông tin tuyển sinh"
                  blocks={proMaxContent.admissionInfo}
                />
              </section>

              <section id="programs" className="scroll-mt-24">
                <ProMaxPlaceholderSection
                  title="Chương trình tuyển sinh"
                  message={proMaxContent.placeholders.programs ?? PRO_MAX_PLACEHOLDER_MESSAGE}
                />
              </section>

              <section id="combinations" className="scroll-mt-24">
                <ProMaxMediaGrid
                  title="Tổ hợp xét tuyển"
                  blocks={proMaxContent.combinations}
                />
              </section>

              <section id="benchmarks" className="scroll-mt-24">
                <ProMaxPlaceholderSection
                  title="Điểm chuẩn tham khảo"
                  message={proMaxContent.placeholders.benchmarks ?? PRO_MAX_PLACEHOLDER_MESSAGE}
                />
              </section>

              <section id="tuition" className="scroll-mt-24">
                <ProMaxPlaceholderSection
                  title="Học phí"
                  message={proMaxContent.placeholders.tuition ?? PRO_MAX_PLACEHOLDER_MESSAGE}
                />
              </section>
            </>
          ) : (
            <>
              <section id="overview" className="scroll-mt-24">
                <SchoolOverviewSection school={school} />
              </section>

              <section id="admission-info" className="scroll-mt-24">
                <AdmissionInfoSection
                  admissionInfo={admissionInfo}
                  methods={methods}
                  selectedYear={selectedYear}
                  availableYears={ADMISSION_YEAR_OPTIONS}
                />
              </section>

              <section id="programs" className="scroll-mt-24">
                <AdmissionProgramsSection
                  programs={programs}
                  selectedYear={selectedYear}
                  availableYears={ADMISSION_YEAR_OPTIONS}
                />
              </section>

              <section id="combinations" className="scroll-mt-24">
                <SubjectCombinationsSection
                  subjectCombinations={subjectCombinations}
                  programCombinations={programCombinations}
                />
              </section>

              <section id="benchmarks" className="scroll-mt-24">
                <BenchmarksSection
                  benchmarks={benchmarks}
                  programs={programs}
                  selectedYear={selectedYear}
                  availableYears={ADMISSION_YEAR_OPTIONS}
                />
              </section>

              <section id="tuition" className="scroll-mt-24">
                <TuitionSection tuitionFees={tuitionFees} programs={programs} />
              </section>

              <section id="calculator" className="scroll-mt-24">
                <AdmissionCalculatorSection
                  schoolCode={school.code}
                  programs={programs}
                  benchmarks={benchmarks}
                  methods={methods}
                />
              </section>
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
  const university = findVisibleUnimapUniversityByRouteParam(routeParam);
  if (!university) {
    return {
      title: "Không tìm thấy trường",
    };
  }

  const school = await getAdmissionSchoolBySlug(routeParam);
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
  const selectedYear = getSelectedAdmissionYear(resolvedSearchParams?.year);
  const selectedVariant = getSelectedAdmissionVariant(resolvedSearchParams?.variant);
  const routeParam = code.toLowerCase();
  const university = findVisibleUnimapUniversityByRouteParam(routeParam);

  if (!university) {
    return <UniversityNotFound code={code} />;
  }

  const school = await getAdmissionSchoolBySlug(routeParam);
  const visibleSchool =
    school && isVisibleUnimapCode(school.code)
      ? applyUniversityMediaToSchool(school, university)
      : createFallbackSchool(university);

  return renderAdmissionSchoolDetail(
    visibleSchool,
    university,
    selectedYear,
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
