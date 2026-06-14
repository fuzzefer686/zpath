"""Infer admission_method for staging rows that are missing it.

For each admissions_staging row with year IN (2025,2026) and a NULL
admission_method, infer the method from context (raw_extracted_json text +
exam_blocks) using a fixed priority order, then UPDATE the row.

Priority:
  1. 'học bạ' / 'hoc ba'                              -> hoc_ba
  2. 'đánh giá năng lực' + HCM                         -> dgnl_hcm
  3. 'đánh giá năng lực' + Hà Nội                      -> dgnl_hn
  4. 'đánh giá tư duy'                                 -> dg_tu_duy
  5. exam_blocks has a standard THPT block (A00/B00..) -> diem_thi_thpt
  6. fallback                                          -> diem_thi_thpt

Run from the pipeline root:  python scripts/infer_admission_method.py
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter

import config

LOG_CSV = config.PIPELINE_ROOT / "data" / "output" / "infer_method_log.csv"
LOG_FIELDS = ["university_code", "major_name", "inferred_method", "rule_used"]
BLOCK_RE = re.compile(r"^[A-Z]{1,2}\d{2}$")  # A00, A01, B00, D07, K01, ...


def infer(raw_text: str, exam_blocks) -> tuple[str, int]:
    t = raw_text.lower()
    if "học bạ" in t or "hoc ba" in t:
        return "hoc_ba", 1
    if "đánh giá năng lực" in t or "danh gia nang luc" in t:
        if any(k in t for k in ("hcm", "tp.hcm", "hồ chí minh", "ho chi minh")):
            return "dgnl_hcm", 2
        if any(k in t for k in ("hà nội", "ha noi", "đhqg hn", "dhqg hn")):
            return "dgnl_hn", 3
    if "đánh giá tư duy" in t or "danh gia tu duy" in t:
        return "dg_tu_duy", 4
    if exam_blocks and any(BLOCK_RE.match(str(b).strip().upper()) for b in exam_blocks):
        return "diem_thi_thpt", 5
    return "diem_thi_thpt", 6


def fetch_targets(client) -> list[dict]:
    out: list[dict] = []
    page = 0
    while True:
        chunk = (client.table("admissions_staging")
                 .select("id,university_code,major_name,exam_blocks,raw_extracted_json,year")
                 .in_("year", [2025, 2026]).is_("admission_method", "null")
                 .range(page * 1000, page * 1000 + 999).execute().data)
        out.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1
    return out


def main() -> None:
    from supabase import create_client
    client = create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )

    rows = fetch_targets(client)
    print(f"Rows year 2025/2026 thiếu admission_method: {len(rows)}\n")
    if not rows:
        print("Không có row nào cần infer."); return

    rule_counts: Counter = Counter()
    with LOG_CSV.open("w", encoding="utf-8", newline="") as lf:
        writer = csv.DictWriter(lf, fieldnames=LOG_FIELDS)
        writer.writeheader()
        for i, r in enumerate(rows, start=1):
            raw_text = json.dumps(r.get("raw_extracted_json") or {}, ensure_ascii=False)
            method, rule = infer(raw_text, r.get("exam_blocks"))
            client.table("admissions_staging").update({
                "admission_method": method,
                "review_note": "admission_method inferred from context",
            }).eq("id", r["id"]).execute()
            rule_counts[rule] += 1
            writer.writerow({
                "university_code": r["university_code"],
                "major_name": r.get("major_name"),
                "inferred_method": method, "rule_used": rule,
            })
            if i % 100 == 0:
                print(f"  {i}/{len(rows)} updated...")

    print(f"\n✅ Đã infer {len(rows)} rows. Phân bố rule:")
    labels = {1: "hoc_ba", 2: "dgnl_hcm", 3: "dgnl_hn", 4: "dg_tu_duy",
              5: "diem_thi_thpt(blocks)", 6: "diem_thi_thpt(fallback)"}
    for rule in sorted(rule_counts):
        print(f"  rule {rule} ({labels[rule]}): {rule_counts[rule]}")
    print(f"   Log: {LOG_CSV}")


if __name__ == "__main__":
    main()
