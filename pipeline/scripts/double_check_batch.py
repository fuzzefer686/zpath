"""Double-check a freshly-crawled batch: crawled major count vs the real number.

For a batch of schools defined in a CSV (university_code,university_name) this:

  1. Reads how many 2026 majors we crawled — data/output/programs_2026_results/
     <code>.json (num_records) from crawl_programs_2026.py.
  2. Asks Gemini (Google Search grounding) for the real undergraduate major count
     (reuses audit_coverage.expected_majors / _parse_count). One grounding/school.
  3. Emits a verdict: "đủ" if crawled >= ceil(0.8 * expected), else "thiếu" + gap.

Unlike audit_coverage (which counts the live DB), this works for brand-new
schools NOT yet in the DB, so we can validate a crawl before any DB write.

Output:
  data/output/batch2_coverage.csv  (one row per school + verdict)
  printed report table

Run from the pipeline root:
  .venv/bin/python scripts/double_check_batch.py --csv data/input/batch2_schools.csv
  .venv/bin/python scripts/double_check_batch.py --csv ... --limit 3   # sample
  .venv/bin/python scripts/double_check_batch.py --csv ... --no-search # counts only
"""

from __future__ import annotations

import argparse
import csv
import json
import time
from pathlib import Path

import config
from audit_coverage import expected_majors, verdict_for

RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "programs_2026_results"
OUT_CSV = config.PIPELINE_ROOT / "data" / "output" / "batch2_coverage.csv"
OUT_FIELDS = [
    "university_code", "university_name", "crawled", "data_year", "found_url",
    "expected_majors", "needed", "gap", "verdict", "note",
]
REQUEST_DELAY_SEC = 2.0


def crawled_count(code: str) -> tuple[int, int | None, str]:
    """(num_records, data_year, found_url) from the crawl JSON, or (0, None, '')."""
    jf = RESULTS_DIR / f"{code}.json"
    if not jf.is_file():
        return 0, None, ""
    fj = json.loads(jf.read_text(encoding="utf-8"))
    return (int(fj.get("num_records") or 0),
            fj.get("data_year"), fj.get("found_url") or "")


def read_scope(csv_path: str, codes_arg: str | None, limit: int | None):
    path = Path(csv_path)
    if not path.is_file():
        config.fail(f"--csv not found: {path}")
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = [(r["university_code"].strip(), r["university_name"].strip())
                for r in csv.DictReader(f) if (r.get("university_code") or "").strip()]
    if codes_arg:
        wanted = {c.strip() for c in codes_arg.split(",") if c.strip()}
        rows = [(c, n) for c, n in rows if c in wanted]
    return rows[:limit] if limit is not None else rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Double-check crawled batch vs Google.")
    parser.add_argument("--csv", type=str, required=True)
    parser.add_argument("--codes", type=str, default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--no-search", action="store_true",
                        help="chỉ đọc số crawl, không gọi Gemini")
    args = parser.parse_args()

    scope = read_scope(args.csv, args.codes, args.limit)
    print(f"Double-check {len(scope)} trường\n")

    gclient = None if args.no_search else config.get_genai_client()
    rows: list[dict] = []
    for i, (code, name) in enumerate(scope, start=1):
        crawled, dyear, url = crawled_count(code)
        exp, note = None, ""
        if gclient is not None:
            try:
                exp, note = expected_majors(gclient, name)
            except Exception as e:  # noqa: BLE001 — grounding flaky; record & move on
                note = f"search_error: {str(e)[:80]}"
            time.sleep(REQUEST_DELAY_SEC)
        needed, gap, verdict = verdict_for(crawled, exp)
        rows.append({
            "university_code": code, "university_name": name, "crawled": crawled,
            "data_year": dyear or "", "found_url": url,
            "expected_majors": exp if exp else "", "needed": needed if needed else "",
            "gap": gap, "verdict": verdict, "note": note,
        })
        print(f"[{i}/{len(scope)}] {code:6} crawled={crawled:>3} "
              f"exp={str(exp or '?'):>4} -> {verdict}", flush=True)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=OUT_FIELDS)
        w.writeheader()
        w.writerows(rows)

    thieu = [r for r in rows if r["verdict"] == "thiếu"]
    unknown = [r for r in rows if r["verdict"] == "unknown"]
    print(f"\n=== DOUBLE-CHECK ({len(rows)} trường) ===")
    print(f"{'CODE':6} {'crawl':>5} {'yr':>4} {'exp':>5} {'need':>5} {'gap':>4}  verdict")
    for r in sorted(rows, key=lambda x: (-int(x["gap"] or 0), x["university_code"])):
        print(f"{r['university_code']:6} {r['crawled']:>5} {str(r['data_year']):>4} "
              f"{str(r['expected_majors'] or '?'):>5} {str(r['needed'] or '?'):>5} "
              f"{r['gap']:>4}  {r['verdict']}")
    print(f"\nĐủ: {len(rows) - len(thieu) - len(unknown)} | Thiếu: {len(thieu)} | "
          f"Unknown: {len(unknown)}")
    print(f"Thiếu -> {[r['university_code'] for r in thieu]}")
    print(f"CSV: {OUT_CSV}")


if __name__ == "__main__":
    main()
