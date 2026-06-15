"""Pass B — crawl 2025 benchmark scores (điểm chuẩn) for priority schools.

The original pipeline (Pass A) captured 2026 đề án data (ngành / tổ hợp / chỉ
tiêu / học phí) well, but barely any điểm chuẩn (only ~9/100 schools), because
it targeted the admission-plan page, not the score announcement. Since 2026
điểm chuẩn is not published until ~August, the most useful reference data for
applicants right now is the **2025 điểm chuẩn**.

This dedicated crawler, per school:
  1. Google-Search-grounded lookup for the 2025 điểm chuẩn page/article.
  2. Fetch + clean, then ask Gemini to extract one record per
     (ngành × tổ hợp) with its score (year is fixed to 2025 downstream).
  3. If the page is a landing/menu, follow ONE suggested link once.

Output:
  data/output/diemchuan_results/<code>.json   (per school)
  data/output/diemchuan_summary.csv           (code, status, num_records)

This reuses helpers from find_admission_urls / extract_admissions / fetcher.

Run from the pipeline root:
  python scripts/crawl_diemchuan_2025.py --limit 3      # sample first
  python scripts/crawl_diemchuan_2025.py                # whole priority list
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import time
from datetime import datetime, timezone

import requests

import config
import fetcher
from find_admission_urls import gather_text
from extract_admissions import clean_html, parse_json_object

INPUT_CSV = config.PIPELINE_ROOT / "data" / "input" / "priority_schools.csv"
RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "diemchuan_results"
SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "diemchuan_summary.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "diemchuan_errors.log"

SUMMARY_FIELDS = ["university_code", "university_name", "found_url",
                  "status", "num_records", "note"]
TARGET_YEAR = 2025

MAX_TEXT_CHARS = 100_000
MAX_LINKS = 150
MAX_RETRIES = 2
RETRY_BACKOFF_SEC = 5.0
REQUEST_DELAY_SEC = 2.0
VALID_STATUSES = {"success", "partial", "needs_deeper_crawl"}


# Score-table sources that reliably publish clean per-major benchmark tables,
# ranked highest so we try them before a school's (often anti-bot) landing page.
PREFERRED_SOURCES = (
    "diemthi.tuyensinh247", "tuyensinh247", "bigschool", "giaoducthoidai",
    "vnexpress", "dantri", "thanhnien", "tuoitre", "vietnamnet", "giaoduc.net",
)


def _source_rank(title: str) -> tuple:
    t = (title or "").lower()
    for i, src in enumerate(PREFERRED_SOURCES):
        if src in t:
            return (2, -i)
    return (1, 0) if ".edu.vn" in t else (0, 0)


def find_candidates(client, name: str) -> list[str]:
    """Return real source URLs for the school's 2025 điểm chuẩn, best first.

    The model's free-text URLs were inconsistent and sometimes hallucinated
    (404). Instead we read `grounding_metadata.grounding_chunks` — the actual
    pages the search retrieved — as candidates, ranked by domain (clean score
    aggregators first). These are Google redirect URLs that resolve to the real
    page when fetched.
    """
    from google.genai import types

    prompt = (
        f"Tìm bảng ĐIỂM CHUẨN năm 2025 (điểm trúng tuyển theo ngành) của {name}. "
        f"Tra trên các trang điểm chuẩn lớn (tuyensinh247, diemthi.tuyensinh247, "
        f"bigschool, giaoducthoidai, vnexpress) và website chính thức của trường."
    )
    cfg = types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())], temperature=0.2
    )
    resp = client.models.generate_content(
        model=config.GEMINI_MODEL, contents=prompt, config=cfg
    )

    ranked: list[tuple] = []
    cand = resp.candidates[0] if resp.candidates else None
    gm = getattr(cand, "grounding_metadata", None) if cand else None
    for ch in (getattr(gm, "grounding_chunks", None) or []):
        web = getattr(ch, "web", None)
        uri = getattr(web, "uri", None) if web else None
        if uri:
            ranked.append((_source_rank(getattr(web, "title", "") or ""), uri))
    for url in re.findall(r"https?://[^\s)\]]+", gather_text(resp)):
        ranked.append(((0, 0), url))

    seen: set[str] = set()
    out: list[tuple] = []
    for rank, uri in ranked:
        if uri in seen:
            continue
        seen.add(uri)
        out.append((rank, uri))
    out.sort(key=lambda x: x[0], reverse=True)
    return [uri for _, uri in out[:5]]


def fetch_page(url: str):
    """fetcher.fetch, but fall back to Playwright on anti-bot HTTP errors (403/429/503)."""
    try:
        return fetcher.fetch(url)
    except requests.exceptions.HTTPError as e:
        status = getattr(e.response, "status_code", None)
        if status in (403, 406, 429, 503):
            return fetcher.fetch_with_playwright(url)
        raise


def build_extract_prompt(name: str, url: str, text: str, links: list[dict]) -> str:
    links_block = "\n".join(f"- {ln['label']} -> {ln['url']}" for ln in links)
    return f"""Bạn là trợ lý trích xuất ĐIỂM CHUẨN tuyển sinh đại học Việt Nam.

