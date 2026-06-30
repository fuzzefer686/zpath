// ZPath CV Builder — T12 ephemeral purge job (plan §13.8).
//
// Server-guaranteed background job: HARD-deletes every generated_cvs whose
// purge_at <= now(), removing BOTH the Storage file and the DB row. Runs
// independently of any client — closing the tab does not stop it.
//
// Files-first ordering (crash-safe, no orphans):
//   1. SELECT due rows (id, storage_path)
//   2. storage.remove(paths)   — Storage API, reliable + idempotent
//   3. DELETE the rows by id    — only after their files are gone
// A crash between steps leaves a re-purgeable row, never an orphaned file.
//
// Schedule (run once, post-deploy — keeps the secret out of git):
//   select cron.schedule('purge-cv', '* * * * *', $$
//     select net.http_post(
//       url    := '<PROJECT_URL>/functions/v1/purge-cv',
//       headers:= jsonb_build_object('x-purge-secret', '<CV_PURGE_SECRET>')
//     );
//   $$);
//
// Auth: verify_jwt is disabled (cron has no user JWT); access is gated by the
// CV_PURGE_SECRET shared header instead.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPORT_BUCKET = "cv-exports";
const BATCH = 500;

Deno.serve(async (req: Request) => {
  // Shared-secret gate (no user JWT on a cron invocation).
  const expected = Deno.env.get("CV_PURGE_SECRET");
  if (!expected || req.headers.get("x-purge-secret") !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // 0) Sweep stale rate-limit logs (no files; older than the retention window
    //    are dead weight). Runs every invocation, independent of CV purges.
    let rateLogsPurged = 0;
    const { data: rlPurged, error: rlErr } = await supabase.rpc(
      "purge_old_rate_limit_logs",
    );
    if (rlErr) {
      // Non-fatal: a failed log sweep must not block CV file purges.
      console.error("rate-limit log purge error:", rlErr);
    } else if (typeof rlPurged === "number") {
      rateLogsPurged = rlPurged;
    }

    // 1) Due rows.
    const { data: due, error: selErr } = await supabase
      .from("generated_cvs")
      .select("id, storage_path")
      .lte("purge_at", new Date().toISOString())
      .limit(BATCH);
    if (selErr) throw selErr;

    if (!due || due.length === 0) {
      return Response.json({ purged: 0, files_removed: 0, rate_logs_purged: rateLogsPurged });
    }

    const ids = due.map((r) => r.id as string);
    const paths = due.map((r) => r.storage_path as string).filter(Boolean);

    // 2) Files first (idempotent — already-missing paths don't error).
    let filesRemoved = 0;
    if (paths.length) {
      const { error: rmErr } = await supabase.storage.from(EXPORT_BUCKET).remove(paths);
      if (rmErr) throw rmErr;
      filesRemoved = paths.length;
    }

    // 3) Rows after their files are gone.
    const { error: delErr } = await supabase.from("generated_cvs").delete().in("id", ids);
    if (delErr) throw delErr;

    return Response.json({
      purged: ids.length,
      files_removed: filesRemoved,
      rate_logs_purged: rateLogsPurged,
    });
  } catch (err) {
    console.error("purge-cv error:", err);
    return new Response(JSON.stringify({ error: "purge failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
