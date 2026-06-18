import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { uploadAdmissionPdf } from "@/src/lib/admission-config/pdf-storage";
import { buildSourceBundle } from "@/src/lib/admission-config/sources/buildSourceBundle";
import { fetchAdmissionSources } from "@/src/lib/admission-config/sources/fetchAdmissionSources";
import { synthesizeAdmissionConfig } from "@/src/lib/admission-config/sources/synthesizeAdmissionConfig";
import type { AdmissionSourceInput } from "@/src/lib/admission-config/sources/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type GenerateRequestBody = {
  schoolCode?: unknown;
  schoolName?: unknown;
  year?: unknown;
  sources?: unknown;
};

function parseYear(value: unknown): number {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Năm tuyển sinh không hợp lệ.");
  }
  return year;
}

function parseSources(rawSources: unknown): AdmissionSourceInput[] {
  if (!Array.isArray(rawSources)) {
    throw new Error("sources phải là mảng.");
  }

  const normalized: AdmissionSourceInput[] = [];

  for (const item of rawSources) {
    if (typeof item !== "object" || item === null) continue;
    const source = item as Record<string, unknown>;
    const type = source.type;
    if (type !== "url" && type !== "file_url" && type !== "text") continue;

    const value = String(source.value ?? "").trim();
    if (!value) continue;

    const normalizedItem: AdmissionSourceInput = {
      type,
      value,
      role: source.role === "primary" ? "primary" : "supplement",
    };

    if (typeof source.label === "string" && source.label.trim()) {
      normalizedItem.label = source.label.trim();
    }

    normalized.push(normalizedItem);
  }

  if (!normalized.length) {
    throw new Error("Cần ít nhất một nguồn dữ liệu hợp lệ.");
  }

  return normalized;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
  }

  let body: GenerateRequestBody;
  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  const schoolCode = String(body.schoolCode ?? "").trim().toUpperCase();
  const schoolName = String(body.schoolName ?? "").trim();
  if (!schoolCode) {
    return NextResponse.json(
      { error: "Vui lòng nhập mã trường (schoolCode)." },
      { status: 400 },
    );
  }
  if (!schoolName) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên trường (schoolName)." },
      { status: 400 },
    );
  }

  let year: number;
  let sources: AdmissionSourceInput[];
  try {
    year = parseYear(body.year);
    sources = parseSources(body.sources);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Input không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const fetchedResult = await fetchAdmissionSources(sources);
    if (!fetchedResult.fetched.length) {
      return NextResponse.json(
        {
          error: "Không đọc được nguồn nào hợp lệ để phân tích.",
          sourceReport: fetchedResult.report,
          warnings: fetchedResult.warnings,
        },
        { status: 400 },
      );
    }

    const sourceBundle = buildSourceBundle(fetchedResult.fetched);
    const extraction = await synthesizeAdmissionConfig({
      schoolCode,
      schoolName,
      year,
      sourceBundle,
    });

    let primaryPdfUrl: string | null = null;
    let primaryPdfPath: string | null = null;
    if (sourceBundle.primaryPdf) {
      const upload = await uploadAdmissionPdf({
        schoolCode,
        year,
        bytes: sourceBundle.primaryPdf.bytes,
        originalName: sourceBundle.primaryPdf.originalName,
      });
      primaryPdfUrl = upload.signedUrl;
      primaryPdfPath = upload.path;
    }

    return NextResponse.json({
      ok: true,
      draft: extraction.draft,
      valid: extraction.valid,
      warnings: [...fetchedResult.warnings, ...extraction.warnings],
      sourceReport: fetchedResult.report,
      primaryPdfUrl,
      primaryPdfPath,
    });
  } catch (error) {
    console.error("Admission generate error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Không thể sinh cấu hình từ các nguồn đã cung cấp.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
