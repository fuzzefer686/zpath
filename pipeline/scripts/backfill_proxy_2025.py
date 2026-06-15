"""Milestone 2.2 — proxy 2025 major lists into 2026 (frontend tables).

When a school's 2026 đề án is thin/unpublished but we already hold a decent 2025
major list (admission_programs WHERE year=2025, imported earlier from điểm chuẩn /
Pass A), the page should still show its majors. This clones those 2025 programs
into year=2026 so coverage isn't empty, tagging every cloned row
note="pipeline_import_2026 | proxy_2025" for easy rollback.

It is INSERT-ONLY and idempotent: existing (school_code, program_code, 2026) rows
are never overwritten, so a real 2026 crawl later still wins where it has data.

Clones, in FK order:
  1. admission_programs  year 2025 -> 2026   (returns new 2026 program ids)
  2. program_combinations year 2025 -> 2026   (exam blocks, remapped to new ids)
  3. tuition_fees         year 2025 -> 2026   (remapped to new ids)

Scope = schools with verdict "thiếu" in coverage_audit.csv (default), or --codes.

Run from the pipeline root:
  .venv/bin/python scripts/backfill_proxy_2025.py --dry-run
  .venv/bin/python scripts/backfill_proxy_2025.py            # prompts [y/N]
  .venv/bin/python scripts/backfill_proxy_2025.py --yes --codes DCN,DQN
"""

from __future__ import annotations

import argparse
import csv
import sys

import config

AUDIT_CSV = config.PIPELINE_ROOT / "data" / "output" / "coverage_audit.csv"
IMPORT_NOTE = "pipeline_import_2026"
PROXY_NOTE = f"{IMPORT_NOTE} | proxy_2025"
SRC_YEAR, DST_YEAR = 2025, 2026
CHUNK = 200


def get_client():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def fetch_by_in(client, table: str, columns: str, col: str, values: list) -> list[dict]:
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


def scope_codes(codes_arg: str | None) -> list[str]:
    if codes_arg:
        return [c.strip() for c in codes_arg.split(",") if c.strip()]
    if not AUDIT_CSV.is_file():
        config.fail(f"Audit not found: {AUDIT_CSV} — chạy audit_coverage.py trước.")
    with AUDIT_CSV.open(encoding="utf-8-sig", newline="") as f:
        return [r["university_code"] for r in csv.DictReader(f) if r.get("verdict") == "thiếu"]


