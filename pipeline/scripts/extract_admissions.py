"""Attempt admission-data extraction directly from each university's URL.

For every row in admission_urls.csv this fetches the page, cleans the HTML to
text + a link list, and asks Gemini to either (a) extract admission records,
(b) report the page is just a landing/menu and suggest deeper links, or
(c) report a partial extraction. Results help decide whether a dedicated
"deep link discovery" step is needed.

Note: extraction does NOT use Search Grounding (we pass the page content
directly), so we CAN use response_mime_type="application/json" for clean,
single-part JSON output — unlike find_admission_urls.py.

Run from the pipeline root:  python scripts/extract_admissions.py
"""

from __future__ import annotations

import csv
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

import config
import fetcher  # shared HTTP fetch with SSL fallback
from find_admission_urls import gather_text  # reuse multi-part text join

INPUT_CSV = config.PIPELINE_ROOT / "data" / "output" / "admission_urls.csv"
RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "extraction_results"
SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "extraction_summary.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "extract_errors.log"

SUMMARY_FIELDS = [
    "university_code",
    "university_name",
    "status",
    "num_records_extracted",
    "note",
]

MAX_TEXT_CHARS = 100_000   # cap cleaned page text fed to the model
MAX_LINKS = 150            # cap links fed to the model
MAX_RETRIES = 2            # retries per school on transient model failures
RETRY_BACKOFF_SEC = 5.0
REQUEST_DELAY_SEC = 2.0

VALID_STATUSES = {"success", "partial", "needs_deeper_crawl"}


def clean_html(html: str, base_url: str) -> tuple[str, list[dict]]:
    """Strip HTML to readable text and a deduped list of absolute links."""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)

    links: list[dict] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"].strip())
        if urlparse(href).scheme not in ("http", "https"):
            continue
        if href in seen:
            continue
        seen.add(href)
        label = a.get_text(" ", strip=True)[:120]
        links.append({"url": href, "label": label})
        if len(links) >= MAX_LINKS:
            break

    return text[:MAX_TEXT_CHARS], links


def build_prompt(name: str, url: str, text: str, links: list[dict]) -> str:
    """Instruction asking the model to extract data or classify the page."""
    links_block = "\n".join(f"- {ln['label']} -> {ln['url']}" for ln in links)
    return f"""Bạn là trợ lý trích xuất dữ liệu tuyển sinh đại học Việt Nam.

Trường: {name}
URL trang: {url}

Hãy phân tích NỘI DUNG TRANG và DANH SÁCH LINK bên dưới, rồi trả về DUY NHẤT
một object JSON hợp lệ (không markdown) theo đúng cấu trúc:

{{
  "status": "success | partial | needs_deeper_crawl",
  "data": [ <các record theo schema bên dưới> ],
  "suggested_links": [ "<2-3 URL khả năng cao chứa đề án/điểm chuẩn, ưu tiên PDF>" ],
  "note": "<ghi chú ngắn bằng tiếng Việt>"
}}

Quy tắc chọn status:
- "success": trang CHỨA TRỰC TIẾP bảng/danh sách ngành kèm điểm chuẩn/khối thi/học phí
  -> điền đầy đủ "data", "suggested_links" để [].
- "needs_deeper_crawl": trang CHỈ LÀ MENU/LANDING, không có số liệu cụ thể
  -> "data" = [], chọn "suggested_links" từ DANH SÁCH LINK bên dưới (chỉ dùng URL
  có thật trong danh sách).
- "partial": thấy một phần dữ liệu HOẶC thấy link PDF đề án nhưng chưa có số liệu đầy đủ
  -> điền phần "data" lấy được + "suggested_links".

Schema mỗi record trong "data" (khớp bảng admissions_staging):
{{
  "school_major_code": "string hoặc null",
  "major_name": "string",
  "year": "<năm tuyển sinh thực tế đọc được từ nội dung, vd 2025 hoặc 2026, KHÔNG copy số ví dụ này>",
  "admission_method": "diem_thi_thpt | hoc_ba | dgnl_hn | dgnl_hcm | xt_rieng | ket_hop | dg_tu_duy",
  "exam_blocks": ["A00","A01"],
  "score": 25.5,
  "program_type": "chuan | quoc_te | tien_tien",
  "tuition_min": 25,
  "tuition_max": 30
}}

QUAN TRỌNG:
- Dùng null cho field không chắc chắn. TUYỆT ĐỐI KHÔNG bịa số liệu.
- "year" PHẢI lấy từ nội dung văn bản, KHÔNG dùng giá trị mặc định. Nếu không
  xác định được năm trong nội dung, đặt year = null.

=== DANH SÁCH LINK ===
{links_block}

=== NỘI DUNG TRANG ===
{text}
"""


