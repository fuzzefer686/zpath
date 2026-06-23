import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { extractAdmissionConfigFromPdf } from "@/src/lib/admission-config/extract";
import { uploadAdmissionPdf } from "@/src/lib/admission-config/pdf-storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MiB

function parseYear(value: FormDataEntryValue | null): number {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Năm tuyển sinh không hợp lệ.");
  }
  return year;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Yêu cầu phải là multipart/form-data chứa file PDF." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file PDF." }, { status: 400 });
  }

  if (file.type && file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Chỉ chấp nhận file PDF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: "File PDF vượt quá 20MB." },
      { status: 400 },
    );
  }

  const schoolCode = String(formData.get("schoolCode") ?? "").trim();
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const extraContext = String(formData.get("extraContext") ?? "").trim();
  if (!schoolCode) {
    return NextResponse.json(
      { error: "Vui lòng nhập mã trường (schoolCode)." },
      { status: 400 },
    );
  }

  let year: number;
  try {
    year = parseYear(formData.get("year"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Năm không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const pdfBase64 = bytes.toString("base64");

    const upload = await uploadAdmissionPdf({
      schoolCode,
      year,
      bytes,
      originalName: file.name,
    });

    const extraction = await extractAdmissionConfigFromPdf({
      pdfBase64,
      schoolCode,
      schoolName: schoolName || undefined,
      year,
      extraContext: extraContext || undefined,
    });

    return NextResponse.json({
      ok: true,
      draft: extraction.draft,
      valid: extraction.valid,
      warnings: extraction.warnings,
      sourcePdfUrl: upload.signedUrl,
      sourcePdfPath: upload.path,
    });
  } catch (error) {
    console.error("Admission extract error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Không thể trích xuất cấu hình từ PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
