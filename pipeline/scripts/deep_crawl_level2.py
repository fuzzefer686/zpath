"""Final (level-2) crawl: follow PDF attachments inside level-1 pages.

Level-1 (deep_crawl.py) showed that admission announcement pages usually list
only major names and point to a PDF ("xem file đính kèm") for the real numbers.
This script, for each school that came back partial-without-numbers:

  1. Re-fetches the level-1 HTML page (no Gemini call to re-find links —
     just regex/parse <a href> for .pdf or /upload/ /file/ /document/).
  2. Fetches any PDF found; extracts text (pdfplumber) or, if scanned,
     reads it with Gemini multimodal.
  3. Runs ONE final Gemini extraction (year-fixed schema). No suggested_links.
  4. If NO PDF link is found -> marks needs_manual_review WITHOUT calling
     Gemini (avoid pointless calls).

This is the LAST automatic crawl layer. There is no level 3 — anything still
missing numbers is left as needs_manual_review for a human.

Note on the filter: we trigger on (status == partial AND no numeric data).
The "note mentions attachment/PDF" signal is recorded as a hint but is NOT a
hard gate, because scanning a page for PDF links costs no Gemini call and some
useful pages don't phrase the note that way.

Run from the pipeline root:
  python scripts/deep_crawl_level2.py            # all schools from level 1
  python scripts/deep_crawl_level2.py BKA NLS    # only these codes
"""

from __future__ import annotations

import csv
import json
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

import config
import fetcher
import deep_crawl  # reuse extract_from_link / pdf routing / prompt
from find_admission_urls import gather_text  # noqa: F401 (kept for parity)

LEVEL1_DIR = config.PIPELINE_ROOT / "data" / "output" / "deep_extraction_results"
URLS_CSV = config.PIPELINE_ROOT / "data" / "output" / "admission_urls.csv"
RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "level2_results"
SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "level2_summary.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "level2_errors.log"

SUMMARY_FIELDS = [
    "university_code",
    "pdf_found",
    "status",
    "num_records_extracted",
    "review_status",
]

MAX_PDF_LINKS = 3            # cap PDFs followed per school (cost control)
PDF_PATH_HINTS = ("/upload/", "/file/", "/document/", "/uploads/", "/files/")
ATTACHMENT_NOTE_HINTS = ("đính kèm", "pdf", "tài liệu", "tải về")


def lacks_numbers(records: list[dict]) -> bool:
    """True if no record carries a score or tuition value."""
    if not records:
        return True
    for r in records:
        if r.get("score") is not None:
            return False
        if r.get("tuition_min") is not None or r.get("tuition_max") is not None:
            return False
    return True


def note_hints_attachment(note: str) -> bool:
    low = (note or "").lower()
    return any(h in low for h in ATTACHMENT_NOTE_HINTS)


def html_sources_to_revisit(blocks: list[dict]) -> tuple[list[str], bool]:
    """Return (level-1 HTML URLs worth re-scanning, any_note_hint)."""
    urls: list[str] = []
    seen: set[str] = set()
    any_hint = False
    for block in blocks:
        if block.get("status") != "partial":
            continue
        if not lacks_numbers(block.get("data") or []):
            continue
        if note_hints_attachment(block.get("note", "")):
            any_hint = True
        source = str(block.get("source", ""))
        if not source.startswith("HTML:"):
            continue
        url = source.split("HTML:", 1)[1].strip()
        if url and url not in seen:
            seen.add(url)
            urls.append(url)
    return urls, any_hint


def find_pdf_links(html: str, base_url: str) -> list[str]:
    """Extract candidate PDF/document links from a page."""
    soup = BeautifulSoup(html, "lxml")
    out: list[str] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"].strip())
        if urlparse(href).scheme not in ("http", "https"):
            continue
        low = href.split("?")[0].lower()
        if low.endswith(".pdf") or any(h in href.lower() for h in PDF_PATH_HINTS):
            if href not in seen:
                seen.add(href)
                out.append(href)
    return out


def log_error(message: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{ts}] {message}\n")


