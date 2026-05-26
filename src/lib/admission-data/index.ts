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

  const { data, error } = await supabaseServer
    .from("schools")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throwAdmissionDataError(`loading school by slug "${slug}"`, error);
  }

  return (data as School | null) ?? null;
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

  const { data, error } = await query;

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

  const { data, error } = await query;

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

  const { data, error } = await query;

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

  const { data, error } = await query;

  if (error) {
    throwAdmissionDataError(
      `loading benchmarks for school "${schoolCode}"`,
      error,
    );
  }

  return (data ?? []) as Benchmark[];
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

  const { data, error } = await query;

  if (error) {
    throwAdmissionDataError(
      `loading tuition fees for school "${schoolCode}"`,
      error,
    );
  }

  return (data ?? []) as TuitionFee[];
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

  const { data, error } = await query.maybeSingle();

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
  const { data, error } = await supabaseServer
    .from("subject_combinations")
    .select("*")
    .order("code");

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

  const { data, error } = await query;

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
