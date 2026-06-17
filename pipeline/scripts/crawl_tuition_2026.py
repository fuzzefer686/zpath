"""Crawl 2026 tuition (học phí) for schools that have programs but no fees.

Many đề án pages list majors without fees (fees sit in a separate "Học phí"
section/page), so the program crawl missed them. This crawler is tuition-focused:
per school it finds the học phí page and extracts, per major where possible,
{school_major_code, major_name, tuition_min, tuition_max} in TRIỆU VND/năm, plus
a school-wide fallback range when only one figure is published.

Reuses crawl_programs_2026's anti-bot fetch + grounding ranking. Output is later
matched onto existing admissions rows by apply_tuition.py (UPDATE tuition only,
never overwriting exam_blocks/score).

Output:
  data/output/tuition_2026_results/<code>.json
  data/output/tuition_2026_summary.csv

Run from the pipeline root:
  .venv/bin/python scripts/crawl_tuition_2026.py --csv data/input/tuition_batch.csv --limit 2
  .venv/bin/python scripts/crawl_tuition_2026.py --csv data/input/tuition_batch.csv
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
from crawl_diemchuan_2025 import fetch_page, _source_rank

RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "tuition_2026_results"
SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "tuition_2026_summary.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "tuition_2026_errors.log"
SUMMARY_FIELDS = ["university_code", "university_name", "found_url", "status",
                  "num_records", "school_wide", "note"]

MAX_TEXT_CHARS = 120_000
MAX_LINKS = 150
REQUEST_DELAY_SEC = 2.0
VALID_STATUSES = {"success", "partial", "needs_deeper_crawl"}


def find_candidates(client, name: str) -> list[str]:
    """Real source URLs for the school's 2026 tuition page, best first."""
    from google.genai import types

    prompt = (
        f"Tìm thông tin HỌC PHÍ đại học chính quy năm 2026 (hoặc 2025-2026) của "
        f"{name}: mức học phí theo ngành/nhóm ngành, đơn vị đồng hoặc triệu/năm. "
        f"Tra đề án tuyển sinh 2026 trên website chính thức (.edu.vn) và các trang "
        f"tuyensinhso, tuyensinh247, diemthi.tuyensinh247."
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


def build_prompt(name: str, url: str, text: str, links: list[dict]) -> str:
    links_block = "\n".join(f"- {ln['label']} -> {ln['url']}" for ln in links)
    return f"""Bạn là trợ lý trích xuất HỌC PHÍ tuyển sinh đại học Việt Nam.

Trường: {name}
URL: {url}
Mục tiêu: lấy MỨC HỌC PHÍ năm 2026 (hoặc 2025-2026) theo từng ngành nếu có; nếu
trang chỉ nêu một mức/khoảng chung cho toàn trường thì điền "school_wide".

QUAN TRỌNG VỀ ĐƠN VỊ: quy MỌI con số về TRIỆU VND/NĂM.
- "15.000.000 đồng/năm" -> 15 ; "1.500.000 đồng/tháng" -> 15 (x10 tháng) ;
  "35 triệu/năm" -> 35. Nếu là học phí/tín chỉ hoặc /kỳ và không suy ra được
  năm thì BỎ QUA (đừng đoán).

Trả về DUY NHẤT một object JSON (không markdown):
{{
  "status": "success | partial | needs_deeper_crawl",
  "school_wide": {{"tuition_min": <triệu/năm hoặc null>, "tuition_max": <triệu/năm hoặc null>}},
  "data": [
    {{"school_major_code": "mã ngành hoặc null", "major_name": "tên ngành",
      "tuition_min": <triệu/năm>, "tuition_max": <triệu/năm hoặc bằng min>}}
  ],
  "suggested_links": ["<URL khả năng cao chứa bảng học phí>"],
  "note": "<ghi chú ngắn>"
}}

Quy tắc:
- "success"/"partial": trang có học phí -> điền "data" (theo ngành) và/hoặc "school_wide".
- "needs_deeper_crawl": không có học phí -> data=[], chọn suggested_links TỪ DANH SÁCH LINK.
- KHÔNG bịa số. Thiếu thì để null.

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
    prompt = build_prompt(name, final_url, text[:MAX_TEXT_CHARS], links[:MAX_LINKS])
    cfg = types.GenerateContentConfig(response_mime_type="application/json", temperature=0)
    out = parse_json_object(gather_text(
        client.models.generate_content(model=config.GEMINI_MODEL, contents=prompt, config=cfg)
    ))
    status = out.get("status")
    out["status"] = status if status in VALID_STATUSES else (
        "partial" if out.get("data") or out.get("school_wide") else "needs_deeper_crawl")
    out.setdefault("data", [])
    out.setdefault("school_wide", {})
    out.setdefault("suggested_links", [])
    out.setdefault("note", "")
    out["_source_url"] = final_url
    return out


def log_error(msg: str) -> None:
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{datetime.now(timezone.utc).isoformat()}] {msg}\n")


def _has_fee(out: dict) -> bool:
    if any(r.get("tuition_min") is not None for r in (out.get("data") or [])):
        return True
    sw = out.get("school_wide") or {}
    return sw.get("tuition_min") is not None


def crawl_one(client, code: str, name: str) -> dict:
    candidates = find_candidates(client, name)
    if not candidates:
        return {"found_url": "", "status": "no_url", "data": [], "school_wide": {}, "note": "no candidates"}
    best = {"found_url": "", "status": "needs_deeper_crawl", "data": [], "school_wide": {}, "note": ""}
    for url in candidates:
        try:
            r = extract_from_url(client, name, url)
        except Exception as e:  # noqa: BLE001
            log_error(f"{code} | extract {url[:80]}: {e}")
            continue
        if _has_fee(r):
            r["found_url"] = r.get("_source_url", url)
            return r
        if not best["data"]:
            best = {**r, "found_url": r.get("_source_url", url)}
    for nxt in (best.get("suggested_links") or [])[:1]:
        try:
            deeper = extract_from_url(client, name, nxt)
            if _has_fee(deeper):
                deeper["found_url"] = deeper.get("_source_url", nxt)
                return deeper
        except Exception as e:  # noqa: BLE001
            log_error(f"{code} | deeper {nxt[:80]}: {e}")
    return best


def read_scope(csv_path: str, codes_arg: str | None):
    from pathlib import Path
    path = Path(csv_path)
    if not path.is_file():
        config.fail(f"--csv not found: {path}")
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = [(r["university_code"].strip(), r["university_name"].strip())
                for r in csv.DictReader(f) if (r.get("university_code") or "").strip()]
    if codes_arg:
        wanted = {c.strip() for c in codes_arg.split(",") if c.strip()}
        rows = [(c, n) for c, n in rows if c in wanted]
    return rows


def load_done() -> set[str]:
    done: set[str] = set()
    if SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0:
        with SUMMARY_CSV.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                has = int(r.get("num_records") or 0) > 0 or (r.get("school_wide") or "").strip() not in ("", "{}", "None")
                if (r.get("university_code") or "").strip() and has:
                    done.add(r["university_code"].strip())
    return done


def main() -> None:
    parser = argparse.ArgumentParser(description="Crawl 2026 tuition for fee-less schools.")
    parser.add_argument("--csv", type=str, required=True)
    parser.add_argument("--codes", type=str, default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    scope = read_scope(args.csv, args.codes)
    if args.limit is not None:
        scope = scope[: args.limit]
    done = set() if args.force else load_done()
    todo = [(c, n) for c, n in scope if c not in done]
    print(f"Phạm vi: {len(scope)} | đã có: {len(scope) - len(todo)} | sẽ crawl: {len(todo)}\n")
    if not todo:
        print("Không có trường nào cần crawl."); return

    client = config.get_genai_client()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    write_header = not (SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0)
    with SUMMARY_CSV.open("a", encoding="utf-8", newline="") as sf:
        writer = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        if write_header:
            writer.writeheader()
        for i, (code, name) in enumerate(todo, start=1):
            print(f"[{i}/{len(todo)}] {code} {name}...", flush=True)
            try:
                r = crawl_one(client, code, name)
            except Exception as e:  # noqa: BLE001
                log_error(f"{code} | {name}: {e}")
                r = {"found_url": "", "status": "error", "data": [], "school_wide": {}, "note": "see log"}
            data = r.get("data") or []
            sw = r.get("school_wide") or {}
            (RESULTS_DIR / f"{code}.json").write_text(json.dumps({
                "university_code": code, "university_name": name,
                "found_url": r.get("found_url", ""), "status": r["status"],
                "num_records": len(data), "school_wide": sw, "data": data,
            }, ensure_ascii=False, indent=2), encoding="utf-8")
            sw_str = f"{sw.get('tuition_min')}-{sw.get('tuition_max')}" if sw.get("tuition_min") is not None else ""
            print(f"    -> {r['status']}, ngành có học phí: {len(data)}, school_wide: {sw_str or '-'} "
                  f"({r.get('found_url','')[:60]})")
            writer.writerow({
                "university_code": code, "university_name": name,
                "found_url": r.get("found_url", ""), "status": r["status"],
                "num_records": len(data), "school_wide": json.dumps(sw, ensure_ascii=False),
                "note": (r.get("note") or "")[:200],
            })
            sf.flush()
            time.sleep(REQUEST_DELAY_SEC)
    print(f"\n✅ Xong {len(todo)} trường.\n   Summary: {SUMMARY_CSV}\n   JSON: {RESULTS_DIR}/")


if __name__ == "__main__":
    main()
