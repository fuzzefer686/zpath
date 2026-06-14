"""Transform pipeline data (admissions + universities) into the frontend schema.

The pipeline filled the `admissions` (799 rows / 34 schools) and `universities`
tables, but the live zpath.vn frontend reads a different, more normalized set of
tables. This script projects one `admissions` row onto several frontend tables,
in FK-dependency order:

  1. schools              (from universities; null-only update, never overwrite)
  2. admission_programs   (one row per major/program; returns the program UUID)
  3. admission_methods    (one row per school+method+year)
  4. benchmarks           (rows with a score; FK -> admission_programs.id)
  5. program_combinations (one row per exam block; FK -> admission_programs.id)
  6. tuition_fees         (rows with tuition; FK -> admission_programs.id)

The real unique indexes differ from a naive guess, so conflict handling is:
  - schools / admission_programs / admission_methods / program_combinations:
    native upsert on the real composite unique index.
  - benchmarks / tuition_fees: their unique index is PARTIAL + NULLS NOT
    DISTINCT, which PostgREST upsert cannot target (no WHERE predicate). We
    instead diff against existing keys and split into insert / update manually.

Every supporting table that has a `note` column gets `pipeline_import_2026`
stamped on imported rows for easy rollback.

Run from the pipeline root:
  python scripts/transform_to_frontend.py --dry-run   # counts only, no writes
  python scripts/transform_to_frontend.py             # prompts [y/N], then writes
"""

from __future__ import annotations

import argparse
import sys

import config

IMPORT_NOTE = "pipeline_import_2026"
CHUNK = 200

# admission_method code -> human label (admission_methods.method_name is NOT NULL)
METHOD_NAMES = {
    "diem_thi_thpt": "Điểm thi THPT",
    "hoc_ba": "Xét học bạ",
    "dgnl_hn": "Đánh giá năng lực ĐHQG HN",
    "dgnl_hcm": "Đánh giá năng lực ĐHQG HCM",
    "dg_tu_duy": "Đánh giá tư duy",
    "ket_hop": "Kết hợp",
    "xt_rieng": "Xét tuyển riêng",
}

# admissions.program_type -> admission_programs.training_type
TRAINING_TYPE = {
    "chuan": "Chính quy",
    "quoc_te": "Quốc tế",
    "tien_tien": "Tiên tiến",
}


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def get_client():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def fetch_all(client, table: str, columns: str) -> list[dict]:
    out: list[dict] = []
    page = 0
    while True:
        chunk = (client.table(table).select(columns)
                 .range(page * 1000, page * 1000 + 999).execute().data)
        out.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1
    return out


def fetch_by_in(client, table: str, columns: str, col: str, values: list) -> list[dict]:
    """Fetch rows where `col` IN values, batching the IN list to avoid huge URLs."""
    out: list[dict] = []
    for batch in chunked(list(values), 100):
        page = 0
        while True:
            chunk = (client.table(table).select(columns).in_(col, batch)
                     .range(page * 1000, page * 1000 + 999).execute().data)
            out.extend(chunk)
            if len(chunk) < 1000:
                break
            page += 1
    return out


def confirm(prompt: str) -> bool:
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def scale_for(score) -> int:
    s = float(score)
    if s <= 30:
        return 30
    if s <= 150:
        return 150
    return 1000


def prog_key(school_code: str, program_code, year: int) -> tuple:
    return (school_code, program_code, year)


# --------------------------------------------------------------------------- #
# data loading
# --------------------------------------------------------------------------- #
def load_source(client):
    """Return (uni_by_id, admissions joined with university_code)."""
    universities = fetch_all(
        client, "universities", "id,code,name,city,province,university_type,website"
    )
    uni_by_id = {u["id"]: u for u in universities}

    admissions = fetch_all(
        client, "admissions",
        "university_id,school_major_code,major_name,year,admission_method,"
        "exam_blocks,score,program_type,tuition_min,tuition_max,source_url,data_confidence",
    )
    rows = []
    for a in admissions:
        uni = uni_by_id.get(a["university_id"])
        if not uni:  # FK guarantees presence, but stay defensive
            continue
        a = dict(a)
        a["university_code"] = uni["code"]
        rows.append(a)
    return uni_by_id, rows


