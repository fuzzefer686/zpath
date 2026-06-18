import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

type CsvProgramRow = {
  program_code: string;
  program_name: string;
  major_code?: string | null;
  major_name?: string | null;
  year: number;
};

function parseCsvPrograms(csvText: string, defaultYear: number): CsvProgramRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const header = lines[0].split(",").map((cell) => cell.trim().toLowerCase());
  const rows = lines.slice(1);

  return rows.map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = cells[index] ?? "";
    });

    const year = Number.parseInt(record.year ?? "", 10);

    return {
      program_code: record.program_code ?? record.programcode ?? "",
      program_name: record.program_name ?? record.programname ?? "",
      major_code: record.major_code || null,
      major_name: record.major_name || null,
      year: Number.isInteger(year) ? year : defaultYear,
    };
  }).filter((row) => row.program_code && row.program_name);
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const schoolCode = typeof record.schoolCode === "string" ? record.schoolCode.toUpperCase() : "";
  const csvText = typeof record.csvText === "string" ? record.csvText : "";
  const defaultYear =
    typeof record.year === "number" && Number.isInteger(record.year)
      ? record.year
      : new Date().getFullYear();

  if (!schoolCode || !csvText.trim()) {
    return NextResponse.json(
      { ok: false, error: "schoolCode and csvText are required." },
      { status: 400 },
    );
  }

  const rows = parseCsvPrograms(csvText, defaultYear);
  if (!rows.length) {
    return NextResponse.json(
      { ok: false, error: "CSV không có dòng hợp lệ." },
      { status: 400 },
    );
  }

  const payload = rows.map((row) => ({
    school_code: schoolCode,
    program_code: row.program_code,
    program_name: row.program_name,
    major_code: row.major_code,
    major_name: row.major_name,
    year: row.year,
  }));

  const { data, error } = await supabaseServer
    .from("admission_programs")
    .insert(payload)
    .select("id, program_code, program_name");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      imported: data?.length ?? 0,
      programs: data ?? [],
    },
  });
}
