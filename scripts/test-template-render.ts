/**
 * Task 2A verification — template layout_config now drives the rendered PDF.
 *
 * Proves:
 *   1. normalizeLayoutConfig maps legacy/non-VN fonts onto VN-capable families
 *      and clamps invalid values to safe defaults (pure, no DB).
 *   2. Rendering the SAME profile with `basic` vs `modern` yields two PDFs that
 *      differ in embedded font (NotoSans vs NotoSerif) and theme colour.
 *   3. Both PDFs embed a Vietnamese-capable Noto font (diacritics safe).
 *   4. The built-in "default" path still renders (backward compatible).
 *
 * Run: `npx tsx scripts/test-template-render.ts`
 */
import * as fs from "fs";
import * as path from "path";

// --- env (mirror eval-cv-render.ts): load into process.env BEFORE supabaseServer
//     is touched (the renderer lazily imports it for non-default templates). -----
const envPath = path.resolve(process.cwd(), ".env.local");
const envRaw = fs.readFileSync(envPath, "utf-8");
function envVal(key: string) {
  return envRaw.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
}
process.env.SUPABASE_URL ||= envVal("SUPABASE_URL");
process.env.SUPABASE_SERVICE_ROLE_KEY ||= envVal("SUPABASE_SERVICE_ROLE_KEY");

import { createClient } from "@supabase/supabase-js";
import { ReactPdfRenderer } from "../lib/cv/renderer/reactPdf";
import { normalizeLayoutConfig, DEFAULT_LAYOUT } from "../lib/cv/renderer/layoutConfig";
import type { CVDocument } from "../lib/cv/types";

const SEED_USER = "00000000-0000-0000-0000-0000000000b3"; // student_ielts (Trần Thị Mai Chi — full diacritics)
let failures = 0;
function check(ok: boolean, msg: string) {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) failures++;
}

async function main() {
  // 1) Pure normalisation — legacy/invalid configs degrade safely. -------------
  check(normalizeLayoutConfig({ fontFamily: "Inter" }).fontFamily === "NotoSans", "legacy font 'Inter' → NotoSans");
  check(normalizeLayoutConfig({ fontFamily: "Outfit" }).fontFamily === "NotoSerif", "legacy font 'Outfit' → NotoSerif");
  check(normalizeLayoutConfig({ fontFamily: "Comic Sans" }).fontFamily === "NotoSans", "unknown font → default NotoSans");
  check(normalizeLayoutConfig({ themeColor: "not-a-color" }).themeColor === DEFAULT_LAYOUT.themeColor, "invalid themeColor → default");
  check(normalizeLayoutConfig({ fontScale: 99 }).fontScale === 1, "out-of-range fontScale → default 1");
  check(normalizeLayoutConfig({ themeColor: "#059669" }).themeColor === "#059669", "valid themeColor preserved");

  // 2) Render the same profile with two templates. ----------------------------
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: doc, error } = await db.rpc("get_cv_document", { p_user_id: SEED_USER });
  if (error) throw error;
  check(!!doc, "get_cv_document returned a CVDocument");
  const cv = doc as CVDocument;

  const renderer = new ReactPdfRenderer();
  const basic = Buffer.from(await renderer.render(cv, "basic"));
  const modern = Buffer.from(await renderer.render(cv, "modern"));
  const def = Buffer.from(await renderer.render(cv, "default"));

  const outDir = "/tmp";
  fs.writeFileSync(path.join(outDir, "zpath-cv-basic.pdf"), basic);
  fs.writeFileSync(path.join(outDir, "zpath-cv-modern.pdf"), modern);
  console.log(`  → wrote ${outDir}/zpath-cv-basic.pdf and zpath-cv-modern.pdf (open to eyeball)`);

  const basicStr = basic.toString("latin1");
  const modernStr = modern.toString("latin1");
  const defStr = def.toString("latin1");

  check(basic.slice(0, 5).toString() === "%PDF-" && modern.slice(0, 5).toString() === "%PDF-", "both outputs are valid PDFs");

  // 3) Fonts differ → templates render differently; both VN-capable. ----------
  const basicUsesSans = /NotoSans/.test(basicStr);
  const modernUsesSerif = /NotoSerif/.test(modernStr);
  check(basicUsesSans, "basic embeds NotoSans (sans, VN-capable)");
  check(modernUsesSerif, "modern embeds NotoSerif (serif, VN-capable)");
  check(basicUsesSans && modernUsesSerif && basicStr !== modernStr, "basic vs modern are visibly different PDFs (font + theme)");
  check(/NotoSans|NotoSerif/.test(defStr), "default template still renders with a VN-capable Noto font");

  // 4) Content parity by construction: identical CVDocument input, only layout
  //    differs. Sanity-check both are non-trivial (full 6-block profile). ------
  check(basic.length > 3000 && modern.length > 3000, `both PDFs non-trivial (basic ${(basic.length / 1024).toFixed(1)}KB, modern ${(modern.length / 1024).toFixed(1)}KB)`);

  console.log(failures === 0 ? "\n=== TASK 2A RENDER TEST PASSED ===" : `\n=== ${failures} CHECK(S) FAILED ===`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