def build_prog_map(client, scope_codes: list[str], years: list[int]) -> dict[tuple, str]:
    """Map (school_code, program_code, year) -> admission_programs.id (existing rows)."""
    existing = fetch_by_in(
        client, "admission_programs", "id,school_code,program_code,year",
        "school_code", scope_codes,
    )
    return {prog_key(p["school_code"], p["program_code"], p["year"]): p["id"]
            for p in existing if p["year"] in years}


# --------------------------------------------------------------------------- #
# Step 1 — schools (null-only update, never overwrite curated data)
# --------------------------------------------------------------------------- #
def step_schools(client, uni_by_id, admissions, dry_run: bool) -> None:
    scope_ids = {a["university_id"] for a in admissions}
    scope = [uni_by_id[i] for i in scope_ids]
    existing = {s["code"]: s for s in fetch_by_in(
        client, "schools", "id,code,name,slug,english_name,type,city,website,source_url",
        "code", [u["code"] for u in scope])}

    inserts, patches, unchanged = [], [], 0
    # fields we may fill on an existing school (only when currently null)
    patchable = ("type", "city", "website")
    for u in scope:
        code = u["code"]
        desired = {
            "type": u.get("university_type"),
            "city": u.get("province") or u.get("city"),
            "website": u.get("website"),
        }
        if code not in existing:
            inserts.append({
                "code": code,
                "name": u["name"],
                "slug": code.lower(),
                **{k: desired[k] for k in patchable},
            })
        else:
            cur = existing[code]
            patch = {f: desired[f] for f in patchable
                     if cur.get(f) in (None, "") and desired[f] not in (None, "")}
            if patch:
                patches.append((cur["id"], patch))
            else:
                unchanged += 1

    print(f"[1] schools          insert={len(inserts)} update(null-fill)={len(patches)} "
          f"unchanged={unchanged}")
    if dry_run:
        return
    for batch in chunked(inserts, CHUNK):
        client.table("schools").insert(batch).execute()
    for sid, patch in patches:
        client.table("schools").update(patch).eq("id", sid).execute()


# --------------------------------------------------------------------------- #
# Step 2 — admission_programs (native upsert; one row per major/program)
# --------------------------------------------------------------------------- #
def step_programs(client, admissions, dry_run: bool) -> None:
    by_key: dict[tuple, dict] = {}
    for a in admissions:
        key = prog_key(a["university_code"], a["school_major_code"], a["year"])
        by_key.setdefault(key, {
            "school_code": a["university_code"],
            "program_code": a["school_major_code"],
            "program_name": a["major_name"],
            "major_code": a["school_major_code"],
            "major_name": a["major_name"],
            "year": a["year"],
            "training_type": TRAINING_TYPE.get(a["program_type"], a["program_type"]),
            "source_url": a["source_url"],
            "note": IMPORT_NOTE,
        })
    rows = list(by_key.values())

    existing = {prog_key(p["school_code"], p["program_code"], p["year"])
                for p in fetch_by_in(client, "admission_programs",
                                     "school_code,program_code,year", "school_code",
                                     [r["school_code"] for r in rows])}
    n_ins = sum(1 for k in by_key if k not in existing)
    print(f"[2] admission_programs  insert={n_ins} skip(existing)={len(rows) - n_ins} "
          f"(distinct programs={len(rows)})")
    if dry_run:
        return
    # insert-only (DO NOTHING) to protect curated/pre-existing programs
    for batch in chunked(rows, CHUNK):
        client.table("admission_programs").upsert(
            batch, on_conflict="school_code,program_code,year",
            ignore_duplicates=True).execute()


# --------------------------------------------------------------------------- #
# Step 3 — admission_methods (upsert DO NOTHING on existing)
# --------------------------------------------------------------------------- #
def step_methods(client, admissions, dry_run: bool) -> None:
    by_key: dict[tuple, dict] = {}
    for a in admissions:
        code, method, year = a["university_code"], a["admission_method"], a["year"]
        by_key.setdefault((code, method, year), {
            "school_code": code,
            "method_code": method,
            "method_name": METHOD_NAMES.get(method, method),
            "year": year,
            "is_active": True,
            "source_url": a["source_url"],
        })
    rows = list(by_key.values())
    existing = {(m["school_code"], m["method_code"], m["year"])
                for m in fetch_by_in(client, "admission_methods",
                                     "school_code,method_code,year", "school_code",
                                     [r["school_code"] for r in rows])}
    n_ins = sum(1 for k in by_key if k not in existing)
    print(f"[3] admission_methods   insert={n_ins} skip(existing)={len(rows) - n_ins} "
          f"(distinct methods={len(rows)})")
    if dry_run:
        return
    for batch in chunked(rows, CHUNK):
        client.table("admission_methods").upsert(
            batch, on_conflict="school_code,method_code,year",
            ignore_duplicates=True).execute()


