import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { BenchmarksSection } from "@/src/components/admission/BenchmarksSection";
import { SchoolHeader } from "@/src/components/admission/SchoolHeader";
import { SchoolOverviewSection } from "@/src/components/admission/SchoolOverviewSection";
import { SubjectCombinationsSection } from "@/src/components/admission/SubjectCombinationsSection";
import { TuitionSection } from "@/src/components/admission/TuitionSection";

interface UniversityDetailPageProps {
  params: Promise<{
    code: string;
  }>;
}

const FALLBACK_YEAR = 2025;

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

function createFallbackPrograms(university: University): AdmissionProgram[] {
  return (university.programs ?? []).map((program, index) => ({
    id: `fallback-program-${university.code.toLowerCase()}-${index}`,
    school_code: university.code,
    program_code: program.programCode,
    program_name: program.name,
    major_code: program.majorCode ?? null,
    major_name: program.majorCode ?? null,
    year: FALLBACK_YEAR,
    quota: null,
    degree_level: "Đại học",
    training_type: "Chính quy",
    note: "Dữ liệu demo UniMap, cần đối chiếu đề án tuyển sinh chính thức.",
    source_url: university.website ?? null,
    created_at: null,
  }));
}

function createFallbackMethods(schoolCode: string): AdmissionMethodRecord[] {
  return [
    ["THPT", "Xét tuyển theo điểm thi tốt nghiệp THPT"],
    ["TSA", "Xét tuyển theo điểm đánh giá tư duy/năng lực"],
    ["XTTN", "Xét tuyển tài năng hoặc phương thức riêng"],
  ].map(([methodCode, methodName]) => ({
    id: `fallback-method-${schoolCode.toLowerCase()}-${methodCode.toLowerCase()}`,
    school_code: schoolCode,
    method_code: methodCode,
    method_name: methodName,
    year: FALLBACK_YEAR,
    description: "Phương thức demo để giữ cấu trúc trang giống HUST trong MVP.",
    is_active: true,
    source_url: null,
    created_at: null,
  }));
}

function createFallbackAdmissionInfo(school: School): AdmissionInfo {
  return {
    id: `fallback-admission-info-${school.code.toLowerCase()}`,
    school_code: school.code,
    year: FALLBACK_YEAR,
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
      year: FALLBACK_YEAR,
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
      year: FALLBACK_YEAR,
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
): ProgramCombination[] {
  return programs.flatMap((program) =>
    ["A00", "A01", "D01"].map((combinationCode) => ({
      id: `fallback-combination-${program.id}-${combinationCode.toLowerCase()}`,
      program_id: program.id,
      combination_code: combinationCode,
      year: FALLBACK_YEAR,
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
) {
  const fallbackPrograms = createFallbackPrograms(university);
  const fallbackMethods = createFallbackMethods(school.code);
  const fallbackAdmissionInfo = createFallbackAdmissionInfo(school);

  const [loadedPrograms, loadedMethods, loadedBenchmarks, loadedTuitionFees, loadedAdmissionInfo, loadedSubjectCombinations] =
    await Promise.all([
      loadOrFallback(() => getSchoolPrograms(school.code), [], "school programs"),
      loadOrFallback(() => getSchoolAdmissionMethods(school.code), [], "admission methods"),
      loadOrFallback(() => getSchoolBenchmarks(school.code), [], "benchmarks"),
      loadOrFallback(() => getSchoolTuitionFees(school.code), [], "tuition fees"),
      loadOrFallback(() => getSchoolAdmissionInfo(school.code), null, "admission info"),
      loadOrFallback(() => getSubjectCombinations(), [], "subject combinations"),
    ]);

  const programs = loadedPrograms.length ? loadedPrograms : fallbackPrograms;
  const methods = loadedMethods.length ? loadedMethods : fallbackMethods;
  const benchmarks = loadedBenchmarks.length
    ? loadedBenchmarks
    : createFallbackBenchmarks(university, programs);
  const tuitionFees = loadedTuitionFees.length
    ? loadedTuitionFees
    : createFallbackTuitionFees(university, programs);
  const admissionInfo = loadedAdmissionInfo ?? fallbackAdmissionInfo;
  const subjectCombinations = loadedSubjectCombinations.length
    ? loadedSubjectCombinations
    : FALLBACK_SUBJECT_COMBINATIONS;
  const programCombinations = loadedPrograms.length
    ? await loadOrFallback(
        () => getProgramCombinations(programs.map((program) => program.id)),
        [],
        "program combinations",
      )
    : createFallbackProgramCombinations(programs);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SchoolHeader school={school} />

      <div className="container-page space-y-8 py-10">
        <SchoolOverviewSection school={school} />
        <AdmissionProgramsSection programs={programs} />
        <SubjectCombinationsSection
          subjectCombinations={subjectCombinations}
          programCombinations={programCombinations}
        />
        <AdmissionInfoSection admissionInfo={admissionInfo} methods={methods} />
        <BenchmarksSection benchmarks={benchmarks} programs={programs} />
        <TuitionSection tuitionFees={tuitionFees} programs={programs} />
        <AdmissionCalculatorSection
          schoolCode={school.code}
          programs={programs}
          benchmarks={benchmarks}
          methods={methods}
        />
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

export default async function UniversityDetailPage({ params }: UniversityDetailPageProps) {
  const { code } = await params;
  const routeParam = code.toLowerCase();
  const university = findVisibleUnimapUniversityByRouteParam(routeParam);

  if (!university) {
    return <UniversityNotFound code={code} />;
  }

  const school = await getAdmissionSchoolBySlug(routeParam);
  const visibleSchool =
    school && isVisibleUnimapCode(school.code) ? school : createFallbackSchool(university);

  return renderAdmissionSchoolDetail(visibleSchool, university);
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
