import "server-only";

import { supabaseServer } from "@/src/lib/db/supabaseServer";
import type {
  AdmissionInfo,
  AdmissionMethodRecord,
  AdmissionProgram,
  Benchmark,
  DataSource,
  ProgramCombination,
  School,
  SubjectCombination,
  TuitionFee,
} from "@/src/types/admission-data";

type SupabaseQueryError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

const DEFAULT_ADMISSION_DATA_TIMEOUT_MS = 2500;

type MaybeAbortableSupabaseQuery<T> = T & {
  abortSignal?: (signal: AbortSignal) => T;
};

function getAdmissionDataTimeoutMs() {
  const rawValue =
    process.env.SUPABASE_ADMISSION_DATA_TIMEOUT_MS ??
    process.env.NEXT_PUBLIC_SUPABASE_TIMEOUT_MS;
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : NaN;

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_ADMISSION_DATA_TIMEOUT_MS;
}

function withAdmissionDataTimeout<T>(query: T) {
  const abortableQuery = query as MaybeAbortableSupabaseQuery<T>;

  return typeof abortableQuery.abortSignal === "function"
    ? abortableQuery.abortSignal(AbortSignal.timeout(getAdmissionDataTimeoutMs()))
    : query;
}

function assertNonEmptyString(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function assertValidYear(year: number | undefined) {
  if (year === undefined) return;

  if (!Number.isInteger(year)) {
    throw new Error("year must be an integer when provided.");
  }
}

function throwAdmissionDataError(
  operation: string,
  error: SupabaseQueryError,
): never {
  const details = error.details ? ` Details: ${error.details}` : "";
  const hint = error.hint ? ` Hint: ${error.hint}` : "";
  throw new Error(
    `Admission data query failed while ${operation}: ${error.message}.${details}${hint}`,
  );
}

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  assertNonEmptyString(slug, "slug");

  const { data, error } = await withAdmissionDataTimeout(
    supabaseServer
      .from("schools")
      .select("*")
      .eq("slug", slug)
      .maybeSingle(),
  );

  if (error) {
    throwAdmissionDataError(`loading school by slug "${slug}"`, error);
  }

  return (data as School | null) ?? null;
}

export async function getSchoolByCode(code: string): Promise<School | null> {
  assertNonEmptyString(code, "code");

  const { data, error } = await withAdmissionDataTimeout(
    supabaseServer
      .from("schools")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle(),
  );

  if (error) {
    throwAdmissionDataError(`loading school by code "${code}"`, error);
  }

  return (data as School | null) ?? null;
}

export async function getSchoolBySlugOrCode(value: string): Promise<School | null> {
  const schoolBySlug = await getSchoolBySlug(value);
  if (schoolBySlug) return schoolBySlug;

  return getSchoolByCode(value);
}

export async function getSchoolSlugs(
  allowedCodes?: readonly string[],
): Promise<string[]> {
  let query = supabaseServer
    .from("schools")
    .select("slug, code")
    .order("slug");

  if (allowedCodes?.length) {
    query = query.in("code", allowedCodes);
  }

  const { data, error } = await withAdmissionDataTimeout(query);

  if (error) {
    throwAdmissionDataError("loading school slugs", error);
  }

  return (data ?? []).map((school) => school.slug).filter(Boolean);
}

export async function getSchoolPrograms(
  schoolCode: string,
  year?: number,
): Promise<AdmissionProgram[]> {
  assertNonEmptyString(schoolCode, "schoolCode");
  assertValidYear(year);

  let query = supabaseServer
    .from("admission_programs")
    .select("*")
    .eq("school_code", schoolCode)
    .order("year", { ascending: false })
    .order("program_name");

  if (year !== undefined) {
    query = query.eq("year", year);
  }

  const { data, error } = await withAdmissionDataTimeout(query);

  if (error) {
    throwAdmissionDataError(
      `loading admission programs for school "${schoolCode}"`,
      error,
    );
  }

  return (data ?? []) as AdmissionProgram[];
}

export async function getSchoolAdmissionMethods(
  schoolCode: string,
  year?: number,
): Promise<AdmissionMethodRecord[]> {
  assertNonEmptyString(schoolCode, "schoolCode");
  assertValidYear(year);

  let query = supabaseServer
    .from("admission_methods")
    .select("*")
    .eq("school_code", schoolCode)
    .order("year", { ascending: false })
    .order("method_code");

  if (year !== undefined) {
    query = query.eq("year", year);
  }

  const { data, error } = await withAdmissionDataTimeout(query);

  if (error) {
    throwAdmissionDataError(
      `loading admission methods for school "${schoolCode}"`,
      error,
    );
  }

  return (data ?? []) as AdmissionMethodRecord[];
}

