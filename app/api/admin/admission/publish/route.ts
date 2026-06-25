import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import {
  publishAdmissionConfig,
  setAdmissionConfigStatus,
} from "@/src/lib/admission-config/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) {
    return NextResponse.json({ error: "Bạn không có quyền admin." }, { status: 403 });
  }

  let body: { id?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body phải là JSON hợp lệ." }, { status: 400 });
  }

  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Thiếu id cấu hình." }, { status: 400 });
  }

  const reviewer = auth.user.username ?? auth.user.email ?? auth.user.id;
  const action = body.action === "unpublish" ? "unpublish" : "publish";

  try {
    if (action === "unpublish") {
      const record = await setAdmissionConfigStatus({
        id: body.id,
        status: "archived",
        reviewedBy: reviewer,
      });
      return NextResponse.json({ ok: true, config: record });
    }

    const record = await publishAdmissionConfig({ id: body.id, reviewedBy: reviewer });
    return NextResponse.json({ ok: true, config: record });
  } catch (error) {
    console.error("Publish admission config error:", error);
    const message =
      error instanceof Error ? error.message : "Không thể phê duyệt cấu hình.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
