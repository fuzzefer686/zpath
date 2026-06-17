"""Backfill tuition_fees DIRECTLY against admission_programs.

The admissions -> transform path can only set fees on programs that have an
admissions row. Batch-1 schools have many more admission_programs rows than
admissions rows (DCN 66 vs 4), so their extra programs never get a fee that way.

This matches the crawled 2026 tuition (data/output/tuition_2026_results) onto
admission_programs (year 2026) that have NO tuition_fees row yet, and inserts one:
  - per-major fee by major_code, else core-normalized major_name/program_name
    (with grouped-list expansion), reusing apply_tuition's matchers;
  - school_wide range as fallback, same accuracy guard (BAD_SCHOOL_WIDE + ratio).
Stored like the pipeline rows: min_fee/max_fee in TRIỆU, currency VND, unit triệu/năm.
Idempotent: never touches a program that already has a fee.

Run from the pipeline root:
  .venv/bin/python scripts/apply_tuition_direct.py --dry-run
  .venv/bin/python scripts/apply_tuition_direct.py --yes
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict

import config
from apply_tuition import (RESULTS_DIR, BAD_SCHOOL_WIDE, MAX_SW_RATIO,
                           core_norm, expand_tuition_names, _num)

TARGET_YEAR = 2026
INSERT_CHUNK = 200


def get_client():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


def fetch_all(client, table: str, columns: str) -> list[dict]:
    out, page = [], 0
    while True:
        chunk = (client.table(table).select(columns)
                 .range(page * 1000, page * 1000 + 999).execute().data)
        out.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1
    return out


def confirm(prompt: str) -> bool:
    if "--yes" in sys.argv:
        print(f"{prompt} y (--yes)"); return True
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def school_tuition_maps():
    """code -> (by_code, by_name, sw_fee, source_url)."""
    maps: dict[str, tuple] = {}
    for jf in sorted(RESULTS_DIR.glob("*.json")):
        fj = json.loads(jf.read_text(encoding="utf-8"))
        code = fj["university_code"]
        by_code, by_name = {}, {}
        for rec in fj.get("data") or []:
            tmin, tmax = _num(rec.get("tuition_min")), _num(rec.get("tuition_max"))
            if tmin is None and tmax is None:
                continue
            fee = (tmin, tmax if tmax is not None else tmin)
            if rec.get("school_major_code"):
                by_code[str(rec["school_major_code"]).strip()] = fee
            for nm in expand_tuition_names(rec.get("major_name") or ""):
                k = core_norm(nm)
                if k and k not in by_name:
                    by_name[k] = fee
        sw = fj.get("school_wide") or {}
        sw_fee = None
        if _num(sw.get("tuition_min")) is not None and code not in BAD_SCHOOL_WIDE:
            smin = _num(sw["tuition_min"])
            smax = _num(sw.get("tuition_max")) if _num(sw.get("tuition_max")) is not None else smin
            if smin and smin > 0 and (smax / smin) <= MAX_SW_RATIO:
                sw_fee = (smin, smax)
            elif smin == 0 and smax == 0:
                sw_fee = (0, 0)
        maps[code] = (by_code, by_name, sw_fee, fj.get("found_url") or "")
    return maps


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--codes", type=str, default=None)
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    only = ({c.strip() for c in args.codes.split(",") if c.strip()} if args.codes else None)

    client = get_client()
    maps = school_tuition_maps()
    have_fee = {t["program_id"] for t in fetch_all(client, "tuition_fees", "program_id")}
    programs = [p for p in fetch_all(
        client, "admission_programs",
        "id,school_code,program_name,major_name,major_code,year") if p.get("year") == TARGET_YEAR]

    new_rows: list[dict] = []
    per_school = defaultdict(lambda: [0, 0])  # code -> [major, school_wide]
    for p in programs:
        code = (p.get("school_code") or "").strip()
        if (only and code not in only) or p["id"] in have_fee or code not in maps:
            continue
        by_code, by_name, sw_fee, src = maps[code]
        fee = by_code.get((p.get("major_code") or "").strip()) \
            or by_name.get(core_norm(p.get("major_name") or "")) \
            or by_name.get(core_norm(p.get("program_name") or ""))
        via = "major"
        if not fee and sw_fee:
            fee, via = sw_fee, "wide"
        if not fee:
            continue
        new_rows.append({
            "school_code": code, "program_id": p["id"], "year": TARGET_YEAR,
            "min_fee": fee[0], "max_fee": fee[1], "currency": "VND",
            "unit": "triệu/năm", "source_url": src,
        })
        per_school[code][0 if via == "major" else 1] += 1

    print(f"=== DIRECT tuition_fees backfill ({len(new_rows)} rows, {len(per_school)} trường) ===")
    for code in sorted(per_school):
        m, w = per_school[code]
        print(f"  {code:6} per-major={m:>3}  school_wide={w:>3}")
    if args.dry_run:
        print("\n(DRY-RUN) chưa ghi."); return
    if not new_rows:
        print("Không có gì để ghi."); return
    if not confirm(f"\nInsert {len(new_rows)} tuition_fees? [y/N] "):
        print("Đã huỷ."); return

    inserted = 0
    for i in range(0, len(new_rows), INSERT_CHUNK):
        chunk = new_rows[i:i + INSERT_CHUNK]
        client.table("tuition_fees").insert(chunk).execute()
        inserted += len(chunk)
        print(f"  inserted {inserted}/{len(new_rows)}...")
    print(f"\n✅ inserted {inserted} tuition_fees.")


if __name__ == "__main__":
    main()
