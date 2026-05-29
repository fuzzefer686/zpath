import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { fetchWithSupabaseTimeout } from "@/lib/supabase-fetch";
import { canonicalizeAdvisorProgramCode } from "@/lib/advisor/programCodes";
import type {
  AdmissionData,
  AdvisorInternalSource,
  AdvisorRetrievalResult,
  AdvisorRetrievalSingleResult,
  BenchmarkScore,
  GetAdmissionDataParams,
  GetBenchmarkScoresParams,
  GetMajorProfileParams,
  GetSchoolProfileParams,
  GetTuitionDataParams,
  MajorProfile,
  MajorSearchResult,
  SchoolProfile,
  SchoolSearchResult,
  ScoreMajorSuggestion,
  SuggestMajorsByScoreParams,
  TuitionData,
} from "@/lib/advisor/retrieval/types";

type SupabaseErrorLike = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

type SchoolRow = {
  id: string;
  code: string;
  name: string;
  slug: string;
  english_name: string | null;
  type: string | null;
  city: string | null;
  address?: string | null;
  website: string | null;
  fanpage?: string | null;
  description?: string | null;
  source_url: string | null;
  last_checked_at: string | null;
};

type AdmissionProgramRow = {
  id: string;
  school_code: string;
  program_code: string | null;
  program_name: string;
  major_code: string | null;
  major_name: string | null;
  year: number;
  quota: number | null;
  degree_level: string | null;
  training_type: string | null;
  note: string | null;
  source_url: string | null;
};

type LegacyMajorRow = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  description?: string | null;
};

type AdmissionMethodRow = {
  id: string;
  school_code: string;
  method_code: string;
  method_name: string;
  year: number;
  description: string | null;
  is_active: boolean | null;
  source_url: string | null;
};

type AdmissionInfoRow = {
  id: string;
  school_code: string;
  year: number;
  total_quota: number | null;
  admission_scope: string | null;
  application_timeline: string | null;
  eligibility: string | null;
  notes: string | null;
  source_url: string | null;
};

type BenchmarkRow = {
  id: string;
  school_code: string;
  program_id: string | null;
  year: number;
  method_code: string;
  combination_code: string | null;
  score: number;
  scale: number | null;
  note: string | null;
  source_url: string | null;
};

type TuitionRow = {
  id: string;
  school_code: string;
  program_id: string | null;
  year: number;
  min_fee: number | null;
  max_fee: number | null;
  currency: string | null;
  unit: string | null;
  description: string | null;
  note: string | null;
  source_url: string | null;
};

type ClientStatus =
  | { ok: true; client: SupabaseClient }
  | { ok: false; reason: string };

const DEFAULT_LIMIT = 10;

let cachedClient: SupabaseClient | null = null;

function getInternalSupabaseClient(): ClientStatus {
  if (cachedClient) {
    return { ok: true, client: cachedClient };
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      ok: false,
      reason:
        "Supabase is not configured. Expected SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetchWithSupabaseTimeout,
    },
  });

  return { ok: true, client: cachedClient };
}

function emptyResult<T>(reason: string): AdvisorRetrievalResult<T> {
  return {
    status: "empty",
    data: [],
    sources: [],
    reason,
  };
}

function unavailableResult<T>(reason: string): AdvisorRetrievalResult<T> {
  return {
    status: "unavailable",
    data: [],
    sources: [],
    reason,
  };
}

function unavailableSingle<T>(reason: string): AdvisorRetrievalSingleResult<T> {
  return {
    status: "unavailable",
    data: null,
    sources: [],
    reason,
  };
}

function resultFromError<T>(
  tableName: string,
  error: SupabaseErrorLike,
): AdvisorRetrievalResult<T> {
  const missingSchema =
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST200" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205";
  const detail = error.details ? ` Details: ${error.details}` : "";
  const hint = error.hint ? ` Hint: ${error.hint}` : "";

  return {
    status: missingSchema ? "unavailable" : "error",
    data: [],
    sources: [],
    reason: `Cannot read ${tableName}: ${error.message}.${detail}${hint}`,
  };
}