export async function getSchoolBenchmarks(
  schoolCode: string,
  year?: number,
): Promise<Benchmark[]> {
  assertNonEmptyString(schoolCode, "schoolCode");
  assertValidYear(year);

  let query = supabaseServer
    .from("benchmarks")
    .select("*")
    .eq("school_code", schoolCode)
    .order("year", { ascending: false })
    .order("method_code");

  if (year !== undefined) {
    query = query.eq("year", year);
  }

  const { data, error } = await withAdmissionDataTimeout(query);

  if (error) {
    throwAdmissionDataError(
      `loading benchmarks for school "${schoolCode}"`,
      error,
    );
  }

  const benchmarks = (data ?? []) as Benchmark[];
  const programIds = Array.from(
    new Set(
      benchmarks
        .map((benchmark) => benchmark.program_id)
        .filter((programId): programId is string => Boolean(programId)),
    ),
  );

  if (!programIds.length) {
    return benchmarks;
  }

  const { data: programs, error: programsError } = await withAdmissionDataTimeout(
    supabaseServer
      .from("admission_programs")
      .select("id, program_code, program_name, major_code, major_name, year")
      .in("id", programIds),
  );

  if (programsError) {
    throwAdmissionDataError(
      `loading benchmark programs for school "${schoolCode}"`,
      programsError,
    );
  }

  const programById = new Map(
    (programs ?? []).map((program) => [
      program.id,
      {
        program_code: program.program_code,
        program_name: program.program_name,
        major_code: program.major_code,
        major_name: program.major_name,
        year: program.year,
      },
    ]),
  );

  return benchmarks.map((benchmark) => ({
    ...benchmark,
    admission_programs: benchmark.program_id
      ? programById.get(benchmark.program_id) ?? null
      : null,
  }));
}

export async function getSchoolTuitionFees(
  schoolCode: string,
  year?: number,
): Promise<TuitionFee[]> {
  assertNonEmptyString(schoolCode, "schoolCode");
  assertValidYear(year);

  let query = supabaseServer
    .from("tuition_fees")
    .select("*")
    .eq("school_code", schoolCode)
    .order("year", { ascending: false });

  if (year !== undefined) {
    query = query.eq("year", year);
  }

  const { data, error } = await withAdmissionDataTimeout(query);

  if (error) {
    throwAdmissionDataError(
      `loading tuition fees for school "${schoolCode}"`,
      error,
    );
  }

  return (data ?? []) as TuitionFee[];
}

export type SchoolDataYears = {
  programs: number[];
  benchmarks: number[];
  tuition: number[];
};

/**
 * Distinct years (newest first) that actually have data for a school, per
 * section. Used to default each UniMap section to the most recent year it has
 * data for, instead of a hardcoded year that may be empty (e.g. tuition is
 * 2026 for imported schools while benchmarks only exist for 2025).
 */
export async function getSchoolDataYears(
  schoolCode: string,
): Promise<SchoolDataYears> {
  assertNonEmptyString(schoolCode, "schoolCode");

  const yearsFrom = async (table: string): Promise<number[]> => {
    const { data, error } = await withAdmissionDataTimeout(
      supabaseServer.from(table).select("year").eq("school_code", schoolCode),
    );
    if (error) {
      throwAdmissionDataError(
        `loading available years from "${table}" for school "${schoolCode}"`,
        error,
      );
    }
    return Array.from(
      new Set(
        (data ?? [])
          .map((row) => row.year as number)
          .filter((year): year is number => typeof year === "number"),
      ),
    ).sort((a, b) => b - a);
  };

  const [programs, benchmarks, tuition] = await Promise.all([
    yearsFrom("admission_programs"),
    yearsFrom("benchmarks"),
    yearsFrom("tuition_fees"),
  ]);

  return { programs, benchmarks, tuition };
}

export async function getSchoolAdmissionInfo(
  schoolCode: string,
  year?: number,
): Promise<AdmissionInfo | null> {
  assertNonEmptyString(schoolCode, "schoolCode");
  assertValidYear(year);

  let query = supabaseServer
    .from("admission_info")
    .select("*")
    .eq("school_code", schoolCode)
    .order("year", { ascending: false })
    .limit(1);

  if (year !== undefined) {
    query = query.eq("year", year);
  }

  const { data, error } = await withAdmissionDataTimeout(query.maybeSingle());

  if (error) {
    throwAdmissionDataError(
      year === undefined
        ? `loading latest admission info for school "${schoolCode}"`
        : `loading admission info for school "${schoolCode}" in year ${year}`,
      error,
    );
  }

  return (data as AdmissionInfo | null) ?? null;
}

export async function getSubjectCombinations(): Promise<SubjectCombination[]> {
  const { data, error } = await withAdmissionDataTimeout(
    supabaseServer
      .from("subject_combinations")
      .select("*")
      .order("code"),
  );

  if (error) {
    throwAdmissionDataError("loading subject combinations", error);
  }

  return (data ?? []) as SubjectCombination[];
}

export async function getProgramCombinations(
  programIds: string[],
  year?: number,
): Promise<ProgramCombination[]> {
  if (!programIds.length) {
    return [];
  }

  programIds.forEach((programId) => {
    assertNonEmptyString(programId, "programIds item");
  });
  assertValidYear(year);

  const uniqueProgramIds = Array.from(new Set(programIds));

  let query = supabaseServer
    .from("program_combinations")
    .select("*")
    .in("program_id", uniqueProgramIds)
    .order("year", { ascending: false })
    .order("combination_code");

  if (year !== undefined) {
    query = query.eq("year", year);
  }

  const { data, error } = await withAdmissionDataTimeout(query);

  if (error) {
    throwAdmissionDataError("loading program combinations", error);
  }

  return (data ?? []) as ProgramCombination[];
}

export type {
  AdmissionInfo,
  AdmissionMethodRecord,
  AdmissionProgram,
  Benchmark,
  DataSource,
  ProgramCombination,
  School,
  SubjectCombination,
  TuitionFee,
};