Trường: {name}
URL: {url}
Năm cần lấy: ĐIỂM CHUẨN NĂM 2025 (điểm trúng tuyển 2025).

Phân tích NỘI DUNG TRANG + DANH SÁCH LINK, trả về DUY NHẤT một object JSON
(không markdown):

{{
  "status": "success | partial | needs_deeper_crawl",
  "data": [ <record theo schema bên dưới> ],
  "suggested_links": [ "<1-2 URL khả năng cao chứa bảng điểm chuẩn 2025>" ],
  "note": "<ghi chú ngắn tiếng Việt>"
}}

Quy tắc status:
- "success": trang CHỨA bảng điểm chuẩn 2025 theo ngành -> điền "data".
- "needs_deeper_crawl": chỉ là menu/landing, không có bảng điểm -> data=[],
  chọn "suggested_links" TỪ DANH SÁCH LINK (chỉ URL có thật).
- "partial": có một phần điểm chuẩn.

Schema mỗi record trong "data":
{{
  "school_major_code": "mã ngành của trường hoặc null",
  "major_name": "tên ngành (bắt buộc)",
  "admission_method": "diem_thi_thpt | hoc_ba | dgnl_hn | dgnl_hcm | dg_tu_duy | xt_rieng | ket_hop",
  "combination_code": "tổ hợp xét tuyển, vd A00/D01, hoặc null nếu không tách tổ hợp",
  "score": 25.5,
  "scale": 30
}}

QUAN TRỌNG:
- CHỈ lấy điểm chuẩn NĂM 2025. Bỏ qua các năm khác.
- "score" là số điểm chuẩn (điểm trúng tuyển). KHÔNG bịa.
- "scale": 30 cho điểm thi THPT/học bạ; nếu là ĐGNL HCM dùng 1200, ĐGNL HN dùng 150.
- Cố gắng lấy "school_major_code" nếu trang có cột mã ngành. Dùng null nếu không có.

=== DANH SÁCH LINK ===
{links_block}