function singleFromError<T>(
  tableName: string,
  error: SupabaseErrorLike,
): AdvisorRetrievalSingleResult<T> {
  const result = resultFromError<T>(tableName, error);
  return {
    status: result.status,
    data: null,
    sources: [],
    reason: result.reason,
  };
}

function cleanQuery(value: string) {
  return value.trim().replace(/[%_,]/g, " ").replace(/\s+/g, " ");
}

function ilikePattern(value: string) {
  return `%${cleanQuery(value)}%`;
}

function normalizeSchoolCode(value?: string) {
  return value?.trim().toUpperCase() || undefined;
}

function normalizeProgramCode(value?: string) {
  return canonicalizeAdvisorProgramCode(value);
}

function isProvided(value?: string) {
  return Boolean(value?.trim());
}

function sourceFromRow(
  title: string,
  table: string,
  row: { id?: string | null; source_url?: string | null },
): AdvisorInternalSource {
  return {
    sourceType: "zpath_database",
    title,
    url: row.source_url ?? undefined,
    table,
    recordId: row.id ?? undefined,
  };
}

function uniqueSources(sources: AdvisorInternalSource[]) {
  const seen = new Set<string>();

  return sources.filter((source) => {
    const key = `${source.table ?? ""}:${source.recordId ?? ""}:${source.url ?? ""}:${source.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function successResult<T>(
  data: T[],
  sources: AdvisorInternalSource[],
  emptyReason: string,
): AdvisorRetrievalResult<T> {
  return {
    status: data.length ? "success" : "empty",
    data,
    sources: uniqueSources(sources),
    reason: data.length ? undefined : emptyReason,
  };
}

function mapSchool(row: SchoolRow): SchoolSearchResult {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
    englishName: row.english_name,
    type: row.type,
    city: row.city,
    website: row.website,
    sourceUrl: row.source_url,
    lastCheckedAt: row.last_checked_at,
  };
}

function mapSchoolProfile(row: SchoolRow): SchoolProfile {
  return {
    ...mapSchool(row),
    address: row.address ?? null,
    fanpage: row.fanpage ?? null,
    description: row.description ?? null,
  };
}

function mapProgramToMajorProfile(
  row: AdmissionProgramRow,
  schoolNameByCode: Map<string, string>,
): MajorProfile {
  return {
    programId: row.id,
    schoolCode: row.school_code,
    schoolName: schoolNameByCode.get(row.school_code) ?? null,
    programCode: row.program_code,
    programName: row.program_name,
    majorCode: row.major_code,
    majorName: row.major_name,
    year: row.year,
    quota: row.quota,
    degreeLevel: row.degree_level,
    trainingType: row.training_type,
    note: row.note,
    sourceUrl: row.source_url,
  };
}

async function fetchSchoolsByCodes(
  client: SupabaseClient,
  schoolCodes: string[],
) {
  const uniqueCodes = Array.from(new Set(schoolCodes.filter(Boolean)));
  if (!uniqueCodes.length) return new Map<string, SchoolRow>();

  const { data, error } = await client
    .from("schools")
    .select(
      "id, code, name, slug, english_name, type, city, address, website, fanpage, description, source_url, last_checked_at",
    )
    .in("code", uniqueCodes);

  if (error) return new Map<string, SchoolRow>();

  return new Map(
    ((data ?? []) as SchoolRow[]).map((school) => [school.code, school]),
  );
}

async function resolveSchoolCode(
  client: SupabaseClient,
  params: GetSchoolProfileParams,
) {
  const directCode = normalizeSchoolCode(params.schoolCode);
  if (directCode) return directCode;

  if (!isProvided(params.schoolName)) return null;

  const { data, error } = await client
    .from("schools")
    .select("code")
    .or(
      `name.ilike.${ilikePattern(params.schoolName!)},english_name.ilike.${ilikePattern(params.schoolName!)},code.ilike.${ilikePattern(params.schoolName!)}`,
    )
    .order("name")
    .limit(1)
    .maybeSingle();

  if (error || !data?.code) return null;
  return String(data.code);
}

async function findProgramIdsForMajor(
  client: SupabaseClient,
  params: {
    majorName?: string;
    programCode?: string;
    schoolCode?: string;
    year?: number;
    limit?: number;
  },
) {
  const programCode = normalizeProgramCode(params.programCode);

  if (programCode) {
    let exactQuery = client
      .from("admission_programs")
      .select(
        "id, school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url",
      )
      .eq("program_code", programCode)
      .order("year", { ascending: false })
      .limit(params.limit ?? 40);

    if (params.schoolCode) {
      exactQuery = exactQuery.eq("school_code", params.schoolCode);
    }

    if (params.year !== undefined) {
      exactQuery = exactQuery.eq("year", params.year);
    }

    const { data, error } = await exactQuery;
    if (error) return [];

    const exactIds = ((data ?? []) as AdmissionProgramRow[]).map(
      (program) => program.id,
    );
    if (exactIds.length) return exactIds;
  }

  if (!isProvided(params.majorName)) return [];

  let query = client
    .from("admission_programs")
    .select(
      "id, school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url",
    )
    .or(
      `program_name.ilike.${ilikePattern(params.majorName!)},major_name.ilike.${ilikePattern(params.majorName!)},major_code.ilike.${ilikePattern(params.majorName!)},program_code.ilike.${ilikePattern(params.majorName!)}`,
    )
    .order("year", { ascending: false })
    .limit(params.limit ?? 40);

  if (params.schoolCode) {
    query = query.eq("school_code", params.schoolCode);
  }

  if (params.year !== undefined) {
    query = query.eq("year", params.year);
  }

  const { data, error } = await query;
  if (error) return [];

  return ((data ?? []) as AdmissionProgramRow[]).map((program) => program.id);
}

async function attachProgramAndSchoolToBenchmarks(
  client: SupabaseClient,
  rows: BenchmarkRow[],
): Promise<BenchmarkScore[]> {
  const schoolByCode = await fetchSchoolsByCodes(
    client,
    rows.map((row) => row.school_code),
  );
  const programIds = Array.from(
    new Set(
      rows
        .map((row) => row.program_id)
        .filter((programId): programId is string => Boolean(programId)),
    ),
  );
  const programById = new Map<string, AdmissionProgramRow>();

  if (programIds.length) {
    const { data } = await client
      .from("admission_programs")
      .select(
        "id, school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url",
      )
      .in("id", programIds);

    ((data ?? []) as AdmissionProgramRow[]).forEach((program) => {
      programById.set(program.id, program);
    });
  }

  return rows.map((row) => {
    const program = row.program_id ? programById.get(row.program_id) : undefined;
    return {
      id: row.id,
      schoolCode: row.school_code,
      schoolName: schoolByCode.get(row.school_code)?.name ?? null,
      programId: row.program_id,
      programCode: program?.program_code ?? null,
      programName: program?.program_name ?? null,
      majorName: program?.major_name ?? null,
      year: row.year,
      methodCode: row.method_code,
      combinationCode: row.combination_code,
      score: Number(row.score),
      scale: row.scale,
      note: row.note,
      sourceUrl: row.source_url,
    };
  });
}

async function attachProgramAndSchoolToTuition(
  client: SupabaseClient,
  rows: TuitionRow[],
): Promise<TuitionData[]> {
  const schoolByCode = await fetchSchoolsByCodes(
    client,
    rows.map((row) => row.school_code),
  );
  const programIds = Array.from(
    new Set(
      rows
        .map((row) => row.program_id)
        .filter((programId): programId is string => Boolean(programId)),
    ),
  );
  const programById = new Map<string, AdmissionProgramRow>();

  if (programIds.length) {
    const { data } = await client
      .from("admission_programs")
      .select(
        "id, school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url",
      )
      .in("id", programIds);

    ((data ?? []) as AdmissionProgramRow[]).forEach((program) => {
      programById.set(program.id, program);
    });
  }

  return rows.map((row) => {
    const program = row.program_id ? programById.get(row.program_id) : undefined;
    return {
      id: row.id,
      schoolCode: row.school_code,
      schoolName: schoolByCode.get(row.school_code)?.name ?? null,
      programId: row.program_id,
      programCode: program?.program_code ?? null,
      programName: program?.program_name ?? null,
      majorName: program?.major_name ?? null,
      year: row.year,
      minFee: row.min_fee === null ? null : Number(row.min_fee),
      maxFee: row.max_fee === null ? null : Number(row.max_fee),
      currency: row.currency,
      unit: row.unit,
      description: row.description,
      note: row.note,
      sourceUrl: row.source_url,
    };
  });
}

export async function searchSchools(
  query: string,
): Promise<AdvisorRetrievalResult<SchoolSearchResult>> {
  const clientStatus = getInternalSupabaseClient();
  if (!clientStatus.ok) return unavailableResult(clientStatus.reason);

  const normalizedQuery = cleanQuery(query);
  if (!normalizedQuery) return emptyResult("School search query is empty.");

  const { data, error } = await clientStatus.client
    .from("schools")
    .select(
      "id, code, name, slug, english_name, type, city, website, source_url, last_checked_at",
    )
    .or(
      `name.ilike.${ilikePattern(normalizedQuery)},english_name.ilike.${ilikePattern(normalizedQuery)},code.ilike.${ilikePattern(normalizedQuery)},city.ilike.${ilikePattern(normalizedQuery)}`,
    )
    .order("name")
    .limit(DEFAULT_LIMIT);

  if (error) return resultFromError("schools", error);

  const rows = (data ?? []) as SchoolRow[];
  return successResult(
    rows.map(mapSchool),
    rows.map((row) => sourceFromRow(`ZPath school: ${row.name}`, "schools", row)),
    "No matching schools found in ZPath database.",
  );
}

export async function searchMajors(
  query: string,
): Promise<AdvisorRetrievalResult<MajorSearchResult>> {
  const clientStatus = getInternalSupabaseClient();
  if (!clientStatus.ok) return unavailableResult(clientStatus.reason);

  const normalizedQuery = cleanQuery(query);
  if (!normalizedQuery) return emptyResult("Major search query is empty.");
  const exactProgramCode = normalizeProgramCode(normalizedQuery);

  if (exactProgramCode) {
    const { data: exactData, error: exactError } = await clientStatus.client
      .from("admission_programs")
      .select(
        "id, school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url",
      )
      .eq("program_code", exactProgramCode)
      .order("year", { ascending: false })
      .order("program_name")
      .limit(DEFAULT_LIMIT);

    if (exactError) return resultFromError("admission_programs", exactError);

    const exactRows = (exactData ?? []) as AdmissionProgramRow[];
    if (exactRows.length) {
      const schoolByCode = await fetchSchoolsByCodes(
        clientStatus.client,
        exactRows.map((program) => program.school_code),
      );

      return successResult(
        exactRows.map((program) => ({
          id: program.id,
          name: program.major_name ?? program.program_name,
          code: program.major_code ?? program.program_code,
          category: null,
          schoolCode: program.school_code,
          schoolName: schoolByCode.get(program.school_code)?.name ?? null,
          programCode: program.program_code,
          programName: program.program_name,
          year: program.year,
          sourceUrl: program.source_url,
        })),
        exactRows.map((program) =>
          sourceFromRow(
            `ZPath admission program: ${program.program_name}`,
            "admission_programs",
            program,
          ),
        ),
        "No matching majors found in ZPath database.",
      );
    }
  }

  const { data, error } = await clientStatus.client
    .from("admission_programs")
    .select(
      "id, school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url",
    )
    .or(
      `program_name.ilike.${ilikePattern(normalizedQuery)},major_name.ilike.${ilikePattern(normalizedQuery)},major_code.ilike.${ilikePattern(normalizedQuery)},program_code.ilike.${ilikePattern(normalizedQuery)}`,
    )
    .order("year", { ascending: false })
    .order("program_name")
    .limit(DEFAULT_LIMIT);

  if (error) return resultFromError("admission_programs", error);

  const programRows = (data ?? []) as AdmissionProgramRow[];
  const schoolByCode = await fetchSchoolsByCodes(
    clientStatus.client,
    programRows.map((program) => program.school_code),
  );
  const programResults: MajorSearchResult[] = programRows.map((program) => ({
    id: program.id,
    name: program.major_name ?? program.program_name,
    code: program.major_code ?? program.program_code,
    category: null,
    schoolCode: program.school_code,
    schoolName: schoolByCode.get(program.school_code)?.name ?? null,
    programCode: program.program_code,
    programName: program.program_name,
    year: program.year,
    sourceUrl: program.source_url,
  }));

  const { data: legacyData, error: legacyError } = await clientStatus.client
    .from("majors")
    .select("id, code, name, category, description")
    .or(
      `name.ilike.${ilikePattern(normalizedQuery)},code.ilike.${ilikePattern(normalizedQuery)},category.ilike.${ilikePattern(normalizedQuery)}`,
    )
    .order("name")
    .limit(DEFAULT_LIMIT);

  const legacyResults: MajorSearchResult[] = legacyError
    ? []
    : ((legacyData ?? []) as LegacyMajorRow[]).map((major) => ({
        id: major.id,
        name: major.name,
        code: major.code,
        category: major.category,
        schoolCode: null,
        schoolName: null,
        programCode: null,
        programName: null,
        year: null,
        sourceUrl: null,
      }));

  const results = [...programResults, ...legacyResults].slice(0, DEFAULT_LIMIT);
  const sources = [
    ...programRows.map((program) =>
      sourceFromRow(
        `ZPath admission program: ${program.program_name}`,
        "admission_programs",
        program,
      ),
    ),
    ...(!legacyError
      ? ((legacyData ?? []) as LegacyMajorRow[]).map((major) =>
          sourceFromRow(`ZPath major: ${major.name}`, "majors", major),
        )
      : []),
  ];

  return successResult(
    results,
    sources,
    legacyError
      ? `No matching majors found in admission_programs. Legacy majors lookup was unavailable: ${legacyError.message}.`
      : "No matching majors found in ZPath database.",
  );
}

export async function getSchoolProfile(
  params: GetSchoolProfileParams,
): Promise<AdvisorRetrievalSingleResult<SchoolProfile>> {
  const clientStatus = getInternalSupabaseClient();
  if (!clientStatus.ok) return unavailableSingle(clientStatus.reason);

  if (!isProvided(params.schoolName) && !isProvided(params.schoolCode)) {
    return unavailableSingle("schoolName or schoolCode is required.");
  }

  const schoolCode = await resolveSchoolCode(clientStatus.client, params);
  if (!schoolCode) {
    return {
      status: "empty",
      data: null,
      sources: [],
      reason: "No matching school found in ZPath database.",
    };
  }

  const { data, error } = await clientStatus.client
    .from("schools")
    .select(
      "id, code, name, slug, english_name, type, city, address, website, fanpage, description, source_url, last_checked_at",
    )
    .eq("code", schoolCode)
    .limit(1)
    .maybeSingle();

  if (error) return singleFromError("schools", error);
  if (!data) {
    return {
      status: "empty",
      data: null,
      sources: [],
      reason: "No matching school profile found in ZPath database.",
    };
  }

  const row = data as SchoolRow;
  return {
    status: "success",
    data: mapSchoolProfile(row),
    sources: [sourceFromRow(`ZPath school: ${row.name}`, "schools", row)],
  };
}

export async function getMajorProfile(
  params: GetMajorProfileParams,
): Promise<AdvisorRetrievalResult<MajorProfile>> {
  const clientStatus = getInternalSupabaseClient();
  if (!clientStatus.ok) return unavailableResult(clientStatus.reason);

  const programCode = normalizeProgramCode(params.programCode);
  if (!isProvided(params.majorName) && !programCode) {
    return emptyResult("majorName or programCode is required.");
  }

  const schoolCode = await resolveSchoolCode(clientStatus.client, params);
  let query = clientStatus.client
    .from("admission_programs")
    .select(
      "id, school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url",
    )
    .order("year", { ascending: false })
    .order("program_name")
    .limit(20);

  if (programCode) {
    query = query.eq("program_code", programCode);
  } else {
    const majorName = params.majorName;
    if (!majorName) {
      return emptyResult("majorName or programCode is required.");
    }

    query = query.or(
      `program_name.ilike.${ilikePattern(majorName)},major_name.ilike.${ilikePattern(majorName)},major_code.ilike.${ilikePattern(majorName)},program_code.ilike.${ilikePattern(majorName)}`,
    );
  }

  if (schoolCode) {
    query = query.eq("school_code", schoolCode);
  }

  const { data, error } = await query;
  if (error) return resultFromError("admission_programs", error);

  const rows = (data ?? []) as AdmissionProgramRow[];
  const schoolByCode = await fetchSchoolsByCodes(
    clientStatus.client,
    rows.map((row) => row.school_code),
  );

  return successResult(
    rows.map((row) =>
      mapProgramToMajorProfile(
        row,
        new Map(
          Array.from(schoolByCode.entries()).map(([code, school]) => [
            code,
            school.name,
          ]),
        ),
      ),
    ),
    rows.map((row) =>
      sourceFromRow(
        `ZPath admission program: ${row.program_name}`,
        "admission_programs",
        row,
      ),
    ),
    "No matching major/program profile found in ZPath database.",
  );
}

export async function getAdmissionData(
  params: GetAdmissionDataParams,
): Promise<AdvisorRetrievalResult<AdmissionData>> {
  const clientStatus = getInternalSupabaseClient();
  if (!clientStatus.ok) return unavailableResult(clientStatus.reason);

  const schoolCode = await resolveSchoolCode(clientStatus.client, params);
  const programIds = await findProgramIdsForMajor(clientStatus.client, {
    majorName: params.majorName,
    programCode: params.programCode,
    schoolCode: schoolCode ?? undefined,
    year: params.year,
  });

  if (!schoolCode && !programIds.length) {
    return emptyResult(
      "schoolName, schoolCode, or a majorName with matching admission programs is required.",
    );
  }

  let programQuery = clientStatus.client
    .from("admission_programs")
    .select(
      "id, school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url",
    )
    .order("year", { ascending: false })
    .order("program_name")
    .limit(50);

  if (schoolCode) programQuery = programQuery.eq("school_code", schoolCode);
  if (programIds.length) programQuery = programQuery.in("id", programIds);
  if (params.year !== undefined) programQuery = programQuery.eq("year", params.year);

  const { data: programData, error: programError } = await programQuery;
  if (programError) return resultFromError("admission_programs", programError);

  const programs = (programData ?? []) as AdmissionProgramRow[];
  const schoolCodes = schoolCode
    ? [schoolCode]
    : Array.from(new Set(programs.map((program) => program.school_code)));
  const schoolByCode = await fetchSchoolsByCodes(clientStatus.client, schoolCodes);
  const schoolNameByCode = new Map(
    Array.from(schoolByCode.entries()).map(([code, school]) => [code, school.name]),
  );

  let methodsQuery = clientStatus.client
    .from("admission_methods")
    .select(
      "id, school_code, method_code, method_name, year, description, is_active, source_url",
    )
    .in("school_code", schoolCodes)
    .order("year", { ascending: false })
    .order("method_code")
    .limit(80);

  if (params.year !== undefined) methodsQuery = methodsQuery.eq("year", params.year);

  let infoQuery = clientStatus.client
    .from("admission_info")
    .select(
      "id, school_code, year, total_quota, admission_scope, application_timeline, eligibility, notes, source_url",
    )
    .in("school_code", schoolCodes)
    .order("year", { ascending: false })
    .limit(20);

  if (params.year !== undefined) infoQuery = infoQuery.eq("year", params.year);

  const [methodsResponse, infoResponse] = await Promise.all([
    methodsQuery,
    infoQuery,
  ]);

  if (methodsResponse.error) {
    return resultFromError("admission_methods", methodsResponse.error);
  }
  if (infoResponse.error) {
    return resultFromError("admission_info", infoResponse.error);
  }

  const methods = (methodsResponse.data ?? []) as AdmissionMethodRow[];
  const infos = (infoResponse.data ?? []) as AdmissionInfoRow[];
  const programProfiles = programs.map((program) =>
    mapProgramToMajorProfile(program, schoolNameByCode),
  );

  const data = schoolCodes.map((code) => {
    const latestInfo = infos.find((info) => info.school_code === code) ?? null;
    return {
      schoolCode: code,
      schoolName: schoolNameByCode.get(code) ?? null,
      year: params.year ?? latestInfo?.year ?? null,
      admissionInfo: latestInfo
        ? {
            totalQuota: latestInfo.total_quota,
            admissionScope: latestInfo.admission_scope,
            applicationTimeline: latestInfo.application_timeline,
            eligibility: latestInfo.eligibility,
            notes: latestInfo.notes,
            sourceUrl: latestInfo.source_url,
          }
        : null,
      methods: methods
        .filter((method) => method.school_code === code)
        .map((method) => ({
          methodCode: method.method_code,
          methodName: method.method_name,
          year: method.year,
          description: method.description,
          isActive: method.is_active,
          sourceUrl: method.source_url,
        })),
      programs: programProfiles.filter((program) => program.schoolCode === code),
    };
  });

  const sources = [
    ...programs.map((row) =>
      sourceFromRow(
        `ZPath admission program: ${row.program_name}`,
        "admission_programs",
        row,
      ),
    ),
    ...methods.map((row) =>
      sourceFromRow(
        `ZPath admission method: ${row.method_name}`,
        "admission_methods",
        row,
      ),
    ),
    ...infos.map((row) =>
      sourceFromRow(
        `ZPath admission info: ${row.school_code} ${row.year}`,
        "admission_info",
        row,
      ),
    ),
  ];

  return successResult(
    data,
    sources,
    "No admission data found in ZPath database.",
  );
}

export async function getBenchmarkScores(
  params: GetBenchmarkScoresParams,
): Promise<AdvisorRetrievalResult<BenchmarkScore>> {
  const clientStatus = getInternalSupabaseClient();
  if (!clientStatus.ok) return unavailableResult(clientStatus.reason);

  const schoolCode = await resolveSchoolCode(clientStatus.client, params);
  const programIds = await findProgramIdsForMajor(clientStatus.client, {
    majorName: params.majorName,
    programCode: params.programCode,
    schoolCode: schoolCode ?? undefined,
    year: params.year,
  });

  if (!schoolCode && !programIds.length && params.year === undefined) {
    return emptyResult(
      "At least one of schoolName, schoolCode, majorName, or year is required for benchmark lookup.",
    );
  }

  let query = clientStatus.client
    .from("benchmarks")
    .select(
      "id, school_code, program_id, year, method_code, combination_code, score, scale, note, source_url",
    )
    .order("year", { ascending: false })
    .order("score", { ascending: false })
    .limit(50);

  if (schoolCode) query = query.eq("school_code", schoolCode);
  if (programIds.length) query = query.in("program_id", programIds);
  if (params.year !== undefined) query = query.eq("year", params.year);

  const { data, error } = await query;
  if (error) return resultFromError("benchmarks", error);

  const rows = (data ?? []) as BenchmarkRow[];
  const benchmarks = await attachProgramAndSchoolToBenchmarks(
    clientStatus.client,
    rows,
  );

  return successResult(
    benchmarks,
    rows.map((row) =>
      sourceFromRow(
        `ZPath benchmark: ${row.school_code} ${row.year}`,
        "benchmarks",
        row,
      ),
    ),
    "No benchmark scores found in ZPath database.",
  );
}

export async function getTuitionData(
  params: GetTuitionDataParams,
): Promise<AdvisorRetrievalResult<TuitionData>> {
  const clientStatus = getInternalSupabaseClient();
  if (!clientStatus.ok) return unavailableResult(clientStatus.reason);

  const schoolCode = await resolveSchoolCode(clientStatus.client, params);
  const programIds = await findProgramIdsForMajor(clientStatus.client, {
    majorName: params.majorName,
    programCode: params.programCode,
    schoolCode: schoolCode ?? undefined,
    year: params.year,
  });

  if (!schoolCode && !programIds.length && params.year === undefined) {
    return emptyResult(
      "At least one of schoolName, schoolCode, majorName, or year is required for tuition lookup.",
    );
  }

  let query = clientStatus.client
    .from("tuition_fees")
    .select(
      "id, school_code, program_id, year, min_fee, max_fee, currency, unit, description, note, source_url",
    )
    .order("year", { ascending: false })
    .limit(50);

  if (schoolCode) query = query.eq("school_code", schoolCode);
  if (programIds.length) query = query.in("program_id", programIds);
  if (params.year !== undefined) query = query.eq("year", params.year);

  const { data, error } = await query;
  if (error) return resultFromError("tuition_fees", error);

  const rows = (data ?? []) as TuitionRow[];
  const tuition = await attachProgramAndSchoolToTuition(clientStatus.client, rows);

  return successResult(
    tuition,
    rows.map((row) =>
      sourceFromRow(
        `ZPath tuition: ${row.school_code} ${row.year}`,
        "tuition_fees",
        row,
      ),
    ),
    "No tuition data found in ZPath database.",
  );
}

export async function suggestMajorsByScore(
  params: SuggestMajorsByScoreParams,
): Promise<AdvisorRetrievalResult<ScoreMajorSuggestion>> {
  const clientStatus = getInternalSupabaseClient();
  if (!clientStatus.ok) return unavailableResult(clientStatus.reason);

  if (!Number.isFinite(params.score)) {
    return emptyResult("score must be a finite number.");
  }

  let query = clientStatus.client
    .from("benchmarks")
    .select(
      "id, school_code, program_id, year, method_code, combination_code, score, scale, note, source_url",
    )
    .lte("score", params.score)
    .order("score", { ascending: false })
    .limit(80);

  if (isProvided(params.combination) && params.combination !== "other") {
    query = query.or(
      `combination_code.eq.${params.combination},combination_code.is.null`,
    );
  }

  const { data, error } = await query;
  if (error) return resultFromError("benchmarks", error);

  const rows = (data ?? []) as BenchmarkRow[];
  const benchmarks = await attachProgramAndSchoolToBenchmarks(
    clientStatus.client,
    rows,
  );
  const schoolByCode = await fetchSchoolsByCodes(
    clientStatus.client,
    benchmarks.map((benchmark) => benchmark.schoolCode),
  );
  const normalizedInterest = params.interest ? cleanQuery(params.interest).toLowerCase() : "";
  const region = params.region?.trim();

  const suggestions = benchmarks
    .filter((benchmark) => {
      if (region && region !== "Toàn quốc") {
        const city = schoolByCode.get(benchmark.schoolCode)?.city ?? "";
        if (region === "Miền Bắc" && !/hà nội|hải phòng|bắc|thái|nam định|ninh bình|quảng ninh/i.test(city)) {
          return false;
        }
        if (region === "Miền Trung" && !/huế|đà nẵng|quảng|nghệ|khánh|bình định|phú yên/i.test(city)) {
          return false;
        }
        if (region === "Miền Nam" && !/hồ chí minh|tp.hcm|cần thơ|đồng nai|bình dương|vũng tàu/i.test(city)) {
          return false;
        }
      }

      if (normalizedInterest) {
        const haystack = [
          benchmark.programName,
          benchmark.majorName,
          benchmark.schoolName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedInterest);
      }

      return true;
    })
    .slice(0, 20)
    .map((benchmark) => {
      const school = schoolByCode.get(benchmark.schoolCode);
      return {
        schoolCode: benchmark.schoolCode,
        schoolName: benchmark.schoolName,
        city: school?.city ?? null,
        programId: benchmark.programId,
        programCode: benchmark.programCode,
        programName: benchmark.programName,
        majorName: benchmark.majorName,
        year: benchmark.year,
        methodCode: benchmark.methodCode,
        combinationCode: benchmark.combinationCode,
        benchmarkScore: benchmark.score,
        scoreGap: Number((params.score - benchmark.score).toFixed(2)),
        sourceUrl: benchmark.sourceUrl,
      };
    });

  return successResult(
    suggestions,
    rows.map((row) =>
      sourceFromRow(
        `ZPath benchmark suggestion: ${row.school_code} ${row.year}`,
        "benchmarks",
        row,
      ),
    ),
    "No score-based major suggestions found in ZPath database.",
  );
}
