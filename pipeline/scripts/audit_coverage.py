"""Milestone 1 — Audit coverage of the 33 non-curated schools.

For every school (all `schools` rows except the 5 hand-curated ones) this:

  1. Counts the frontend data we currently hold:
       programs_2026  = admission_programs WHERE year = 2026
       bench_2025     = benchmarks         WHERE year = 2025
       tuition        = tuition_fees       (any year)
  2. Asks Gemini (Google Search grounding) for the real number of undergraduate
     majors the school trains in 2026 (falling back to 2025) -> expected_majors.
  3. Emits a verdict: "đủ" if programs_2026 >= ceil(0.8 * expected_majors),
     otherwise "thiếu" with the gap.

Output:
  data/output/coverage_audit.csv   (one row per school + verdict)
  printed report table

Run from the pipeline root:
  .venv/bin/python scripts/audit_coverage.py            # all 33 schools
  .venv/bin/python scripts/audit_coverage.py --limit 3  # sample first
  .venv/bin/python scripts/audit_coverage.py --no-search # counts only, skip Gemini
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import time

import config
from find_admission_urls import gather_text

# Schools with hand-checked data — out of audit scope (same set the merge skips).
CURATED_SKIP = {"HUST", "FTU", "NEU", "UET", "VINUNI"}
THRESHOLD = 0.8
AUDIT_CSV = config.PIPELINE_ROOT / "data" / "output" / "coverage_audit.csv"
AUDIT_FIELDS = [
    "university_code", "university_name", "programs_2026", "bench_2025",
    "tuition", "expected_majors", "needed", "gap", "verdict", "note",
]
REQUEST_DELAY_SEC = 2.0


# --------------------------------------------------------------------------- #
# DB counting
# --------------------------------------------------------------------------- #
def get_client():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


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


def load_counts(client) -> dict[str, dict]:
    """Return {school_code: {name, programs_2026, bench_2025, tuition}} for the
    in-scope (non-curated) schools."""
    from collections import Counter, defaultdict

    schools = fetch_all(client, "schools", "code,name")
    counts: dict[str, dict] = {}
    for s in schools:
        code = (s.get("code") or "").strip()
        if not code or code in CURATED_SKIP:
            continue
        counts[code] = {
            "university_name": s.get("name") or code,
            "programs_2026": 0, "bench_2025": 0, "tuition": 0,
        }

    prog = Counter()
    for p in fetch_all(client, "admission_programs", "school_code,year"):
        if p.get("year") == 2026:
            prog[(p.get("school_code") or "").strip()] += 1
    bench = Counter()
    for b in fetch_all(client, "benchmarks", "school_code,year"):
        if b.get("year") == 2025:
            bench[(b.get("school_code") or "").strip()] += 1
    tuit = Counter()
    for t in fetch_all(client, "tuition_fees", "school_code"):
        tuit[(t.get("school_code") or "").strip()] += 1

    for code, c in counts.items():
        c["programs_2026"] = prog.get(code, 0)
        c["bench_2025"] = bench.get(code, 0)
        c["tuition"] = tuit.get(code, 0)
    return counts


# --------------------------------------------------------------------------- #
# Gemini grounding — expected number of majors
# --------------------------------------------------------------------------- #
def _parse_count(text: str) -> int | None:
    """Pull the first plausible major-count integer out of the model answer.

    We bias to a number that appears right before/after the word 'ngành', and
    ignore obvious years (2024-2027) so '...tuyển sinh 2026...' isn't misread."""
    if not text:
        return None
    # Only trust a number that sits right next to the word "ngành/chương trình"
    # — e.g. "tuyển sinh 22 ngành", "31 chương trình đào tạo". A bare number
    # near "tuyển sinh" is unreliable ("tuyển sinh 2 đợt" -> 2), so we don't use it.
    candidates = [int(t) for t in re.findall(
        r"(\d{1,3})\s*(?:ngành|chuyên ngành|mã ngành|chương trình)", text, re.I)]
    candidates = [n for n in candidates if 1 <= n <= 300 and not (2018 <= n <= 2030)]
    # The headline total is usually the largest such count on the page.
    return max(candidates) if candidates else None