# --------------------------------------------------------------------------- #
# diff helper for the PARTIAL-index tables (benchmarks, tuition_fees)
# --------------------------------------------------------------------------- #
def diff_apply(client, table: str, rows: list[dict], key_cols: tuple[str, ...],
               dry_run: bool) -> tuple[int, int]:
    """Insert-only against existing (program_id, ...) keys; never overwrite.

    Existing rows (curated frontend data OR a previous import) are left
    untouched — only keys not already present are inserted. This protects
    curated data and makes re-runs idempotent. Returns (inserted, skipped).
    """
    def key(d):
        return tuple(d.get(c) for c in key_cols)

    program_ids = sorted({r["program_id"] for r in rows if r["program_id"]})
    existing: set[tuple] = set()
    if program_ids:
        sel = ",".join(dict.fromkeys(("program_id",) + key_cols))
        for e in fetch_by_in(client, table, sel, "program_id", program_ids):
            existing.add(key(e))

    inserts = [r for r in rows if key(r) not in existing]
    skipped = len(rows) - len(inserts)

    if not dry_run:
        for batch in chunked(inserts, CHUNK):
            client.table(table).insert(batch).execute()
    return len(inserts), skipped


# --------------------------------------------------------------------------- #
# Step 4 — benchmarks (score not null)
# --------------------------------------------------------------------------- #
def step_benchmarks(client, admissions, prog_map, dry_run: bool) -> None:
    rows, skipped_no_score, skipped_no_prog = [], 0, 0
    seen: set[tuple] = set()
    for a in admissions:
        if a["score"] is None:
            skipped_no_score += 1
            continue
        pk = prog_key(a["university_code"], a["school_major_code"], a["year"])
        pid = prog_map.get(pk)
        if pid is None and not dry_run:
            skipped_no_prog += 1
            continue
        # dry-run has no real UUID yet -> use the natural program key as identity
        ident = pid if pid is not None else pk
        key = (ident, a["year"], a["admission_method"], None)
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            "school_code": a["university_code"],
            "program_id": pid,
            "year": a["year"],
            "method_code": a["admission_method"],
            "combination_code": None,
            "score": a["score"],
            "scale": scale_for(a["score"]),
            "note": IMPORT_NOTE,
            "source_url": a["source_url"],
        })
    ins, skip = diff_apply(
        client, "benchmarks", rows,
        key_cols=("program_id", "year", "method_code", "combination_code"),
        dry_run=dry_run)
    extra = f" no_program={skipped_no_prog}" if skipped_no_prog else ""
    print(f"[4] benchmarks       insert={ins} skip(existing)={skip} "
          f"skip(no_score)={skipped_no_score}{extra}")


# --------------------------------------------------------------------------- #
# Step 5 — program_combinations (one row per exam block)
# --------------------------------------------------------------------------- #
def step_combinations(client, admissions, prog_map, dry_run: bool) -> None:
    by_key: dict[tuple, dict] = {}
    skipped_no_blocks, skipped_no_prog = 0, 0
    for a in admissions:
        blocks = a.get("exam_blocks") or []
        if not blocks:
            skipped_no_blocks += 1
            continue
        pk = prog_key(a["university_code"], a["school_major_code"], a["year"])
        pid = prog_map.get(pk)
        if pid is None and not dry_run:
            skipped_no_prog += 1
            continue
        ident = pid if pid is not None else pk
        for blk in blocks:
            code = str(blk).strip().upper()
            if not code:
                continue
            key = (ident, code, a["year"], a["admission_method"])
            by_key.setdefault(key, {
                "program_id": pid,
                "combination_code": code,
                "year": a["year"],
                "method_code": a["admission_method"],
                "source_url": a["source_url"],
            })
    rows = list(by_key.values())

    program_ids = sorted({r["program_id"] for r in rows if r["program_id"]})
    existing = set()
    if program_ids:
        for c in fetch_by_in(client, "program_combinations",
                             "program_id,combination_code,year,method_code",
                             "program_id", program_ids):
            existing.add((c["program_id"], c["combination_code"], c["year"], c["method_code"]))
    n_ins = sum(1 for k in by_key if k not in existing)
    extra = f" no_program={skipped_no_prog}" if skipped_no_prog else ""
    print(f"[5] program_combinations insert={n_ins} skip(existing)={len(rows) - n_ins} "
          f"skip(no_blocks)={skipped_no_blocks}{extra}")
    if dry_run:
        return
    for batch in chunked(rows, CHUNK):
        client.table("program_combinations").upsert(
            batch, on_conflict="program_id,combination_code,year,method_code",
            ignore_duplicates=True).execute()


