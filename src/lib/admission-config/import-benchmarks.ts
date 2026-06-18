import "server-only";

import { createSchoolSlug } from "@/lib/school-slug";
import { supabaseServer } from "@/src/lib/db/supabaseServer";
import {
  parseBenchmarkCsvRows,
  type CsvBenchmarkRow,
} from "./parse-benchmark-csv";

export type { CsvBenchmarkRow };

export type ImportBenchmarksInput = {
  schoolCode: string;
  schoolName?: string;
  csvText: string;
  /** Links program_code to admission_programs.year when CSV omits program_year. */
  admissionYear: number;
  /** Default benchmark year when CSV omits year column. */
  defaultBenchmarkYear?: number;
};

export type ImportBenchmarksResult = {
  imported: number;
  updated: number;
  skipped: Array<{ line: number; reason: string }>;
};

export { parseBenchmarkCsvRows };

async function ensureSchoolExists(schoolCode: string, schoolName?: string) {
  const { data: existing, error: lookupError } = await supabaseServer
    .from("schools")
    .select("code")
    .eq("code", schoolCode)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Không thể kiểm tra trường "${schoolCode}": ${lookupError.message}`);
  }

  if (existing) return;

  const name = schoolName?.trim() || schoolCode;
  const { error: insertError } = await supabaseServer.from("schools").insert({
    code: schoolCode,
    name,
    slug: createSchoolSlug(name),
  });

  if (insertError) {
    throw new Error(`Không thể tạo trường "${schoolCode}": ${insertError.message}`);
  }
}

async function findProgramId(
  schoolCode: string,
  programCode: string,
  programYear: number,
): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from("admission_programs")
    .select("id")
    .eq("school_code", schoolCode)
    .eq("program_code", programCode)
    .eq("year", programYear)
    .maybeSingle();

  if (error) {
    throw new Error(`Không thể tra chương trình "${programCode}": ${error.message}`);
  }

  return data?.id ?? null;
}

async function upsertBenchmarkRow({
  schoolCode,
  programId,
  row,
}: {
  schoolCode: string;
  programId: string;
  row: CsvBenchmarkRow;
}): Promise<"inserted" | "updated"> {
  let query = supabaseServer
    .from("benchmarks")
    .select("id")
    .eq("program_id", programId)
    .eq("year", row.benchmarkYear)
    .eq("method_code", row.methodCode);

  query =
    row.combinationCode === null
      ? query.is("combination_code", null)
      : query.eq("combination_code", row.combinationCode);

  const { data: existing, error: lookupError } = await query.maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const payload = {
    school_code: schoolCode,
    program_id: programId,
    year: row.benchmarkYear,
    method_code: row.methodCode,
    combination_code: row.combinationCode,
    score: row.score,
    scale: row.scale,
  };

  if (existing?.id) {
    const { error: updateError } = await supabaseServer
      .from("benchmarks")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return "updated";
  }

  const { error: insertError } = await supabaseServer.from("benchmarks").insert(payload);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return "inserted";
}

export async function importBenchmarksFromCsv(
  input: ImportBenchmarksInput,
): Promise<ImportBenchmarksResult> {
  const schoolCode = input.schoolCode.toUpperCase();
  const defaultBenchmarkYear =
    input.defaultBenchmarkYear ?? input.admissionYear - 1;

  const { rows, errors: parseErrors } = parseBenchmarkCsvRows(
    input.csvText,
    input.admissionYear,
    defaultBenchmarkYear,
  );

  if (!rows.length && parseErrors.length) {
    return { imported: 0, updated: 0, skipped: parseErrors };
  }

  if (!rows.length) {
    throw new Error("CSV không có dòng hợp lệ.");
  }

  await ensureSchoolExists(schoolCode, input.schoolName);

  let imported = 0;
  let updated = 0;
  const skipped = [...parseErrors];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const line = index + 2;

    try {
      const programId = await findProgramId(
        schoolCode,
        row.programCode,
        row.programYear,
      );

      if (!programId) {
        skipped.push({
          line,
          reason: `Không tìm thấy chương trình ${row.programCode} (năm CT ${row.programYear}). Hãy import CSV chương trình trước.`,
        });
        continue;
      }

      const action = await upsertBenchmarkRow({ schoolCode, programId, row });
      if (action === "inserted") imported += 1;
      else updated += 1;
    } catch (error) {
      skipped.push({
        line,
        reason: error instanceof Error ? error.message : "Lỗi không xác định.",
      });
    }
  }

  return { imported, updated, skipped };
}