def load_name_map() -> dict[str, str]:
    names: dict[str, str] = {}
    if URLS_CSV.is_file():
        with URLS_CSV.open(encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                names[(row.get("university_code") or "").strip()] = (
                    row.get("university_name") or ""
                ).strip()
    return names


def discover_pdf_links(sources: list[str], code: str) -> list[str]:
    """Re-fetch level-1 pages and collect PDF links (no Gemini)."""
    found: list[str] = []
    seen: set[str] = set()
    for src in sources:
        try:
            resp = fetcher.fetch(src)
        except requests.RequestException as e:
            log_error(f"{code} | re-fetch {src} failed: {e}")
            continue
        for link in find_pdf_links(resp.text, str(resp.url)):
            if link not in seen:
                seen.add(link)
                found.append(link)
    return found[:MAX_PDF_LINKS]


def process_school(client, code: str, name: str, blocks: list[dict]) -> dict:
    """Run level-2 for one school; returns the summary dict and writes JSON."""
    sources, _hint = html_sources_to_revisit(blocks)
    pdf_links = discover_pdf_links(sources, code) if sources else []

    if not pdf_links:
        # No PDF to follow -> do not call Gemini; leave for manual handling.
        out = {
            "university_code": code,
            "pdf_found": "no",
            "review_status": "needs_manual_review",
            "results": [],
        }
        (RESULTS_DIR / f"{code}.json").write_text(
            json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return {
            "university_code": code, "pdf_found": "no", "status": "no_pdf",
            "num_records_extracted": 0, "review_status": "needs_manual_review",
        }

    results: list[dict] = []
    for pdf_url in pdf_links:
        try:
            res = deep_crawl.extract_from_link(client, name, pdf_url)
        except requests.RequestException as e:
            log_error(f"{code} | fetch {pdf_url} failed: {e}")
            continue
        except Exception as e:  # noqa: BLE001
            log_error(f"{code} | extract {pdf_url} failed: {e}")
            continue
        results.append(res)

    all_records = [rec for r in results for rec in (r.get("data") or [])]
    num = len(all_records)
    has_numbers = not lacks_numbers(all_records)
    # Final layer: numbers present -> ready for normal review; otherwise manual.
    review_status = "pending" if (num > 0 and has_numbers) else "needs_manual_review"
    status = "success" if has_numbers else ("partial" if num > 0 else "error")

    out = {
        "university_code": code,
        "pdf_found": "yes",
        "review_status": review_status,
        "results": results,
    }
    (RESULTS_DIR / f"{code}.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return {
        "university_code": code, "pdf_found": "yes", "status": status,
        "num_records_extracted": num, "review_status": review_status,
    }


def main() -> None:
    if not LEVEL1_DIR.is_dir():
        config.fail(f"Level-1 results not found: {LEVEL1_DIR}")

    wanted = {c.strip().upper() for c in sys.argv[1:]}
    name_map = load_name_map()

    files = sorted(LEVEL1_DIR.glob("*.json"))
    targets = [f for f in files if not wanted or f.stem.upper() in wanted]
    if not targets:
        config.fail(f"No matching schools in {LEVEL1_DIR} for {sorted(wanted)}")

    print(f"Level-2 crawl cho {len(targets)} trường: "
          f"{', '.join(f.stem for f in targets)}\n")

    client = config.get_genai_client()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    with SUMMARY_CSV.open("w", encoding="utf-8", newline="") as sf:
        writer = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        writer.writeheader()

        for i, json_file in enumerate(targets, start=1):
            code = json_file.stem
            name = name_map.get(code, code)
            blocks = json.loads(json_file.read_text(encoding="utf-8"))
            print(f"[{i}/{len(targets)}] {code} ({name})...", flush=True)

            row = process_school(client, code, name, blocks)
            print(f"    pdf_found: {row['pdf_found']}, status: {row['status']}, "
                  f"records: {row['num_records_extracted']}, "
                  f"review: {row['review_status']}")
            writer.writerow(row)
            sf.flush()
            time.sleep(2.0)

    print(f"\n✅ Xong. Summary: {SUMMARY_CSV}")
    print(f"   Raw JSON: {RESULTS_DIR}/")
    if ERROR_LOG.is_file():
        print(f"⚠️  Có lỗi tại: {ERROR_LOG}")


if __name__ == "__main__":
    main()
