"""Ingest manually-supplied PDFs (đề án tuyển sinh) into the program pipeline.

When search-engine crawling misses majors for a school, drop the official PDF
(đề án tuyển sinh / danh mục ngành) and let Gemini read it directly — PDFs are
sent as native input, so tables/columns survive far better than scraped HTML.

Place files at:   pipeline/data/input/pdfs/<UNIVERSITY_CODE>.pdf   (e.g. BVH.pdf)
The filename stem (uppercased) is the university code.

Per PDF, Gemini extracts the FULL major list into the SAME json shape as the
crawler, written to data/output/programs_2026_results/<CODE>.json — so the rest
of the flow is unchanged:

  .venv/bin/python scripts/ingest_pdf.py                 # all PDFs in the folder
  .venv/bin/python scripts/ingest_pdf.py --codes MSH,XSH
  .venv/bin/python scripts/merge_programs_to_staging.py --codes MSH,XSH --yes
  .venv/bin/python scripts/promote_to_admissions.py --step admissions --include-partial --yes
  .venv/bin/python scripts/seed_subject_combinations.py --yes
  python scripts/transform_to_frontend.py
"""

from __future__ import annotations

import argparse
import csv
import json
import time

import config
from find_admission_urls import gather_text
from extract_admissions import parse_json_object
# Reuse the crawler's contract so merge_programs_to_staging works unchanged.
from crawl_programs_2026 import (
    RESULTS_DIR, SUMMARY_CSV, SUMMARY_FIELDS, TARGET_YEAR, VALID_STATUSES,
)

PDF_DIR = config.PIPELINE_ROOT / "data" / "input" / "pdfs"
AUDIT_CSV = config.PIPELINE_ROOT / "data" / "output" / "coverage_audit.csv"
NAMES_CSV = config.PIPELINE_ROOT / "data" / "input" / "universities_list.csv"
REQUEST_DELAY_SEC = 1.0


def load_names() -> dict[str, str]:
    """Best-effort code -> name, from the audit CSV then universities_list.csv."""
    names: dict[str, str] = {}
    for path, code_col, name_col in (
        (AUDIT_CSV, "university_code", "university_name"),
        (NAMES_CSV, "university_code", "university_name"),
    ):
        if path.is_file():
            with path.open(encoding="utf-8-sig", newline="") as f:
                for r in csv.DictReader(f):
                    code = (r.get(code_col) or "").strip()
                    if code and code not in names:
                        names[code] = (r.get(name_col) or "").strip()
    return names


def build_prompt(name: str) -> str:
    return f"""Bạn là trợ lý trích xuất DANH SÁCH NGÀNH tuyển sinh đại học Việt Nam
từ FILE PDF đề án tuyển sinh đính kèm.

Trường: {name}
Mục tiêu: LIỆT KÊ TẤT CẢ ngành đào tạo đại học chính quy trong PDF. Ưu tiên năm
2026; nếu PDF chỉ có 2025 thì lấy 2025 và đặt "data_year": 2025.

Trả về DUY NHẤT một object JSON (không markdown):

{{
  "status": "success | partial",
  "data_year": 2026,
  "data": [ <record theo schema bên dưới> ],
  "note": "<ghi chú ngắn tiếng Việt>"
}}

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
- LIỆT KÊ ĐẦY ĐỦ mọi ngành trong PDF, KHÔNG bỏ sót, KHÔNG gộp.
- KHÔNG bịa mã ngành/học phí — thiếu thì để null.
- "admission_method": nếu không rõ, dùng "diem_thi_thpt".
- Mỗi ngành 1 record (nếu 1 ngành nhiều phương thức, ưu tiên diem_thi_thpt).
"""


def extract_from_pdf(client, name: str, pdf_path) -> dict:
    from google.genai import types

    pdf_part = types.Part.from_bytes(
        data=pdf_path.read_bytes(), mime_type="application/pdf"
    )
    cfg = types.GenerateContentConfig(response_mime_type="application/json", temperature=0)
    resp = client.models.generate_content(
        model=config.GEMINI_MODEL,
        contents=[build_prompt(name), pdf_part],
        config=cfg,
    )
    out = parse_json_object(gather_text(resp))
    status = out.get("status")
    out["status"] = status if status in VALID_STATUSES else (
        "partial" if out.get("data") else "needs_deeper_crawl")
    out.setdefault("data", [])
    out.setdefault("note", "")
    try:
        out["data_year"] = int(out.get("data_year") or TARGET_YEAR)
    except (TypeError, ValueError):
        out["data_year"] = TARGET_YEAR
    return out


def discover_pdfs(codes_arg: str | None) -> list[tuple[str, "object"]]:
    if not PDF_DIR.is_dir():
        config.fail(f"Chưa có thư mục PDF: {PDF_DIR} (tạo và đặt <MÃ>.pdf vào).")
    wanted = ({c.strip().upper() for c in codes_arg.split(",") if c.strip()}
              if codes_arg else None)
    out = []
    for pdf in sorted(PDF_DIR.glob("*.pdf")):
        code = pdf.stem.upper()
        if wanted and code not in wanted:
            continue
        out.append((code, pdf))
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest đề án PDFs into the program pipeline.")
    parser.add_argument("--codes", type=str, default=None, help="chỉ các mã, vd MSH,XSH")
    args = parser.parse_args()

    pdfs = discover_pdfs(args.codes)
    if not pdfs:
        print(f"Không tìm thấy PDF nào trong {PDF_DIR} "
              f"(đặt file <MÃ>.pdf, vd BVH.pdf)."); return
    names = load_names()
    print(f"Sẽ đọc {len(pdfs)} PDF: {[c for c, _ in pdfs]}\n")

    client = config.get_genai_client()
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    write_header = not (SUMMARY_CSV.is_file() and SUMMARY_CSV.stat().st_size > 0)

    with SUMMARY_CSV.open("a", encoding="utf-8", newline="") as sf:
        writer = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        if write_header:
            writer.writeheader()

        for i, (code, pdf) in enumerate(pdfs, start=1):
            name = names.get(code, code)
            print(f"[{i}/{len(pdfs)}] {code} {name} <- {pdf.name}...", flush=True)
            try:
                result = extract_from_pdf(client, name, pdf)
            except Exception as e:  # noqa: BLE001
                print(f"    ⚠️ lỗi: {str(e)[:160]}")
                result = {"status": "error", "data": [], "data_year": TARGET_YEAR,
                          "note": str(e)[:200]}

            data = result.get("data") or []
            dyear = result.get("data_year", TARGET_YEAR)
            (RESULTS_DIR / f"{code}.json").write_text(
                json.dumps({
                    "university_code": code, "university_name": name,
                    "found_url": f"pdf:{pdf.name}", "data_year": dyear,
                    "status": result["status"], "num_records": len(data), "data": data,
                }, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"    -> {result['status']}, records: {len(data)} (year {dyear})")
            writer.writerow({
                "university_code": code, "university_name": name,
                "found_url": f"pdf:{pdf.name}", "status": result["status"],
                "num_records": len(data), "data_year": dyear,
                "note": ("PDF ingest | " + (result.get("note") or ""))[:200],
            })
            sf.flush()
            time.sleep(REQUEST_DELAY_SEC)

    print(f"\n✅ Xong {len(pdfs)} PDF. JSON: {RESULTS_DIR}/")
    print("Tiếp: merge_programs_to_staging.py --codes <...> --yes -> promote "
          "(--include-partial) -> seed_subject_combinations -> transform_to_frontend")


if __name__ == "__main__":
    main()
