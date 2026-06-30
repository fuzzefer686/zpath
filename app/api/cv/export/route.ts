import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/cv/export — download the owner's own CV as JSON.
//
// This is EXPORT-TO-SELF (the user pulling their own data), NOT a public
// "share"/công bố — so it is intentionally NOT behind the under-16 age gate
// (consistent with /api/cv/render). The data never leaves the owner's session.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

    const { data: doc, error } = await supabaseServer.rpc("get_cv_document", {
      p_user_id: auth.user.id,
    });
    if (error) throw error;
    if (!doc) {
      return NextResponse.json({ error: "Chưa có dữ liệu CV để xuất." }, { status: 400 });
    }

    const filename = `zpath-cv-${auth.user.username || auth.user.id}.json`;
    return new NextResponse(JSON.stringify(doc, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Owner-only artifact — never cache in shared proxies.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/cv/export error:", err);
    return NextResponse.json({ error: "Không thể xuất CV." }, { status: 500 });
  }
}
