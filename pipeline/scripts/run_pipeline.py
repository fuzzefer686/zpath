"""Orchestrate the 3 crawl tiers per university into one final result.

For each row in admission_urls.csv:
  Tier 1  extract_admissions.extract_one      (landing page)
  Tier 2  deep_crawl.extract_from_link        (suggested_links)
  Tier 3  deep_crawl_level2 (PDF discovery)    (real PDF attachments)

Escalation rule (intentional — see the project discussion):
  "Has data" means at least one record carries a NUMERIC value (score or
  tuition), not merely a major name. We escalate while the current tier has no
  numeric data, and stop at the FIRST tier that does. If no tier yields numeric
  data we keep the tier with the most records and mark needs_manual_review.
  This reproduces the validated outcome (e.g. BKA stops at tier 3 with real
  numbers, not tier 1 with name-only rows).

Output:
  data/output/final_results/<code>.json  (one consolidated result per school)
  data/output/pipeline_summary.csv        (code, final_tier, status,
                                            num_records, review_status)

Run from the pipeline root:
  python scripts/run_pipeline.py                       # all schools
  python scripts/run_pipeline.py --batch-start 1 --batch-end 10
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import signal
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

import config
import extract_admissions
import deep_crawl
import deep_crawl_level2
import fetcher
from deep_crawl_level2 import lacks_numbers

URLS_CSV = config.PIPELINE_ROOT / "data" / "output" / "admission_urls.csv"
FINAL_DIR = config.PIPELINE_ROOT / "data" / "output" / "final_results"
SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "pipeline_summary.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "pipeline_errors.log"

SUMMARY_FIELDS = ["university_code", "final_tier", "status", "num_records", "review_status"]
MAX_SUGGESTED = 2          # links followed at tier 2 (cost control)
MAX_LANDING_PDFS = 3       # PDF/đề-án links followed straight from the landing page
SCHOOL_TIMEOUT_SEC = 120   # hard wall-clock budget per school (Playwright pages
                           # can take 5-30s each across tiers, so 60s was tight)

# href keywords that hint at an admission document.
LANDING_DOC_KEYWORDS = ("de-an", "dean", "tuyen-sinh", "thong-bao", "de%20an")


# BaseException (not Exception) so the broad `except Exception` blocks inside the
# tier functions can't swallow the per-school timeout — it propagates to main.
class SchoolTimeout(BaseException):
    pass


def _on_timeout(signum, frame):
    raise SchoolTimeout()


def has_numbers(records: list[dict]) -> bool:
    return not lacks_numbers(records)


def url_from_source(source: str, fallback: str = "") -> str:
    m = re.search(r"https?://\S+", source or "")
    return m.group(0) if m else fallback


def attach_source(records: list[dict], source_url: str) -> list[dict]:
    out = []
    for r in records:
        rr = dict(r)
        rr["source_url"] = source_url
        out.append(rr)
    return out


def flatten_blocks(blocks: list[dict], fallback_url: str) -> list[dict]:
    """Flatten per-link blocks into records, each tagged with its source URL."""
    recs: list[dict] = []
    for b in blocks:
        src = url_from_source(b.get("source", ""), fallback_url)
        recs += attach_source(b.get("data") or [], src)
    return recs


def find_landing_pdf_links(landing_url: str, limit: int = MAX_LANDING_PDFS) -> list[str]:
    """PDF / đề-án links found directly on the landing page (no Gemini).

    Returns up to `limit` absolute links whose href ends in .pdf or contains an
    admission keyword. PDF links are ranked first, keyword-matching links next.
    Returns [] on any fetch error (caller falls back to suggested_links).
    """
    try:
        resp = fetcher.fetch(landing_url)
    except Exception:  # noqa: BLE001 — fetch failure just means "no landing links"
        return []
    if "pdf" in resp.headers.get("content-type", "").lower():
        return [str(resp.url)]  # the landing itself is a PDF

    soup = BeautifulSoup(resp.text, "lxml")
    ranked: list[tuple[tuple, str]] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(str(resp.url), a["href"].strip())
        if urlparse(href).scheme not in ("http", "https") or href in seen:
            continue
        low = href.lower()
        is_pdf = low.split("?")[0].endswith(".pdf")
        has_kw = any(k in low for k in LANDING_DOC_KEYWORDS)
        if not (is_pdf or has_kw):
            continue
        seen.add(href)
        ranked.append((_link_rank(low, is_pdf), href))
    # Highest rank first: đề-án > tuyển-sinh > thông-báo, recent year, is-pdf.
    ranked.sort(key=lambda x: x[0], reverse=True)
    return [href for _, href in ranked[:limit]]


def _link_rank(low_href: str, is_pdf: bool) -> tuple:
    """Rank a candidate link: prefer 'đề án', recent year, and PDFs."""
    if "de-an" in low_href or "dean" in low_href:
        kw = 3
    elif "tuyen-sinh" in low_href:
        kw = 2
    elif "thong-bao" in low_href:
        kw = 1
    else:
        kw = 0
    year = 2 if ("2026" in low_href or "2025" in low_href) else (
        1 if "2024" in low_href else 0)
    return (kw, year, 1 if is_pdf else 0)


def log_error(message: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{ts}] {message}\n")


def run_school(client, code: str, name: str, url: str) -> dict:
    """Run the tiers for one school and return its summary row."""
    fetcher.clear_cache()  # C2: per-school fetch cache (dedupe landing across tiers)
    tiers: dict[int, list[dict]] = {}

    def run_links(links: list[str], via: str) -> list[dict]:
        blocks: list[dict] = []
        for link in links:
            try:
                blocks.append(deep_crawl.extract_from_link(client, name, link))
            except Exception as e:  # noqa: BLE001
                log_error(f"{code} | tier2 ({via}) {link}: {e}")
        return blocks

    # --- Tier 1: landing page ---
    try:
        t1 = extract_admissions.extract_one(client, name, url)
    except Exception as e:  # noqa: BLE001
        log_error(f"{code} | tier1: {e}")
        t1 = {"status": "error", "data": [], "suggested_links": [], "note": ""}
    tiers[1] = attach_source(t1.get("data") or [], url)
    if has_numbers(tiers[1]):
        return _finalize(code, name, url, 1, tiers)

    # --- Tier 2: prefer PDF/đề-án links ON the landing page (Fix A2) ---
    # The landing page often links straight to the admission PDF (e.g. DQS has
    # 50 .pdf links). Try those first; but if they yield NO records, fall back
    # to Gemini's suggested_links (Fix C1 — otherwise NLS-type infographic pages
    # reached only via suggested_links would be lost).
    landing_links = find_landing_pdf_links(url)
    t2_blocks = run_links(landing_links, "landing-pdf") if landing_links else []
    if not flatten_blocks(t2_blocks, url) and t1.get("status") in ("needs_deeper_crawl", "partial"):
        t2_blocks = run_links((t1.get("suggested_links") or [])[:MAX_SUGGESTED],
                              "suggested-fallback")
    if t2_blocks:
        tiers[2] = flatten_blocks(t2_blocks, url)
    if has_numbers(tiers.get(2, [])):
        return _finalize(code, name, url, 2, tiers)

    # --- Tier 3: real PDF attachments inside tier-2 pages (+ the landing page) ---
    # We don't gate on note wording (the model phrases it inconsistently).
    # Scanning a page for PDF links costs no Gemini call, so we always look;
    # Gemini only runs if an actual PDF/document link is found.
    sources, _note_hint = deep_crawl_level2.html_sources_to_revisit(t2_blocks)
    candidate_pages = list(dict.fromkeys([url, *sources]))  # landing + tier-2 pages
    t3_blocks: list[dict] = []
    for pdf in deep_crawl_level2.discover_pdf_links(candidate_pages, code):
        try:
            t3_blocks.append(deep_crawl.extract_from_link(client, name, pdf))
        except Exception as e:  # noqa: BLE001
            log_error(f"{code} | tier3 {pdf}: {e}")
    if t3_blocks:
        tiers[3] = flatten_blocks(t3_blocks, url)

    return _finalize(code, name, url, _choose_tier(tiers), tiers)


def _choose_tier(tiers: dict[int, list[dict]]) -> int:
    """First tier with numeric data; else the tier with most records; else deepest."""
    for t in sorted(tiers):
        if has_numbers(tiers[t]):
            return t
    with_records = {t: recs for t, recs in tiers.items() if recs}
    if with_records:
        return max(with_records, key=lambda t: len(with_records[t]))
    return max(tiers) if tiers else 1


def _finalize(code: str, name: str, url: str, final_tier: int,
              tiers: dict[int, list[dict]]) -> dict:
    records = tiers.get(final_tier, [])
    if has_numbers(records):
        status, review = "success", "pending"
    elif records:
        status, review = "partial", "needs_manual_review"
    else:
        status, review = "needs_manual_review", "needs_manual_review"

    out = {
        "university_code": code,
        "university_name": name,
        "found_url": url,
        "final_tier": final_tier,
        "status": status,
        "review_status": review,
        "num_records": len(records),
        "data": records,
    }
    (FINAL_DIR / f"{code}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return {
        "university_code": code, "final_tier": final_tier, "status": status,
        "num_records": len(records), "review_status": review,
    }


def read_rows() -> list[dict]:
    if not URLS_CSV.is_file():
        config.fail(f"Input file not found: {URLS_CSV}")
    with URLS_CSV.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_done_codes() -> set[str]:
    """university_codes considered finished, by their LATEST row's status.

    Only 'success' counts as done. partial / needs_manual_review / timeout /
    error are all retried on a re-run, so iterating with improved logic keeps
    trying to turn them into success. (Latest row wins, since retries append.)
    """
    if not (SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0):
        return set()
    latest: dict[str, str] = {}
    with SUMMARY_CSV.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            code = (row.get("university_code") or "").strip()
            if code:
                latest[code] = row.get("status") or ""
    return {code for code, status in latest.items() if status == "success"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the 3-tier extraction pipeline.")
    parser.add_argument("--batch-start", type=int, default=1,
                        help="vị trí trường đầu (1-indexed, gồm cả)")
    parser.add_argument("--batch-end", type=int, default=None,
                        help="vị trí trường cuối (1-indexed, gồm cả)")
    args = parser.parse_args()

    all_rows = read_rows()
    start = max(args.batch_start, 1)
    end = args.batch_end if args.batch_end is not None else len(all_rows)
    batch = all_rows[start - 1:end]  # 1-indexed inclusive slice

    done = load_done_codes()
    todo = [r for r in batch
            if (r.get("university_code") or "").strip() not in done]
    skipped = len(batch) - len(todo)

    print(f"Batch [{start}..{end}] = {len(batch)} trường | "
          f"đã có: {skipped} | sẽ xử lý: {len(todo)}\n")
    if not todo:
        print("Không có trường nào cần xử lý (đã xong hết).")
        return

    client = config.get_genai_client()
    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    signal.signal(signal.SIGALRM, _on_timeout)

    # Append so checkpoints survive across re-runs; header only when new.
    write_header = not (SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0)
    started = time.time()

    with SUMMARY_CSV.open("a", encoding="utf-8", newline="") as sf:
        writer = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        if write_header:
            writer.writeheader()

        for i, row in enumerate(todo, start=1):
            code = (row.get("university_code") or "").strip()
            name = (row.get("university_name") or "").strip()
            url = (row.get("found_url") or "").strip()
            print(f"[{i}/{len(todo)}] {name}...", flush=True)

            signal.alarm(SCHOOL_TIMEOUT_SEC)
            try:
                summary = run_school(client, code, name, url)
            except SchoolTimeout:
                log_error(f"{code} | {name} | timeout sau {SCHOOL_TIMEOUT_SEC}s")
                summary = {
                    "university_code": code, "final_tier": 0, "status": "timeout",
                    "num_records": 0, "review_status": "needs_manual_review",
                }
            finally:
                signal.alarm(0)  # always clear the alarm

            print(f"    final_tier: {summary['final_tier']}, status: {summary['status']}, "
                  f"records: {summary['num_records']}, review: {summary['review_status']}")
            writer.writerow(summary)
            sf.flush()  # checkpoint after every school
            time.sleep(2.0)

    elapsed = time.time() - started
    print(f"\n✅ Xong {len(todo)} trường trong {elapsed:.0f}s "
          f"(~{elapsed / max(len(todo), 1):.1f}s/trường).")
    print(f"   Summary: {SUMMARY_CSV}")
    print(f"   Final JSON: {FINAL_DIR}/")
    if ERROR_LOG.is_file():
        print(f"⚠️  Có lỗi tại: {ERROR_LOG}")


if __name__ == "__main__":
    main()
