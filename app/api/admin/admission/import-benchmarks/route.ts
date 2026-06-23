import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { importBenchmarksFromCsv } from "@/src/lib/admission-config/import-benchmarks";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "Bạn không có quyền admin." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const schoolCode =
    typeof record.schoolCode === "string" ? record.schoolCode.toUpperCase() : "";
  const schoolName =
    typeof record.schoolName === "string" ? record.schoolName : undefined;
  const csvText = typeof record.csvText === "string" ? record.csvText : "";
  const admissionYear =
    typeof record.admissionYear === "number" && Number.isInteger(record.admissionYear)
      ? record.admissionYear
      : typeof record.year === "number" && Number.isInteger(record.year)
        ? record.year
        : new Date().getFullYear();
  const defaultBenchmarkYear =
    typeof record.defaultBenchmarkYear === "number" &&
    Number.isInteger(record.defaultBenchmarkYear)
      ? record.defaultBenchmarkYear
      : admissionYear - 1;

  if (!schoolCode || !csvText.trim()) {
    return NextResponse.json(
      { ok: false, error: "schoolCode và csvText là bắt buộc." },
      { status: 400 },
    );
  }

  try {
    const result = await importBenchmarksFromCsv({
      schoolCode,
      schoolName,
      csvText,
      admissionYear,
      defaultBenchmarkYear,
    });

    if (result.imported === 0 && result.updated === 0 && result.skipped.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Không import được dòng nào.",
          data: result,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Import thất bại.",
      },
      { status: 500 },
    );
  }
}