def confirm(prompt: str) -> bool:
    if "--yes" in sys.argv:
        print(f"{prompt} y (--yes)"); return True
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--codes", type=str, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()

    client = get_client()
    codes = scope_codes(args.codes)
    print(f"Phạm vi proxy: {len(codes)} trường -> {codes}\n")

    # 1) source 2025 programs + existing 2026 programs (to skip dups)
    progs = fetch_by_in(
        client, "admission_programs",
        "id,school_code,program_code,program_name,major_code,major_name,year,"
        "training_type,source_url", "school_code", codes)
    src = [p for p in progs if p["year"] == SRC_YEAR]
    existing_2026 = {(p["school_code"], p["program_code"]) for p in progs if p["year"] == DST_YEAR}

    new_prog_rows, per_school = [], {}
    for p in src:
        kc = (p["school_code"], p["program_code"])
        if kc in existing_2026:
            continue
        new_prog_rows.append({
            "school_code": p["school_code"], "program_code": p["program_code"],
            "program_name": p["program_name"], "major_code": p["major_code"],
            "major_name": p["major_name"], "year": DST_YEAR,
            "training_type": p["training_type"], "source_url": p["source_url"],
            "note": PROXY_NOTE,
        })
        per_school[p["school_code"]] = per_school.get(p["school_code"], 0) + 1

    print("=== [1] admission_programs 2025 -> 2026 (proxy) ===")
    print(f"Sẽ insert: {len(new_prog_rows)} programs cho {len(per_school)} trường")
    for code, n in sorted(per_school.items(), key=lambda x: -x[1]):
        print(f"  {code}: +{n}")

    if args.dry_run:
        print("\n(DRY-RUN) dừng, chưa ghi."); return
    if not confirm(f"\nClone {len(new_prog_rows)} programs sang 2026 (+ methods/"
                   f"combos/tuition)? [y/N] "):
        print("Đã huỷ."); return

    for batch in chunked(new_prog_rows, CHUNK):
        client.table("admission_programs").upsert(
            batch, on_conflict="school_code,program_code,year",
            ignore_duplicates=True).execute()
    print(f"✅ inserted programs 2026 (proxy): {len(new_prog_rows)}.")

    # 1b) admission_methods 2025 -> 2026 (a DB trigger requires a program's
    # combination method to be registered for that school+year, so methods must
    # exist before we copy program_combinations).
    methods = [m for m in fetch_by_in(
        client, "admission_methods",
        "school_code,method_code,method_name,year,is_active,source_url",
        "school_code", codes) if m["year"] == SRC_YEAR]
    method_rows = [{
        "school_code": m["school_code"], "method_code": m["method_code"],
        "method_name": m["method_name"], "year": DST_YEAR,
        "is_active": m.get("is_active", True), "source_url": m["source_url"],
    } for m in methods]
    print(f"\n=== [1b] admission_methods -> 2026: upsert {len(method_rows)} ===")
    for batch in chunked(method_rows, CHUNK):
        client.table("admission_methods").upsert(
            batch, on_conflict="school_code,method_code,year",
            ignore_duplicates=True).execute()

    # rebuild id maps for source(2025) and freshly-created dest(2026)
    progs2 = fetch_by_in(
        client, "admission_programs", "id,school_code,program_code,year",
        "school_code", codes)
    id_2025 = {(p["school_code"], p["program_code"]): p["id"]
               for p in progs2 if p["year"] == SRC_YEAR}
    id_2026 = {(p["school_code"], p["program_code"]): p["id"]
               for p in progs2 if p["year"] == DST_YEAR}
    # Copy child rows for every proxy key (a code present in BOTH years). These
    # keys are the slug codes that only the proxy creates, so real 2026 programs
    # (different codes) are untouched. Computed from the maps, so re-runs that
    # inserted nothing new still (idempotently) backfill missing children.
    src_to_dst = {id_2025[k]: id_2026[k] for k in id_2025 if k in id_2026}

    # 2) program_combinations 2025 -> 2026
    src_ids = list(src_to_dst.keys())
    combos = [c for c in fetch_by_in(
        client, "program_combinations",
        "program_id,combination_code,year,method_code,source_url",
        "program_id", src_ids) if c["year"] == SRC_YEAR]
    combo_rows = [{
        "program_id": src_to_dst[c["program_id"]],
        "combination_code": c["combination_code"], "year": DST_YEAR,
        "method_code": c["method_code"], "source_url": c["source_url"],
    } for c in combos if c["program_id"] in src_to_dst]
    print(f"\n=== [2] program_combinations -> 2026: insert {len(combo_rows)} ===")
    for batch in chunked(combo_rows, CHUNK):
        client.table("program_combinations").upsert(
            batch, on_conflict="program_id,combination_code,year,method_code",
            ignore_duplicates=True).execute()

    # 3) tuition_fees 2025 -> 2026 (insert-only diff; partial unique index)
    fees = [t for t in fetch_by_in(
        client, "tuition_fees",
        "program_id,school_code,year,min_fee,max_fee,currency,unit",
        "program_id", src_ids) if t["year"] == SRC_YEAR]
    existing_fee_keys = {(t["program_id"], t["year"], t["unit"]) for t in fetch_by_in(
        client, "tuition_fees", "program_id,year,unit", "program_id",
        list(src_to_dst.values()))}
    fee_rows = []
    for t in fees:
        if t["program_id"] not in src_to_dst:
            continue
        dst = src_to_dst[t["program_id"]]
        if (dst, DST_YEAR, t["unit"]) in existing_fee_keys:
            continue
        fee_rows.append({
            "program_id": dst, "school_code": t["school_code"], "year": DST_YEAR,
            "min_fee": t["min_fee"], "max_fee": t["max_fee"],
            "currency": t["currency"], "unit": t["unit"], "note": PROXY_NOTE,
        })
    print(f"=== [3] tuition_fees -> 2026: insert {len(fee_rows)} ===")
    for batch in chunked(fee_rows, CHUNK):
        client.table("tuition_fees").insert(batch).execute()

    print(f"\n✅ Proxy 2025->2026 hoàn tất: programs={len(new_prog_rows)}, "
          f"combinations={len(combo_rows)}, tuition={len(fee_rows)}")


if __name__ == "__main__":
    main()
