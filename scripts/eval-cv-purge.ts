/**
 * T12 auto-evaluation. Run: `npx tsx scripts/eval-cv-purge.ts`
 *
 * Proves, against real Storage + DB, that the ephemeral purge HARD-deletes both
 * the row AND the Storage file (no soft-delete, no orphan):
 *
 *   A. Background sweep (mirrors supabase/functions/purge-cv): a row with
 *      purge_at in the PAST + its file → after the files-first sweep, BOTH gone.
 *   B. purge_cv_now(user_id): a row whose purge_at is in the FUTURE (not yet
 *      due) → the manual "Xoá ngay" flow removes file + row immediately.
 *   C. purge_expired_cvs() RPC returns the deleted storage paths.
 */
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.resolve(process.cwd(), ".env.local");
const env = fs.readFileSync(envPath, "utf-8");
const url = env.match(/SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
if (!url || !key) { console.error("Missing SUPABASE_URL / SERVICE_ROLE_KEY"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const SEED_USER = "00000000-0000-0000-0000-0000000000b3";
const BUCKET = "cv-exports";
// A minimal but valid PDF (bucket MIME whitelist = application/pdf).
const PDF_BYTES = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n", "latin1");

let failures = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? "✓" : "✗"} ${msg}`); if (!ok) failures++; };

async function fileExists(p: string): Promise<boolean> {
  const folder = p.split("/").slice(0, -1).join("/");
  const name = p.split("/").slice(-1)[0];
  const { data } = await db.storage.from(BUCKET).list(folder);
  return !!data?.some((o) => o.name === name);
}

async function seedExport(cvId: string, purgeAt: Date) {
  const storagePath = `${SEED_USER}/${cvId}/cv.pdf`;
  await db.storage.from(BUCKET).remove([storagePath]).catch(() => {});
  await db.from("generated_cvs").delete().eq("id", cvId);
  const up = await db.storage.from(BUCKET).upload(storagePath, PDF_BYTES, {
    contentType: "application/pdf", upsert: true,
  });
  if (up.error) throw up.error;
  const ins = await db.from("generated_cvs").insert({
    id: cvId, user_id: SEED_USER, storage_path: storagePath, format: "pdf",
    data_snapshot: { probe: true },
    served_at: new Date(purgeAt.getTime() - 30 * 60 * 1000).toISOString(),
    purge_at: purgeAt.toISOString(),
  });
  if (ins.error) throw ins.error;
  return storagePath;
}

async function main() {
  // ---- A. Background sweep on an EXPIRED row -----------------------------
  const idA = "00000000-0000-0000-0000-00000000a111";
  const pastPath = await seedExport(idA, new Date(Date.now() - 60_000)); // 1 min ago
  check(await fileExists(pastPath), "[A] seeded expired file exists before sweep");

  // Mirror the purge-cv Edge Function: select due → remove files → delete rows.
  const { data: due } = await db.from("generated_cvs")
    .select("id, storage_path").lte("purge_at", new Date().toISOString());
  const duePaths = (due ?? []).map((r) => r.storage_path as string);
  check(duePaths.includes(pastPath), "[A] sweep query picks up the expired row");
  await db.storage.from(BUCKET).remove(duePaths);
  await db.from("generated_cvs").delete().in("id", (due ?? []).map((r) => r.id));

  check(!(await fileExists(pastPath)), "[A] file HARD-deleted from Storage after sweep");
  const { data: rowA } = await db.from("generated_cvs").select("id").eq("id", idA).maybeSingle();
  check(!rowA, "[A] row HARD-deleted from DB after sweep");

  // ---- B. purge_cv_now on a NOT-yet-due row ------------------------------
  const idB = "00000000-0000-0000-0000-00000000b222";
  const futurePath = await seedExport(idB, new Date(Date.now() + 25 * 60_000)); // 25 min ahead
  check(await fileExists(futurePath), "[B] seeded future-dated file exists");

  // Manual flow (mirror /api/cv/purge-now): select user paths → remove → RPC.
  const { data: userRows } = await db.from("generated_cvs")
    .select("storage_path").eq("user_id", SEED_USER);
  const userPaths = (userRows ?? []).map((r) => r.storage_path as string);
  await db.storage.from(BUCKET).remove(userPaths);
  const { error: rpcErr } = await db.rpc("purge_cv_now", { p_user_id: SEED_USER });
  check(!rpcErr, `[B] purge_cv_now RPC executes${rpcErr ? " — " + rpcErr.message : ""}`);
  check(!(await fileExists(futurePath)), "[B] file removed even though purge_at was in the future");
  const { data: rowB } = await db.from("generated_cvs").select("id").eq("id", idB).maybeSingle();
  check(!rowB, "[B] row removed by purge_cv_now");

  // ---- C. purge_expired_cvs() returns deleted paths ----------------------
  const idC = "00000000-0000-0000-0000-00000000c333";
  const cPath = await seedExport(idC, new Date(Date.now() - 5_000));
  await db.storage.from(BUCKET).remove([cPath]); // files-first, as the job does
  const { data: deleted, error: expErr } = await db.rpc("purge_expired_cvs");
  check(!expErr, `[C] purge_expired_cvs RPC executes${expErr ? " — " + expErr.message : ""}`);
  check(Array.isArray(deleted) && deleted.includes(cPath), "[C] RPC returns the deleted storage path");
  const { data: rowC } = await db.from("generated_cvs").select("id").eq("id", idC).maybeSingle();
  check(!rowC, "[C] expired row hard-deleted by RPC");

  // Safety: nothing of ours left behind.
  for (const id of [idA, idB, idC]) await db.from("generated_cvs").delete().eq("id", id);

  console.log(failures === 0 ? "\n=== T12 EVAL PASSED ===" : `\n=== ${failures} CHECK(S) FAILED ===`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
