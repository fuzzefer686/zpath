"""Follow suggested_links to extract real admission records.

Reads the extraction step's output, takes the suggested_links from schools
that still need a deeper crawl (status needs_deeper_crawl / partial), fetches
each link, and extracts admission records with Gemini:

  - HTML link  -> clean text -> Gemini (text).
  - PDF with a text layer -> pdfplumber text -> Gemini (text).
  - Scanned PDF (little/no text) -> Gemini multimodal (reads the PDF bytes).

Unlike extract_admissions.py, each link is assumed to be a concrete page/file,
so the model only returns success/partial (no needs_deeper_crawl branch).

Run from the pipeline root:  python scripts/deep_crawl.py
"""

from __future__ import annotations

import csv
import io
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber
import requests

import config
import fetcher
from extract_admissions import clean_html, parse_json_object
from find_admission_urls import gather_text

EXTRACTION_DIR = config.PIPELINE_ROOT / "data" / "output" / "extraction_results"
RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "deep_extraction_results"
SUMMARY_CSV = config.PIPELINE_ROOT / "data" / "output" / "deep_extraction_summary.csv"
ERROR_LOG = config.PIPELINE_ROOT / "data" / "output" / "deep_crawl_errors.log"

SUMMARY_FIELDS = [
    "university_code",
    "link_used",
    "status",
    "num_records_extracted",
]

MAX_LINKS_PER_SCHOOL = 2     # control cost: only the top suggested links
MAX_TEXT_CHARS = 120_000
MIN_PDF_TEXT_CHARS = 200     # below this, treat the PDF as scanned
MAX_PDF_BYTES = 30 * 1024 * 1024  # skip very large PDFs for inline multimodal
MAX_RETRIES = 2
RETRY_BACKOFF_SEC = 5.0
REQUEST_DELAY_SEC = 2.0

CRAWL_STATUSES = {"needs_deeper_crawl", "partial"}


def build_prompt(university_name: str, source: str, content_text: str | None) -> str:
    """Extraction instruction for a concrete admission page/PDF."""
    head = f"""Bạn là trợ lý trích xuất dữ liệu tuyển sinh đại học Việt Nam.

Trường: {university_name}
Nguồn: {source}

Hãy trích xuất dữ liệu tuyển sinh từ nội dung dưới đây và trả về DUY NHẤT một
object JSON hợp lệ (không markdown):

{{
  "status": "success | partial",
  "data": [ <các record theo schema bên dưới> ],
  "note": "<ghi chú ngắn bằng tiếng Việt>"
}}

- "success": trích xuất được đầy đủ danh sách ngành kèm số liệu.
- "partial": chỉ lấy được một phần (vd: có ngành nhưng thiếu điểm/học phí).

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
  xác định được năm trong nội dung, đặt year = null."""

    if content_text is not None:
        return head + f"\n\n=== NỘI DUNG ===\n{content_text[:MAX_TEXT_CHARS]}"
    # Multimodal: the PDF bytes are attached separately as a Part.
    return head + "\n\n(Nội dung nằm trong file PDF đính kèm — hãy đọc trực tiếp.)"


def is_pdf(resp: requests.Response) -> bool:
    ctype = resp.headers.get("content-type", "").lower()
    path = resp.url.split("?")[0].lower()
    return "application/pdf" in ctype or path.endswith(".pdf")


def pdf_text(content: bytes) -> str:
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        return "\n".join((page.extract_text() or "") for page in pdf.pages).strip()


