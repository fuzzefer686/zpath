"""Load final pipeline results into the Supabase admissions_staging table.

Reads data/output/final_results/*.json, maps every extracted record onto the
admissions_staging schema, shows a preview, asks for confirmation, then inserts.

review_status: rows inherit their school's review_status from the pipeline
(pending when numeric data was found, needs_manual_review otherwise) — this
preserves the review signal the staging table is designed around, rather than
marking everything 'pending'. Pass --pending-all to force 'pending'.

Run from the pipeline root:
  python scripts/merge_to_staging.py          # prompts [y/N]
  python scripts/merge_to_staging.py --yes     # skip the prompt (automation)
"""

from __future__ import annotations

import json
import sys
from collections import Counter

import config

FINAL_DIR = config.PIPELINE_ROOT / "data" / "output" / "final_results"

STAGING_COLUMNS = [
    "university_code", "university_name", "school_major_code", "major_name",
    "year", "admission_method", "exam_blocks", "score", "program_type",
    "tuition_min", "tuition_max", "source_url", "raw_extracted_json",
    "review_status",
]
INSERT_CHUNK = 200


def to_int_year(value) -> int | None:
    """Coerce year to int (the column is int); tolerate '2026' / 2026 / None."""
    if value is None:
        return None
    try:
        return int(str(value).strip())
    except (ValueError, TypeError):
        return None


def map_row(code: str, name: str, record: dict, review_status: str) -> dict:
    return {
        "university_code": code,
        "university_name": name,
        "school_major_code": record.get("school_major_code"),
        "major_name": record.get("major_name"),
        "year": to_int_year(record.get("year")),
        "admission_method": record.get("admission_method"),
        "exam_blocks": record.get("exam_blocks"),  # list -> text[] or None
        "score": record.get("score"),
        "program_type": record.get("program_type"),
        "tuition_min": record.get("tuition_min"),
        "tuition_max": record.get("tuition_max"),
        "source_url": record.get("source_url"),
        # Keep the untouched AI output for auditing during review.
        "raw_extracted_json": {k: v for k, v in record.items() if k != "source_url"},
        "review_status": review_status,
    }


def load_final() -> tuple[list[dict], list[dict]]:
    """Return (rows_to_insert, schools_needing_review)."""
    if not FINAL_DIR.is_dir():
        config.fail(f"Final results not found: {FINAL_DIR}")

    force_pending = "--pending-all" in sys.argv
    rows: list[dict] = []
    merged: list[dict] = []   # schools with records>0 (actually inserted)
    skipped: list[dict] = []  # schools skipped (0 records / needs_manual_review)

    for jf in sorted(FINAL_DIR.glob("*.json")):
        fj = json.loads(jf.read_text(encoding="utf-8"))
        code = fj["university_code"]
        name = fj.get("university_name", code)
        records = fj.get("data") or []
        meta = {"code": code, "status": fj.get("status"),
                "num_records": len(records), "review_status": fj.get("review_status")}

        # Only merge schools that actually have records; skip 0-record ones.
        if not records:
            skipped.append(meta)
            continue

        school_review = "pending" if force_pending else fj.get("review_status", "pending")
        for rec in records:
            rows.append(map_row(code, name, rec, school_review))
        merged.append(meta)

    return rows, merged, skipped


def confirm(prompt: str) -> bool:
    if "--yes" in sys.argv:
        print(f"{prompt} y (--yes)")
        return True
    try:
        ans = input(prompt).strip().lower()
    except EOFError:
        return False
    return ans in ("y", "yes")


def main() -> None:
    rows, merged, skipped = load_final()

    print("=== PREVIEW: sẽ insert vào admissions_staging ===")
    print(f"Tổng records sẽ insert: {len(rows)} (từ {len(merged)} trường có data)")
    print(f"Bỏ qua (0 record / needs_manual_review): {len(skipped)} trường")

    print("\n-- Breakdown theo STATUS (trường có data) --")
    by_status = Counter(m["status"] for m in merged)
    rec_by_status = Counter()
    for m in merged:
        rec_by_status[m["status"]] += m["num_records"]
    for st, n in by_status.items():
        print(f"  {st}: {n} trường, {rec_by_status[st]} records")

    print("\n-- Breakdown theo UNIVERSITY_CODE --")
    by_code = Counter(r["university_code"] for r in rows)
    for code, n in sorted(by_code.items(), key=lambda x: -x[1]):
        print(f"  {code}: {n}")
    print()

    if not rows:
        print("Không có record nào để insert. Dừng.")
        return

    if not confirm(f"Insert {len(rows)} record vào admissions_staging? [y/N] "):
        print("Đã huỷ, không insert.")
        return

    # --- Insert ---
    from supabase import create_client
    client = create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )

    inserted, errored = 0, 0
    for i in range(0, len(rows), INSERT_CHUNK):
        chunk = rows[i:i + INSERT_CHUNK]
        try:
            client.table("admissions_staging").insert(chunk).execute()
            inserted += len(chunk)
            print(f"  inserted {inserted}/{len(rows)}...")
        except Exception as e:  # noqa: BLE001
            errored += len(chunk)
            print(f"  ⚠️  lỗi insert chunk {i}-{i+len(chunk)}: {str(e)[:120]}")

    total = client.table("admissions_staging").select("*", count="exact").limit(1).execute()
    print(f"\n✅ Inserted: {inserted} rows | Skipped: {len(skipped)} trường (0 record) | "
          f"Error: {errored} rows")
    print(f"   Tổng record trong admissions_staging hiện tại: {total.count}")


if __name__ == "__main__":
    main()