=== NỘI DUNG TRANG ===
{text}
"""


def extract_from_url(client, name: str, url: str) -> dict:
    from google.genai import types

    resp = fetch_page(url)
    final_url = str(resp.url)
    text, links = clean_html(resp.text, final_url)
    prompt = build_extract_prompt(name, final_url, text[:MAX_TEXT_CHARS], links[:MAX_LINKS])
    cfg = types.GenerateContentConfig(response_mime_type="application/json", temperature=0)
    out = parse_json_object(gather_text(
        client.models.generate_content(model=config.GEMINI_MODEL, contents=prompt, config=cfg)
    ))
    status = out.get("status")
    out["status"] = status if status in VALID_STATUSES else (
        "partial" if out.get("data") else "needs_deeper_crawl")
    out.setdefault("data", [])
    out.setdefault("suggested_links", [])
    out.setdefault("note", "")
    out["_source_url"] = final_url
    return out


def log_error(msg: str) -> None:
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] {msg}\n")


def crawl_one(client, code: str, name: str) -> dict:
    """Try candidate sources until one yields a 2025 score table.

    Candidates come from grounding metadata (real retrieved pages). We fetch +
    extract each in rank order and return the first with records; otherwise we
    keep the best landing page and follow its top suggested link once.
    """
    candidates = find_candidates(client, name)
    if not candidates:
        return {"found_url": "", "status": "no_url", "data": [], "note": "no candidates"}

    best = {"found_url": "", "status": "needs_deeper_crawl", "data": [], "note": ""}
    for url in candidates:
        try:
            result = extract_from_url(client, name, url)
        except Exception as e:  # noqa: BLE001 — bad URL/anti-bot, try next candidate
            log_error(f"{code} | extract {url[:80]}: {e}")
            continue
        if result.get("data"):
            result["found_url"] = result.get("_source_url", url)
            return result
        if not best["data"]:
            best = {**result, "found_url": result.get("_source_url", url)}

    # The best candidate was a landing/menu: follow its top suggestion once.
    for nxt in (best.get("suggested_links") or [])[:1]:
        try:
            deeper = extract_from_url(client, name, nxt)
            if deeper.get("data"):
                deeper["found_url"] = deeper.get("_source_url", nxt)
                return deeper
        except Exception as e:  # noqa: BLE001
            log_error(f"{code} | deeper {nxt[:80]}: {e}")
    return best


def read_rows() -> list[dict]:
    if not INPUT_CSV.is_file():
        config.fail(f"Input file not found: {INPUT_CSV}")
    with INPUT_CSV.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_done() -> set[str]:
    """Codes already crawled with ≥1 record (resume; retry empties)."""
    done: set[str] = set()
    if SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0:
        with SUMMARY_CSV.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                if (r.get("university_code") or "").strip() and int(r.get("num_records") or 0) > 0:
                    done.add(r["university_code"].strip())
    return done


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawl 2025 điểm chuẩn for priority schools.")
    parser.add_argument("--limit", type=int, default=None, help="chỉ N trường đầu (test)")
    args = parser.parse_args()

    rows = read_rows()
    if args.limit is not None:
        rows = rows[: args.limit]
    done = load_done()
    todo = [r for r in rows if (r.get("university_code") or "").strip() not in done]
    print(f"Phạm vi: {len(rows)} trường | đã có data: {len(rows) - len(todo)} | "
          f"sẽ crawl: {len(todo)}\n")
    if not todo:
        print("Không có trường nào cần crawl."); return

    client = config.get_genai_client()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    write_header = not (SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0)
    grounding_calls = 0

    with SUMMARY_CSV.open("a", encoding="utf-8", newline="") as sf:
        writer = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        if write_header:
            writer.writeheader()

        for i, row in enumerate(todo, start=1):
            code = (row.get("university_code") or "").strip()
            name = (row.get("university_name") or "").strip()
            print(f"[{i}/{len(todo)}] {name}...", flush=True)

            result: dict | None = None
            for attempt in range(1, MAX_RETRIES + 2):
                try:
                    result = crawl_one(client, code, name)
                    grounding_calls += 1
                    break
                except Exception as e:  # noqa: BLE001
                    if attempt <= MAX_RETRIES:
                        time.sleep(RETRY_BACKOFF_SEC * attempt); continue
                    log_error(f"{code} | {name} | attempt {attempt}: {e}")

            if result is None:
                result = {"found_url": "", "status": "error", "data": [], "note": "see log"}

            data = result.get("data") or []
            (RESULTS_DIR / f"{code}.json").write_text(
                json.dumps({
                    "university_code": code, "university_name": name,
                    "found_url": result.get("found_url", ""), "year": TARGET_YEAR,
                    "status": result["status"], "num_records": len(data), "data": data,
                }, ensure_ascii=False, indent=2), encoding="utf-8")

            print(f"    -> {result['status']}, records: {len(data)} "
                  f"({result.get('found_url','')[:70]})")
            writer.writerow({
                "university_code": code, "university_name": name,
                "found_url": result.get("found_url", ""), "status": result["status"],
                "num_records": len(data), "note": (result.get("note") or "")[:200],
            })
            sf.flush()
            time.sleep(REQUEST_DELAY_SEC)

    print(f"\n✅ Xong {len(todo)} trường. ~{grounding_calls} grounding calls.")
    print(f"   Summary: {SUMMARY_CSV}\n   JSON: {RESULTS_DIR}/")


if __name__ == "__main__":
    main()
