import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import {
  listAdmissionConfigs,
  saveAdmissionConfigDraft,
  type AdmissionConfigStatus,
} from "@/src/lib/admission-config/store";

export const runtime = "nodejs";

const VALID_STATUSES: AdmissionConfigStatus[] = [
  "draft",
  "pending_review",
  "published",
  "archived",
];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
  }

  try {
    const statusParam = req.nextUrl.searchParams.get("status");
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as AdmissionConfigStatus)
        ? (statusParam as AdmissionConfigStatus)
        : undefined;

    const configs = await listAdmissionConfigs(status);
    return NextResponse.json({ ok: true, configs });
  } catch (error) {
    console.error("List admission configs error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách cấu hình." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
  }

  let body: {
    id?: unknown;
    config?: unknown;
    sourcePdfUrl?: unknown;
    sourcePdfPath?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  if (typeof body.config !== "object" || body.config === null) {
    return NextResponse.json({ error: "Thiếu trường config." }, { status: 400 });
  }

  try {
    const record = await saveAdmissionConfigDraft({
      id: typeof body.id === "string" ? body.id : undefined,
      config: body.config as Parameters<
        typeof saveAdmissionConfigDraft
      >[0]["config"],
      sourcePdfUrl:
        typeof body.sourcePdfUrl === "string" ? body.sourcePdfUrl : undefined,
      sourcePdfPath:
        typeof body.sourcePdfPath === "string" ? body.sourcePdfPath : undefined,
      createdBy: auth.user.username ?? auth.user.email ?? auth.user.id,
    });

    return NextResponse.json({ ok: true, config: record });
  } catch (error) {
    console.error("Save admission config error:", error);
    const message =
      error instanceof Error ? error.message : "Không thể lưu cấu hình.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
