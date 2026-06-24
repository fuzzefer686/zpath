import { NextResponse } from "next/server";

import { getAuthContext } from "@/lib/zpath-auth";
import { supabaseServer } from "@/src/lib/db/supabaseServer";

// Manual "Xoá ngay" — hard-delete the authenticated user's exported CVs now,
// independent of the 30-minute background sweep. Files-first ordering keeps it
// crash-safe: a failure after removing files leaves a re-purgeable row, never
// an orphaned file.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_BUCKET = "cv-exports";

export async function POST() {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }
    const userId = auth.user.id;

    // 1) Collect this user's export paths.
    const { data: rows, error: selErr } = await supabaseServer
      .from("generated_cvs")
      .select("storage_path")
      .eq("user_id", userId);
    if (selErr) throw selErr;

    const paths = (rows ?? []).map((r) => r.storage_path as string).filter(Boolean);

    // 2) Remove the files first (idempotent).
    if (paths.length) {
      const { error: rmErr } = await supabaseServer.storage.from(EXPORT_BUCKET).remove(paths);
      if (rmErr) throw rmErr;
    }

    // 3) Hard-delete the rows via the RPC (DB authoritative).
    const { error: rpcErr } = await supabaseServer.rpc("purge_cv_now", { p_user_id: userId });
    if (rpcErr) throw rpcErr;

    return NextResponse.json({ success: true, purged: paths.length });
  } catch (error) {
    console.error("POST /api/cv/purge-now error:", error);
    return NextResponse.json(
      { error: "Không thể xoá CV. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