def expected_majors(client, name: str) -> tuple[int | None, str]:
    """Ask Gemini (grounded) for the count of undergraduate majors.

    Returns (count_or_None, short_note). One grounding call per school."""
    from google.genai import types

    prompt = (
        f"Năm 2026, {name} tuyển sinh đại học chính quy bao nhiêu NGÀNH "
        f"(mã ngành/chương trình đào tạo bậc đại học)? Nếu chưa công bố đề án "
        f"2026 thì cho biết số ngành năm 2025. Tra cứu đề án tuyển sinh / "
        f"website chính thức và các trang tuyensinh247, tuyensinhso. "
        f"Trả lời NGẮN GỌN, nêu RÕ con số tổng số ngành, ví dụ: "
        f"'Trường tuyển sinh 31 ngành năm 2026.'"
    )
    cfg = types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())], temperature=0.1
    )
    resp = client.models.generate_content(
        model=config.GEMINI_MODEL, contents=prompt, config=cfg
    )
    text = gather_text(resp)
    return _parse_count(text), text.strip().replace("\n", " ")[:180]


# --------------------------------------------------------------------------- #
def verdict_for(programs_2026: int, expected: int | None) -> tuple[int | None, int, str]:
    """Return (needed, gap, verdict)."""
    if not expected:
        return None, 0, "unknown"
    needed = math.ceil(THRESHOLD * expected)
    gap = max(0, needed - programs_2026)
    return needed, gap, ("đủ" if programs_2026 >= needed else "thiếu")


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit coverage of 33 schools.")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--no-search", action="store_true",
                        help="chỉ đếm DB, không gọi Gemini (expected=unknown)")
    parser.add_argument("--reuse-expected", action="store_true",
                        help="lấy lại expected_majors từ coverage_audit.csv cũ "
                             "(không gọi Gemini) — dùng cho vòng lặp re-audit")
    args = parser.parse_args()

    client = get_client()
    counts = load_counts(client)
    codes = sorted(counts.keys())
    if args.limit is not None:
        codes = codes[: args.limit]
    print(f"Phạm vi audit: {len(codes)} trường (đã loại {sorted(CURATED_SKIP)})\n")

    prior_expected: dict[str, int] = {}
    if args.reuse_expected and AUDIT_CSV.is_file():
        with AUDIT_CSV.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                if (r.get("expected_majors") or "").strip().isdigit():
                    prior_expected[r["university_code"]] = int(r["expected_majors"])

    gclient = None if (args.no_search or args.reuse_expected) else config.get_genai_client()
    rows: list[dict] = []
    for i, code in enumerate(codes, start=1):
        c = counts[code]
        name = c["university_name"]
        exp, note = (prior_expected.get(code), "reused" if code in prior_expected else "")
        if gclient is not None:
            try:
                exp, note = expected_majors(gclient, name)
            except Exception as e:  # noqa: BLE001 — grounding flaky; record & move on
                note = f"search_error: {str(e)[:80]}"
            time.sleep(REQUEST_DELAY_SEC)
        needed, gap, verdict = verdict_for(c["programs_2026"], exp)
        rows.append({
            "university_code": code, "university_name": name,
            "programs_2026": c["programs_2026"], "bench_2025": c["bench_2025"],
            "tuition": c["tuition"], "expected_majors": exp if exp else "",
            "needed": needed if needed else "", "gap": gap,
            "verdict": verdict, "note": note,
        })
        print(f"[{i}/{len(codes)}] {code:6} p2026={c['programs_2026']:>3} "
              f"bench={c['bench_2025']:>3} exp={str(exp or '?'):>4} "
              f"-> {verdict}", flush=True)

    AUDIT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with AUDIT_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=AUDIT_FIELDS)
        w.writeheader()
        w.writerows(rows)

    # report
    thieu = [r for r in rows if r["verdict"] == "thiếu"]
    print(f"\n=== BÁO CÁO COVERAGE ({len(rows)} trường) ===")
    print(f"{'CODE':6} {'p2026':>6} {'bench25':>7} {'exp':>5} {'need':>5} "
          f"{'gap':>4}  verdict")
    for r in sorted(rows, key=lambda x: (-int(x["gap"] or 0), x["university_code"])):
        print(f"{r['university_code']:6} {r['programs_2026']:>6} {r['bench_2025']:>7} "
              f"{str(r['expected_majors'] or '?'):>5} {str(r['needed'] or '?'):>5} "
              f"{r['gap']:>4}  {r['verdict']}")
    print(f"\nThiếu: {len(thieu)}/{len(rows)} -> "
          f"{[r['university_code'] for r in thieu]}")
    print(f"CSV: {AUDIT_CSV}")


if __name__ == "__main__":
    main()
