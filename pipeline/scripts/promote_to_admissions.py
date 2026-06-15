"""Promote reviewed staging rows into the official tables.

Step 1 (--step universities): upsert the schools that have data into the
  `universities` table (code + name from universities_list.csv; other fields
  left null, to be enriched later). admissions.university_id needs these.

Step 2 (--step admissions): upsert qualifying staging rows into `admissions`.
  Qualifying = year IN (2025,2026) AND at least one of score / exam_blocks /
  tuition_min is present. Rows missing a NOT NULL admissions field
  (school_major_code, major_name, admission_method) are skipped (left in
  staging for manual fixing). Remaining rows are deduped on the unique key
  (university_id, school_major_code, admission_method, year) and upserted
  (INSERT ... ON CONFLICT DO UPDATE).

Each step previews counts and asks [y/N] (or --yes) before writing.

Run from the pipeline root:
  python scripts/promote_to_admissions.py --step universities
  python scripts/promote_to_admissions.py --step admissions
"""

from __future__ import annotations

import argparse
import csv

import config

NAMES_CSV = config.PIPELINE_ROOT / "data" / "input" / "universities_list.csv"
UPSERT_CHUNK = 200


def confirm(prompt: str) -> bool:
    import sys
    if "--yes" in sys.argv:
        print(f"{prompt} y (--yes)")
        return True
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def get_client():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


def load_names() -> dict[str, str]:
    names: dict[str, str] = {}
    with NAMES_CSV.open(encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            names[(r.get("university_code") or "").strip()] = (
                r.get("university_name") or "").strip()
    return names


def fetch_all(client, table: str, columns: str) -> list[dict]:
    """Fetch all rows from a table, paging past the 1000-row cap."""
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


def count(client, table: str) -> int:
    return client.table(table).select("*", count="exact").limit(1).execute().count


# --------------------------------------------------------------------------- #
def step_universities(client) -> None:
    staging = fetch_all(client, "admissions_staging", "university_code")
    codes = sorted({(r["university_code"] or "").strip() for r in staging if r["university_code"]})
    names = load_names()

    existing = {u["code"] for u in fetch_all(client, "universities", "code")}
    to_insert = [c for c in codes if c not in existing]
    to_update = [c for c in codes if c in existing]

    print("=== STEP 1: upsert universities ===")
    print(f"Trường có data trong staging: {len(codes)}")
    print(f"  sẽ INSERT mới: {len(to_insert)}")
    print(f"  đã tồn tại (UPDATE name): {len(to_update)}")
    missing_name = [c for c in codes if not names.get(c)]
    if missing_name:
        print(f"  ⚠️ thiếu name trong CSV: {missing_name}")
    if not confirm(f"\nUpsert {len(codes)} trường vào universities? [y/N] "):
        print("Đã huỷ."); return

    rows = [{"code": c, "name": names.get(c, c)} for c in codes]
    before = count(client, "universities")
    for i in range(0, len(rows), UPSERT_CHUNK):
        client.table("universities").upsert(rows[i:i + UPSERT_CHUNK], on_conflict="code").execute()
    after = count(client, "universities")
    print(f"\n✅ universities: inserted={after - before}, updated={len(rows) - (after - before)}, "
          f"tổng hiện tại={after}")


# --------------------------------------------------------------------------- #
def _qualifies(r: dict, include_partial: bool) -> bool:
    if r["year"] not in (2025, 2026):
        return False
    if include_partial:
        return True  # any row with a valid year, even name-only
    return (r["score"] is not None or r["exam_blocks"] not in (None, [])
            or r["tuition_min"] is not None)


def step_admissions(client, include_partial: bool = False) -> None:
    umap = {u["code"]: u["id"] for u in fetch_all(client, "universities", "id,code")}
    staging = fetch_all(
        client, "admissions_staging",
        "university_code,school_major_code,major_name,year,admission_method,"
        "exam_blocks,score,program_type,tuition_min,tuition_max,source_url",
    )
    qualifying = [r for r in staging if _qualifies(r, include_partial)]
    mergeable = [r for r in qualifying
                 if r["school_major_code"] and r["major_name"] and r["admission_method"]
                 and r["university_code"] in umap]
    skipped_fields = len(qualifying) - len([r for r in qualifying if r["school_major_code"]
                                            and r["major_name"] and r["admission_method"]])
    skipped_nouni = len([r for r in qualifying if r["school_major_code"] and r["major_name"]
                         and r["admission_method"] and r["university_code"] not in umap])

    # Dedupe on the admissions unique key (keep last occurrence).
    by_key: dict[tuple, dict] = {}
    for r in mergeable:
        key = (umap[r["university_code"]], r["school_major_code"], r["admission_method"], r["year"])
        by_key[key] = {
            "university_id": umap[r["university_code"]],
            "school_major_code": r["school_major_code"],
            "major_name": r["major_name"],
            "year": r["year"],
            "admission_method": r["admission_method"],
            "exam_blocks": r["exam_blocks"],
            "score": r["score"],
            "program_type": r["program_type"],
            "tuition_min": r["tuition_min"],
            "tuition_max": r["tuition_max"],
            "source_url": r["source_url"],
            "data_confidence": "ai_extracted",
        }
    rows = list(by_key.values())

    print(f"=== STEP 2: upsert admissions (include_partial={include_partial}) ===")
    print(f"Qualifying staging rows: {len(qualifying)}")
    print(f"  bỏ qua (thiếu NOT NULL field): {skipped_fields}")
    print(f"  bỏ qua (university_code không có trong universities): {skipped_nouni}")
    print(f"  sau dedupe conflict-key: {len(rows)} rows (từ {len(mergeable)} mergeable)")
    print(f"  distinct trường: {len(set(r['university_id'] for r in rows))}")
    if not rows:
        print("Không có row để merge."); return
    if not confirm(f"\nUpsert {len(rows)} rows vào admissions? [y/N] "):
        print("Đã huỷ."); return

    before = count(client, "admissions")
    upserted = errored = 0
    for i in range(0, len(rows), UPSERT_CHUNK):
        chunk = rows[i:i + UPSERT_CHUNK]
        try:
            client.table("admissions").upsert(
                chunk, on_conflict="university_id,school_major_code,admission_method,year"
            ).execute()
            upserted += len(chunk)
            print(f"  upserted {upserted}/{len(rows)}...")
        except Exception as e:  # noqa: BLE001
            errored += len(chunk)
            print(f"  ⚠️ lỗi chunk {i}: {str(e)[:140]}")
    after = count(client, "admissions")
    print(f"\n✅ admissions: inserted={after - before}, "
          f"updated={upserted - (after - before)}, error={errored}, tổng hiện tại={after}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--step", choices=["universities", "admissions"], required=True)
    parser.add_argument("--include-partial", action="store_true",
                        help="merge cả rows name-only (year hợp lệ, không cần score/tuition)")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    client = get_client()
    if args.step == "universities":
        step_universities(client)
    else:
        step_admissions(client, include_partial=args.include_partial)


if __name__ == "__main__":
    main()