def parse_json_object(text: str) -> dict:
    """Parse the model's JSON answer, tolerating fences/surrounding prose."""
    if not text:
        raise ValueError("empty response text")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else None
    if candidate is None:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError(f"no JSON object found in: {text[:200]!r}")
        candidate = match.group(0)
    return json.loads(candidate)


def extract_one(client, name: str, url: str) -> dict:
    """Fetch + clean + call Gemini. Returns the parsed result dict."""
    from google.genai import types

    resp = fetcher.fetch(url)
    final_url = str(resp.url)
    text, links = clean_html(resp.text, final_url)
    prompt = build_prompt(name, final_url, text, links)

    gen_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0,
    )
    resp = client.models.generate_content(
        model=config.GEMINI_MODEL, contents=prompt, config=gen_config
    )
    result = parse_json_object(gather_text(resp))

    # Normalize fields so downstream code can rely on them.
    status = result.get("status")
    if status not in VALID_STATUSES:
        status = "partial" if result.get("data") else "needs_deeper_crawl"
    result["status"] = status
    result.setdefault("data", [])
    result.setdefault("suggested_links", [])
    result.setdefault("note", "")
    return result


def log_error(message: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{ts}] {message}\n")


def read_rows() -> list[dict]:
    if not INPUT_CSV.is_file():
        config.fail(f"Input file not found: {INPUT_CSV}")
    with INPUT_CSV.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def main() -> None:
    rows = read_rows()
    total = len(rows)
    print(f"Loaded {total} universities from {INPUT_CSV.name}\n")

    client = config.get_genai_client()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    with SUMMARY_CSV.open("w", encoding="utf-8", newline="") as sf:
        writer = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        writer.writeheader()

        for i, row in enumerate(rows, start=1):
            code = (row.get("university_code") or "").strip()
            name = (row.get("university_name") or "").strip()
            url = (row.get("found_url") or "").strip()

            if not url:
                print(f"[{i}/{total}] {name} -> status: error, records: 0 (no URL)")
                writer.writerow({
                    "university_code": code, "university_name": name,
                    "status": "error", "num_records_extracted": 0,
                    "note": "missing found_url",
                })
                sf.flush()
                continue

            result: dict | None = None
            for attempt in range(1, MAX_RETRIES + 2):
                try:
                    result = extract_one(client, name, url)
                    break
                except requests.RequestException as e:
                    log_error(f"{code} | {name} | fetch failed: {e}")
                    break  # fetch errors won't fix on retry
                except Exception as e:  # noqa: BLE001 — model/parse errors
                    if attempt <= MAX_RETRIES:
                        time.sleep(RETRY_BACKOFF_SEC * attempt)
                        continue
                    log_error(f"{code} | {name} | attempt {attempt} failed: {e}")

            if result is None:
                status, num, note = "error", 0, "see extract_errors.log"
            else:
                status = result["status"]
                num = len(result.get("data") or [])
                note = (result.get("note") or "")[:300]
                # Persist the raw model response per school.
                (RESULTS_DIR / f"{code}.json").write_text(
                    json.dumps(result, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )

            print(f"[{i}/{total}] {name} -> status: {status}, records: {num}")
            writer.writerow({
                "university_code": code, "university_name": name,
                "status": status, "num_records_extracted": num, "note": note,
            })
            sf.flush()

            if i < total:
                time.sleep(REQUEST_DELAY_SEC)

    print(f"\n✅ Xong. Summary: {SUMMARY_CSV}")
    print(f"   Raw JSON: {RESULTS_DIR}/")
    if ERROR_LOG.is_file():
        print(f"⚠️  Có lỗi tại: {ERROR_LOG}")


if __name__ == "__main__":
    main()