def extract_from_link(client, university_name: str, url: str) -> dict:
    """Fetch one link, pick the right input mode, and extract via Gemini."""
    from google.genai import types

    resp = fetcher.fetch(url)
    gen_config = types.GenerateContentConfig(
        response_mime_type="application/json", temperature=0
    )

    if is_pdf(resp):
        text = pdf_text(resp.content)
        if len(text) >= MIN_PDF_TEXT_CHARS:
            source = f"PDF (text layer): {resp.url}"
            prompt = build_prompt(university_name, source, text)
            model_resp = client.models.generate_content(
                model=config.GEMINI_MODEL, contents=prompt, config=gen_config
            )
        else:
            # Scanned PDF -> let Gemini read the bytes directly (multimodal).
            if len(resp.content) > MAX_PDF_BYTES:
                raise ValueError(f"scanned PDF too large for inline read ({len(resp.content)} bytes)")
            source = f"PDF (scan, multimodal): {resp.url}"
            prompt = build_prompt(university_name, source, None)
            pdf_part = types.Part.from_bytes(
                data=resp.content, mime_type="application/pdf"
            )
            model_resp = client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=[prompt, pdf_part],
                config=gen_config,
            )
    else:
        text, _links = clean_html(resp.text, str(resp.url))
        source = f"HTML: {resp.url}"
        prompt = build_prompt(university_name, source, text)
        model_resp = client.models.generate_content(
            model=config.GEMINI_MODEL, contents=prompt, config=gen_config
        )

    result = parse_json_object(gather_text(model_resp))
    status = result.get("status")
    result["status"] = status if status in {"success", "partial"} else (
        "success" if result.get("data") else "partial"
    )
    result.setdefault("data", [])
    result.setdefault("note", "")
    result["source"] = source
    return result


def log_error(message: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    with ERROR_LOG.open("a", encoding="utf-8") as f:
        f.write(f"[{ts}] {message}\n")


def load_targets() -> list[dict]:
    """Read per-school suggested_links from the extraction step results."""
    targets: list[dict] = []
    for json_file in sorted(EXTRACTION_DIR.glob("*.json")):
        data = json.loads(json_file.read_text(encoding="utf-8"))
        if data.get("status") not in CRAWL_STATUSES:
            continue
        links = (data.get("suggested_links") or [])[:MAX_LINKS_PER_SCHOOL]
        if links:
            targets.append({"code": json_file.stem, "links": links})
    return targets


def main() -> None:
    if not EXTRACTION_DIR.is_dir():
        config.fail(f"Extraction results not found: {EXTRACTION_DIR}")

    targets = load_targets()
    total_links = sum(len(t["links"]) for t in targets)
    print(f"{len(targets)} trường cần crawl sâu, tổng {total_links} link\n")

    client = config.get_genai_client()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    with SUMMARY_CSV.open("w", encoding="utf-8", newline="") as sf:
        writer = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        writer.writeheader()

        step = 0
        for target in targets:
            code = target["code"]
            school_records: list[dict] = []
            for url in target["links"]:
                step += 1
                print(f"[{step}/{total_links}] {code} <- {url}", end=" ", flush=True)

                result: dict | None = None
                for attempt in range(1, MAX_RETRIES + 2):
                    try:
                        result = extract_from_link(client, code, url)
                        break
                    except requests.RequestException as e:
                        log_error(f"{code} | {url} | fetch failed: {e}")
                        break
                    except Exception as e:  # noqa: BLE001
                        if attempt <= MAX_RETRIES:
                            time.sleep(RETRY_BACKOFF_SEC * attempt)
                            continue
                        log_error(f"{code} | {url} | attempt {attempt} failed: {e}")

                if result is None:
                    status, num = "error", 0
                else:
                    status = result["status"]
                    num = len(result.get("data") or [])
                    school_records.append(result)

                print(f"-> status: {status}, records: {num}")
                writer.writerow({
                    "university_code": code,
                    "link_used": url,
                    "status": status,
                    "num_records_extracted": num,
                })
                sf.flush()
                time.sleep(REQUEST_DELAY_SEC)

            # Persist all link results for this school together.
            if school_records:
                (RESULTS_DIR / f"{code}.json").write_text(
                    json.dumps(school_records, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )

    print(f"\n✅ Xong. Summary: {SUMMARY_CSV}")
    print(f"   Raw JSON: {RESULTS_DIR}/")
    if ERROR_LOG.is_file():
        print(f"⚠️  Có lỗi tại: {ERROR_LOG}")


if __name__ == "__main__":
    main()
