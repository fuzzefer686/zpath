"""Milestone 2.1 — crawl the FULL 2026 major list for under-covered schools.

The original Pass A (run_pipeline.py) captured 2026 đề án data but thin/wrong for
many schools (e.g. PTIT only 3 programs). This crawler, like crawl_diemchuan_2025
but aimed at the admission-PLAN page, per school:

  1. Google-Search-grounded lookup for the 2026 đề án / tuyển sinh page (or a
     tuyensinh247/tuyensinhso aggregator listing all majors).
  2. Fetch + clean, then ask Gemini to list EVERY undergraduate major with its
     code / exam blocks / quota / tuition (year fixed to 2026 downstream).
  3. If the page is a landing/menu, follow ONE suggested link once.

Scope = schools marked "thiếu" in data/output/coverage_audit.csv (default), or an
explicit --codes list. Reuses fetch_page / extract plumbing from the diemchuan
crawler so anti-bot fallback (Playwright) and grounding ranking behave the same.

Output:
  data/output/programs_2026_results/<code>.json   (per school)
  data/output/programs_2026_summary.csv

Run from the pipeline root:
  .venv/bin/python scripts/crawl_programs_2026.py --limit 2     # sample first
  .venv/bin/python scripts/crawl_programs_2026.py               # all "thiếu"
  .venv/bin/python scripts/crawl_programs_2026.py --codes BVH,CTS
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import time
from datetime import datetime, timezone

import config
from find_admission_urls import gather_text
from extract_admissions import clean_html, parse_json_object
# Reuse the diemchuan crawler's anti-bot fetch + domain ranking unchanged.
from crawl_diemchuan_2025 import fetch_page, _source_rank

AUDIT_CSV = config.PIPELINE_ROOT / "data" / "output" / "coverage_audit.csv"
RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "programs_2026_results"
SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "programs_2026_summary.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "programs_2026_errors.log"

SUMMARY_FIELDS = ["university_code", "university_name", "found_url",
                  "status", "num_records", "data_year", "note"]
TARGET_YEAR = 2026

MAX_TEXT_CHARS = 120_000
MAX_LINKS = 150
MAX_RETRIES = 2
RETRY_BACKOFF_SEC = 5.0
REQUEST_DELAY_SEC = 2.0
VALID_STATUSES = {"success", "partial", "needs_deeper_crawl"}
VALID_METHODS = {"diem_thi_thpt", "hoc_ba", "dgnl_hn", "dgnl_hcm",
                 "dg_tu_duy", "xt_rieng", "ket_hop"}


def find_candidates(client, name: str) -> list[str]:
    """Real source URLs for the school's 2026 major list, best first.

    Same grounding-metadata approach as the diemchuan crawler, but the prompt
    targets the admission-PLAN (đề án/danh sách ngành) rather than score tables.
    """
    from google.genai import types

    prompt = (
        f"Tìm DANH SÁCH NGÀNH tuyển sinh đại học chính quy năm 2026 của {name} "
        f"(đề án tuyển sinh 2026 / danh mục ngành & mã ngành & tổ hợp xét tuyển). "
        f"Nếu chưa có 2026, tìm danh sách ngành năm 2025. Tra trên website chính "
        f"thức của trường (.edu.vn) và các trang tuyensinhso, tuyensinh247, "
        f"diemthi.tuyensinh247."
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


def build_extract_prompt(name: str, url: str, text: str, links: list[dict]) -> str:
    links_block = "\n".join(f"- {ln['label']} -> {ln['url']}" for ln in links)
    return f"""Bạn là trợ lý trích xuất DANH SÁCH NGÀNH tuyển sinh đại học Việt Nam.

Trường: {name}
URL: {url}
Mục tiêu: LIỆT KÊ TẤT CẢ ngành đào tạo đại học chính quy. Ưu tiên năm 2026;
nếu trang chỉ có 2025 thì lấy 2025 và đặt "data_year": 2025.

Phân tích NỘI DUNG TRANG + DANH SÁCH LINK, trả về DUY NHẤT một object JSON
(không markdown):

{{
  "status": "success | partial | needs_deeper_crawl",
  "data_year": 2026,
  "data": [ <record theo schema bên dưới> ],
  "suggested_links": [ "<1-2 URL khả năng cao chứa danh sách ngành đầy đủ>" ],
  "note": "<ghi chú ngắn tiếng Việt>"
}}

Quy tắc status:
- "success": trang CHỨA danh sách ngành -> điền "data" với CÀNG NHIỀU ngành CÀNG TỐT.
- "needs_deeper_crawl": chỉ là menu/landing, không có danh sách ngành -> data=[],
  chọn "suggested_links" TỪ DANH SÁCH LINK (chỉ URL có thật).
- "partial": chỉ có một phần danh sách ngành.

Schema mỗi record trong "data":
{{
  "school_major_code": "mã ngành của trường (vd 7480201) hoặc null",
  "major_name": "tên ngành (bắt buộc)",
  "admission_method": "diem_thi_thpt | hoc_ba | dgnl_hn | dgnl_hcm | dg_tu_duy | xt_rieng | ket_hop",
  "combination_code": "các tổ hợp xét tuyển, vd 'A00; D01', hoặc null",
  "quota": <chỉ tiêu (số) hoặc null>,
  "tuition_min": <học phí thấp nhất triệu/năm hoặc null>,
  "tuition_max": <học phí cao nhất triệu/năm hoặc null>
}}

