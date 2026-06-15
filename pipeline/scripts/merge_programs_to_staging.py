"""Milestone 2.3 — load crawled 2026 major lists into admissions_staging.

Reads data/output/programs_2026_results/*.json (from crawl_programs_2026.py) and
maps each major onto the admissions_staging schema, then previews and (after
confirm) inserts. Mirrors merge_diemchuan_to_staging, with these differences:

  - year is forced to 2026 (the coverage target). When a file's data came from a
    2025 listing (data_year == 2025), it is used as a PROXY for 2026 and tagged
    note="proxy_2025" + raw_extracted_json._source_year so it can be told apart.
  - records carry no score (these are programs, not benchmarks); they qualify for
    promote via exam_blocks / tuition_min, or with --include-partial as name-only.
  - school_major_code: prefer the source code; else a stable slug ("P26-..."),
    so promote (NOT NULL) keeps the row and re-runs dedupe.

Run from the pipeline root:
  .venv/bin/python scripts/merge_programs_to_staging.py            # prompts [y/N]
  .venv/bin/python scripts/merge_programs_to_staging.py --yes
  .venv/bin/python scripts/merge_programs_to_staging.py --codes BVH,CTS
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter

import config
from merge_diemchuan_to_staging import parse_blocks, CURATED_SKIP, VALID_METHODS

RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "programs_2026_results"
TARGET_YEAR = 2026
INSERT_CHUNK = 200


def slugcode(major_name: str, code) -> str:
    """Use the source major code if present; else a stable slug from the name."""
    code = (str(code).strip() if code not in (None, "") else "")
    if code:
        return code[:60]
    norm = unicodedata.normalize("NFKD", major_name or "")
    ascii_only = norm.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^A-Za-z0-9]+", "-", ascii_only).strip("-").upper()
    return f"P26-{slug[:40]}" if slug else "P26-NA"


def _num(v):
    return v if isinstance(v, (int, float)) else None


def map_record(code: str, name: str, rec: dict, data_year: int, src: str | None) -> dict | None:
    major_name = (rec.get("major_name") or "").strip()
    if not major_name:
        return None
    method = rec.get("admission_method")
    if method not in VALID_METHODS:
        method = "diem_thi_thpt"
    is_proxy = data_year != TARGET_YEAR
    return {
        "university_code": code,
        "university_name": name,
        "school_major_code": slugcode(major_name, rec.get("school_major_code")),
        "major_name": major_name,
        "year": TARGET_YEAR,  # always target 2026 (proxy from 2025 if needed)
        "admission_method": method,
        "exam_blocks": parse_blocks(rec.get("combination_code")),
        "score": None,
        "program_type": None,
        "tuition_min": _num(rec.get("tuition_min")),
        "tuition_max": _num(rec.get("tuition_max")),
        "source_url": rec.get("source_url") or src,
        "raw_extracted_json": {**rec, "_pass": "programs_2026", "_source_year": data_year},
        "review_status": "pending",
    }


def load_rows(wanted: set[str] | None) -> tuple[list[dict], Counter, Counter]:
    if not RESULTS_DIR.is_dir():
        config.fail(f"Results not found: {RESULTS_DIR}")
    rows: list[dict] = []
    per_school: Counter = Counter()
    proxy_school: Counter = Counter()
    for jf in sorted(RESULTS_DIR.glob("*.json")):
        fj = json.loads(jf.read_text(encoding="utf-8"))
        code = fj["university_code"]
        if code in CURATED_SKIP or (wanted and code not in wanted):
            continue
        name = fj.get("university_name", code)
        src = fj.get("found_url")
        data_year = int(fj.get("data_year") or TARGET_YEAR)
        for rec in fj.get("data") or []:
            rec.setdefault("source_url", src)
            row = map_record(code, name, rec, data_year, src)
            if row:
                rows.append(row)
                per_school[code] += 1
                if data_year != TARGET_YEAR:
                    proxy_school[code] += 1
    return rows, per_school, proxy_school


def confirm(prompt: str) -> bool:
    import sys
    if "--yes" in sys.argv:
        print(f"{prompt} y (--yes)"); return True
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--codes", type=str, default=None, help="chỉ các mã trường, vd BVH,CTS")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    wanted = ({c.strip() for c in args.codes.split(",") if c.strip()} if args.codes else None)

    rows, per_school, proxy_school = load_rows(wanted)
    print("=== PREVIEW: chương trình 2026 -> admissions_staging ===")
    print(f"Tổng record: {len(rows)} | trường: {len(per_school)}")
    for code, n in sorted(per_school.items(), key=lambda x: -x[1]):
        tag = f"  (proxy 2025: {proxy_school[code]})" if proxy_school.get(code) else ""
        print(f"  {code}: {n}{tag}")
    no_blocks = sum(1 for r in rows if not r["exam_blocks"])
    with_tuition = sum(1 for r in rows if r["tuition_min"] is not None)
    print(f"\nrecord không có tổ hợp (exam_blocks null): {no_blocks} | có học phí: {with_tuition}")
    if not rows:
        print("Không có record để insert."); return
    if not confirm(f"\nInsert {len(rows)} record (year=2026) vào admissions_staging? [y/N] "):
        print("Đã huỷ."); return

    from supabase import create_client
    client = create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )
    inserted = errored = 0
    for i in range(0, len(rows), INSERT_CHUNK):
        chunk = rows[i:i + INSERT_CHUNK]
        try:
            client.table("admissions_staging").insert(chunk).execute()
            inserted += len(chunk)
            print(f"  inserted {inserted}/{len(rows)}...")
        except Exception as e:  # noqa: BLE001
            errored += len(chunk)
            print(f"  ⚠️ lỗi chunk {i}: {str(e)[:140]}")
    print(f"\n✅ inserted={inserted}, error={errored}")


if __name__ == "__main__":
    main()