# --------------------------------------------------------------------------- #
# Step 6 — tuition_fees (tuition_min or tuition_max not null)
# --------------------------------------------------------------------------- #
def step_tuition(client, admissions, prog_map, dry_run: bool) -> None:
    rows, skipped_no_fee, skipped_no_prog = [], 0, 0
    seen: set[tuple] = set()
    for a in admissions:
        if a["tuition_min"] is None and a["tuition_max"] is None:
            skipped_no_fee += 1
            continue
        pk = prog_key(a["university_code"], a["school_major_code"], a["year"])
        pid = prog_map.get(pk)
        if pid is None and not dry_run:
            skipped_no_prog += 1
            continue
        ident = pid if pid is not None else pk
        key = (ident, a["year"], "triệu/năm")
        if key in seen:
            continue
        seen.add(key)
        rows.append({
            "school_code": a["university_code"],
            "program_id": pid,
            "year": a["year"],
            "min_fee": a["tuition_min"],
            "max_fee": a["tuition_max"],
            "currency": "VND",
            "unit": "triệu/năm",
            "note": f"data_confidence: {a['data_confidence']} | {IMPORT_NOTE}",
            "source_url": a["source_url"],
        })
    ins, skip = diff_apply(
        client, "tuition_fees", rows,
        key_cols=("program_id", "year", "unit"), dry_run=dry_run)
    extra = f" no_program={skipped_no_prog}" if skipped_no_prog else ""
    print(f"[6] tuition_fees     insert={ins} skip(existing)={skip} "
          f"skip(no_fee)={skipped_no_fee}{extra}")


# --------------------------------------------------------------------------- #
def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="chỉ in số rows sẽ insert/update mỗi bảng, KHÔNG ghi")
    args = parser.parse_args()
    client = get_client()

    uni_by_id, admissions = load_source(client)
    scope_codes = sorted({a["university_code"] for a in admissions})
    years = sorted({a["year"] for a in admissions})
    print(f"Nguồn: admissions={len(admissions)} rows | trường={len(scope_codes)} | năm={years}")
    print(f"{'=== DRY-RUN (không ghi) ===' if args.dry_run else '=== GHI THẬT ==='}\n")

    if not args.dry_run:
        if not confirm("Bắt đầu transform & insert vào 6 bảng frontend? [y/N] "):
            print("Đã huỷ."); return
        print()

    steps = [
        ("schools", lambda: step_schools(client, uni_by_id, admissions, args.dry_run)),
        ("admission_programs", lambda: step_programs(client, admissions, args.dry_run)),
    ]
    # Step 1 & 2 first; program ids are needed for steps 4-6.
    try:
        for name, fn in steps:
            fn()
        prog_map = build_prog_map(client, scope_codes, years)
        step_methods(client, admissions, args.dry_run)
        step_benchmarks(client, admissions, prog_map, args.dry_run)
        step_combinations(client, admissions, prog_map, args.dry_run)
        step_tuition(client, admissions, prog_map, args.dry_run)
    except Exception as e:  # noqa: BLE001
        print(f"\n❌ Lỗi — dừng lại, không chạy bước tiếp theo:\n   {str(e)[:300]}")
        sys.exit(1)

    print(f"\n✅ {'DRY-RUN xong (chưa ghi gì).' if args.dry_run else 'Transform hoàn tất.'}")


if __name__ == "__main__":
    main()