QUAN TRỌNG:
- LIỆT KÊ ĐẦY ĐỦ mọi ngành, KHÔNG bỏ sót, KHÔNG gộp.
- KHÔNG bịa mã ngành/học phí — thiếu thì để null.
- "admission_method": nếu không rõ, dùng "diem_thi_thpt".
- Mỗi ngành 1 record (nếu 1 ngành nhiều phương thức, ưu tiên diem_thi_thpt).

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
    try:
        out["data_year"] = int(out.get("data_year") or TARGET_YEAR)
    except (TypeError, ValueError):
        out["data_year"] = TARGET_YEAR
    out["_source_url"] = final_url
    return out


def log_error(msg: str) -> None:
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] {msg}\n")


def crawl_one(client, code: str, name: str) -> dict:
    """Try candidate sources until one yields a major list; else follow the best
    landing page's top suggestion once. Mirrors the diemchuan crawler."""
    candidates = find_candidates(client, name)
    if not candidates:
        return {"found_url": "", "status": "no_url", "data": [],
                "data_year": TARGET_YEAR, "note": "no candidates"}

    best = {"found_url": "", "status": "needs_deeper_crawl", "data": [],
            "data_year": TARGET_YEAR, "note": ""}
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

    for nxt in (best.get("suggested_links") or [])[:1]:
        try:
            deeper = extract_from_url(client, name, nxt)
            if deeper.get("data"):
                deeper["found_url"] = deeper.get("_source_url", nxt)
                return deeper
        except Exception as e:  # noqa: BLE001
            log_error(f"{code} | deeper {nxt[:80]}: {e}")
    return best


def read_scope(codes_arg: str | None) -> list[tuple[str, str]]:
    """(code, name) pairs to crawl: explicit --codes, or audit verdict == thiếu."""
    if not AUDIT_CSV.is_file():
        config.fail(f"Audit not found: {AUDIT_CSV} — chạy audit_coverage.py trước.")
    with AUDIT_CSV.open(encoding="utf-8-sig", newline="") as f:
        audit = list(csv.DictReader(f))
    name_by_code = {r["university_code"]: r["university_name"] for r in audit}
    if codes_arg:
        wanted = [c.strip() for c in codes_arg.split(",") if c.strip()]
        return [(c, name_by_code.get(c, c)) for c in wanted]
    return [(r["university_code"], r["university_name"])
            for r in audit if r.get("verdict") == "thiếu"]


def load_done() -> set[str]:
    done: set[str] = set()
    if SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0:
        with SUMMARY_CSV.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                if (r.get("university_code") or "").strip() and int(r.get("num_records") or 0) > 0:
                    done.add(r["university_code"].strip())
    return done


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawl full 2026 major list for under-covered schools.")
    parser.add_argument("--limit", type=int, default=None, help="chỉ N trường đầu (test)")
    parser.add_argument("--codes", type=str, default=None,
                        help="danh sách mã trường, vd BVH,CTS (bỏ qua verdict)")
    parser.add_argument("--force", action="store_true",
                        help="crawl lại cả trường đã có data (bỏ qua resume)")
    args = parser.parse_args()

    scope = read_scope(args.codes)
    if args.limit is not None:
        scope = scope[: args.limit]
    done = set() if args.force else load_done()
    todo = [(c, n) for c, n in scope if c not in done]
    print(f"Phạm vi: {len(scope)} trường | đã có data: {len(scope) - len(todo)} | "
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

        for i, (code, name) in enumerate(todo, start=1):
            print(f"[{i}/{len(todo)}] {code} {name}...", flush=True)
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
                result = {"found_url": "", "status": "error", "data": [],
                          "data_year": TARGET_YEAR, "note": "see log"}

            data = result.get("data") or []
            dyear = result.get("data_year", TARGET_YEAR)
            (RESULTS_DIR / f"{code}.json").write_text(
                json.dumps({
                    "university_code": code, "university_name": name,
                    "found_url": result.get("found_url", ""), "data_year": dyear,
                    "status": result["status"], "num_records": len(data), "data": data,
                }, ensure_ascii=False, indent=2), encoding="utf-8")

            print(f"    -> {result['status']}, records: {len(data)} (year {dyear}) "
                  f"({result.get('found_url','')[:70]})")
            writer.writerow({
                "university_code": code, "university_name": name,
                "found_url": result.get("found_url", ""), "status": result["status"],
                "num_records": len(data), "data_year": dyear,
                "note": (result.get("note") or "")[:200],
            })
            sf.flush()
            time.sleep(REQUEST_DELAY_SEC)

    print(f"\n✅ Xong {len(todo)} trường. ~{grounding_calls} grounding calls.")
    print(f"   Summary: {SUMMARY_CSV}\n   JSON: {RESULTS_DIR}/")


if __name__ == "__main__":
    main()
