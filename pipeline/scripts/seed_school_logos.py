"""Write crawled logo URLs (data/output/logo_summary.csv) into schools.logo_url.

Separate from crawl_logos.py (which sources + uploads to Storage) so the DB write
stays previewable + idempotent, mirroring seed_school_cities.py. Curated schools
(HUST/FTU/NEU/UET/VINUNI) are skipped — their logos come from local data and win
in the frontend mapping. LOGO_OVERRIDE lets us hand-fix any school whose auto logo
is wrong/low quality (takes precedence over the crawl).

Run from the pipeline root:
  .venv/bin/python scripts/seed_school_logos.py --dry-run
  .venv/bin/python scripts/seed_school_logos.py --yes
"""

from __future__ import annotations

import argparse
import csv
import sys

import config

SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "logo_summary.csv"
CURATED_SKIP = {"HUST", "FTU", "NEU", "UET", "VINUNI"}

# Manual overrides (take precedence over the crawl). Fill in when a crawled logo
# is wrong or a missing school needs a hand-picked Storage/public URL.
LOGO_OVERRIDE: dict[str, str] = {}


def get_client():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


def confirm(prompt: str) -> bool:
    if "--yes" in sys.argv:
        print(f"{prompt} y (--yes)"); return True
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def load_logo_urls() -> dict[str, str]:
    urls: dict[str, str] = {}
    if SUMMARY_CSV.is_file():
        with SUMMARY_CSV.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                code = (r.get("code") or "").strip()
                url = (r.get("logo_url") or "").strip()
                if code and url:
                    urls[code] = url
    urls.update(LOGO_OVERRIDE)  # overrides win
    return urls


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()

    client = get_client()
    logos = load_logo_urls()
    schools = client.table("schools").select("id,code,logo_url").execute().data
    by_code = {(s.get("code") or "").strip(): s for s in schools}

    updates = []
    for code, url in logos.items():
        if code in CURATED_SKIP:
            continue
        s = by_code.get(code)
        if not s:
            continue
        if (s.get("logo_url") or "").strip() != url:
            updates.append((s["id"], code, s.get("logo_url") or "∅", url))

    print(f"Logo URLs: {len(logos)} | schools: {len(schools)} | cần cập nhật: {len(updates)}")
    for _id, code, old, _new in updates:
        print(f"  {code:6} {old[:40]!r} -> set")
    if args.dry_run:
        print("\n(DRY-RUN) chưa ghi."); return
    if not updates:
        print("Không có gì để cập nhật."); return
    if not confirm(f"\nCập nhật logo_url cho {len(updates)} trường? [y/N] "):
        print("Đã huỷ."); return

    for _id, _code, _old, new in updates:
        client.table("schools").update({"logo_url": new}).eq("id", _id).execute()
    print(f"✅ updated logo_url cho {len(updates)} trường.")


if __name__ == "__main__":
    main()
