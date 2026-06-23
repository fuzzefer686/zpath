import { NextResponse } from "next/server";

import {
  CertificateConverterService,
  parseCertificateConverterRequest,
} from "@/src/lib/certificate-converter";

export const runtime = "nodejs";

const service = new CertificateConverterService();

export async function GET() {
  try {
    const schools = await service.listSchools();
    return NextResponse.json({ ok: true, data: { schools } });
  } catch (error) {
    console.error("Cannot load converter schools:", error);
    return NextResponse.json(
      { ok: false, error: "Không thể tải danh sách trường." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body phải là JSON hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const parsed = parseCertificateConverterRequest(body);
    const output = await service.convert(parsed);
    return NextResponse.json({ ok: true, data: output });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể thực hiện quy đổi chứng chỉ.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
