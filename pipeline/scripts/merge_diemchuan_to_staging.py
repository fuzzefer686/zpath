"""Load 2025 điểm chuẩn (Pass B) results into admissions_staging.

Reads data/output/diemchuan_results/*.json (from crawl_diemchuan_2025.py) and
maps each score record onto the admissions_staging schema with year=2025, then
previews and (after confirm) inserts. Normalization applied here:

  - school_major_code: the score source (e.g. tuyensinh247) rarely lists a
    major code, so promote would drop these (NOT NULL). We generate a stable,
    diacritic-free code from the major name so each major/method dedupes to one
    benchmark row.
  - exam_blocks: the source crams every combo for a major into one string
    ("A00; A02; X01; ..."). We split it into a clean text[] of standard block
    codes; the per-combo score is identical, so combination_code stays null
    downstream (transform) and the blocks populate program_combinations.
  - score scale is derived later (transform) from admission_method.

Run from the pipeline root:
  python scripts/merge_diemchuan_to_staging.py            # prompts [y/N]
  python scripts/merge_diemchuan_to_staging.py --yes
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter

import config

RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "diemchuan_results"
TARGET_YEAR = 2025
INSERT_CHUNK = 200
BLOCK_RE = re.compile(r"^[A-Z]{1,2}\d{2}$")  # A00, D01, X06, M30, ...
# Curated schools already have hand-checked 2025 benchmarks; don't add the
# coarser aggregator rows on top of them.
CURATED_SKIP = {"HUST", "FTU", "NEU", "UET", "VINUNI"}
VALID_METHODS = {"diem_thi_thpt", "hoc_ba", "dgnl_hn", "dgnl_hcm",
                 "dg_tu_duy", "xt_rieng", "ket_hop"}


def slugcode(major_name: str) -> str:
    """Stable diacritic-free code from a major name, e.g. 'Giáo dục Mầm non'
    -> 'DC25-GIAO-DUC-MAM-NON' (capped). Deterministic so re-runs dedupe."""
    norm = unicodedata.normalize("NFKD", major_name or "")
    ascii_only = norm.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^A-Za-z0-9]+", "-", ascii_only).strip("-").upper()
    return f"DC25-{slug[:40]}" if slug else "DC25-NA"


def parse_blocks(combo) -> list[str] | None:
    """Split a combo blob ('A00; A02; X01') into a list of standard block codes."""
    if not combo:
        return None
    tokens = re.split(r"[;,/]\s*|\s+", str(combo).upper())
    blocks = [t for t in (tok.strip() for tok in tokens) if BLOCK_RE.match(t)]
    # dedupe, preserve order
    seen: set[str] = set()
    out = [b for b in blocks if not (b in seen or seen.add(b))]
    return out or None


def map_record(code: str, name: str, rec: dict) -> dict | None:
    major_name = (rec.get("major_name") or "").strip()
    score = rec.get("score")
    if not major_name or not isinstance(score, (int, float)):
        return None
    method = rec.get("admission_method")
    if method not in VALID_METHODS:
        method = "diem_thi_thpt"
    return {
        "university_code": code,
        "university_name": name,
        "school_major_code": slugcode(major_name),
        "major_name": major_name,
        "year": TARGET_YEAR,
        "admission_method": method,
        "exam_blocks": parse_blocks(rec.get("combination_code")),
        "score": float(score),
        "program_type": None,
        "tuition_min": None,
        "tuition_max": None,
        "source_url": rec.get("source_url") or rec.get("found_url"),
        "raw_extracted_json": {**rec, "_pass": "diem_chuan_2025"},
        "review_status": "pending",
    }


def load_rows(only_codes: set[str] | None = None) -> tuple[list[dict], Counter]:
    if not RESULTS_DIR.is_dir():
        config.fail(f"Results not found: {RESULTS_DIR}")
    rows: list[dict] = []
    per_school: Counter = Counter()
    for jf in sorted(RESULTS_DIR.glob("*.json")):
        fj = json.loads(jf.read_text(encoding="utf-8"))
        code = fj["university_code"]
        if code in CURATED_SKIP or (only_codes and code not in only_codes):
            continue
        name = fj.get("university_name", code)
        src = fj.get("found_url")
        for rec in fj.get("data") or []:
            rec.setdefault("source_url", src)
            row = map_record(code, name, rec)
            if row:
                rows.append(row)
                per_school[code] += 1
    return rows, per_school


def confirm(prompt: str) -> bool:
    if "--yes" in sys.argv:
        print(f"{prompt} y (--yes)"); return True
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--codes", type=str, default=None,
                        help="chỉ merge các mã trường này (vd AEP,DCT)")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    only = ({c.strip() for c in args.codes.split(",") if c.strip()} if args.codes else None)

    rows, per_school = load_rows(only)
    print("=== PREVIEW: điểm chuẩn 2025 -> admissions_staging ===")
    print(f"Tổng record: {len(rows)} | trường: {len(per_school)}")
    for code, n in sorted(per_school.items(), key=lambda x: -x[1]):
        print(f"  {code}: {n}")
    no_blocks = sum(1 for r in rows if not r["exam_blocks"])
    print(f"\nrecord không tách được tổ hợp (exam_blocks null): {no_blocks}")
    if not rows:
        print("Không có record để insert."); return
    if not confirm(f"\nInsert {len(rows)} record (year=2025) vào admissions_staging? [y/N] "):
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
