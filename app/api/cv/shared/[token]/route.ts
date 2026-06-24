import { NextResponse } from "next/server";

import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

// ---------------------------------------------------------------------------
// GET /api/cv/shared/[token] — PUBLIC read of a shared CV by token.
//
// No auth: the token IS the capability. get_shared_cv (SECURITY DEFINER) checks
// is_active + TTL and returns LIVE data with contact PII (phone/email/address)
// already redacted — RLS is never widened. Missing/revoked/expired → 404.
// ---------------------------------------------------------------------------
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    if (!token || token.length < 32) {
      return NextResponse.json({ error: "Liên kết không hợp lệ." }, { status: 404 });
    }

    const { data, error } = await supabaseServer.rpc("get_shared_cv", { p_token: token });
    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "Liên kết đã hết hạn hoặc không tồn tại." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { document: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("GET /api/cv/shared/[token] error:", err);
    return NextResponse.json({ error: "Không thể tải CV chia sẻ." }, { status: 500 });
  }
}
