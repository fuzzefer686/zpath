"""Normalize tuition values in admissions_staging to million VND / year.

Extracted tuition columns mix units (e.g. 1.71 vs 104.4 vs 20.0 — per credit,
per month, per year, raw VND...). For each staging row that has a tuition
value, we ask Gemini (no Search Grounding) to infer the original unit from the
row's raw_extracted_json + source and convert to million VND per year.

Only rows the model is confident about (confidence='high') are UPDATEd; 'low'
confidence rows are logged for manual review and left untouched.

Checkpoint/resume: every processed row id is written to the log CSV; a re-run
skips ids already there.

Run from the pipeline root:  python scripts/normalize_tuition.py
"""

from __future__ import annotations

import csv
import json
import time
from datetime import datetime, timezone

import config
from find_admission_urls import gather_text

LOG_CSV = config.PIPELINE_ROOT / "data" / "output" / "normalize_tuition_log.csv"
LOWCONF_CSV = config.PIPELINE_ROOT / "data" / "output" / "normalize_tuition_lowconf.csv"

LOG_FIELDS = [
    "id", "university_code", "major_name", "year",
    "old_min", "old_max", "new_min", "new_max",
    "unit_original", "confidence", "action",
]
REQUEST_DELAY_SEC = 0.5
MAX_RETRIES = 2
RETRY_BACKOFF_SEC = 4.0


def build_prompt(row: dict) -> str:
    raw = json.dumps(row.get("raw_extracted_json") or {}, ensure_ascii=False)
    return (
        f"Học phí của ngành \"{row.get('major_name')}\" — trường {row.get('university_code')}, "
        f"năm tuyển sinh {row.get('year')}.\n"
        f"Giá trị đã trích xuất (ĐƠN VỊ KHÔNG RÕ): tuition_min={row.get('tuition_min')}, "
        f"tuition_max={row.get('tuition_max')}.\n"
        f"Context (JSON trích xuất gốc): {raw}\n"
        f"Nguồn: {row.get('source_url')}\n\n"
        f"Hãy xác định ĐƠN VỊ THỰC TẾ rồi QUY ĐỔI về TRIỆU VND/NĂM. Áp dụng phép nhân TƯỜNG MINH:\n"
        f"- nếu gốc là /năm: giữ nguyên\n"
        f"- nếu gốc là /học kỳ: nhân 2\n"
        f"- nếu gốc là /tháng: nhân 10\n"
        f"- nếu gốc là VND (không phải triệu): chia 1.000.000\n"
        f"- nếu gốc là /tín chỉ: KHÔNG đủ dữ liệu để quy ra năm -> confidence='low'\n"
        f"Giá trị trả về PHẢI là tổng học phí MỘT NĂM HỌC.\n"
        f"Mức hợp lý: ~10–60 triệu/năm (công lập), ~100–250 triệu/năm (quốc tế). "
        f"Nếu kết quả nằm NGOÀI ~5–300 triệu/năm, hoặc bạn KHÔNG chắc đơn vị gốc, "
        f"hãy đặt confidence='low' (KHÔNG đoán bừa).\n"
        f"Chỉ trả về DUY NHẤT JSON: "
        f'{{"tuition_min_vnd_million": <số hoặc null>, "tuition_max_vnd_million": <số hoặc null>, '
        f'"unit_original": "<mô tả đơn vị gốc>", "confidence": "high|low"}}'
    )


def normalize_one(client, row: dict) -> dict:
    from google.genai import types

    cfg = types.GenerateContentConfig(response_mime_type="application/json", temperature=0)
    resp = client.models.generate_content(
        model=config.GEMINI_MODEL, contents=build_prompt(row), config=cfg
    )
    return json.loads(gather_text(resp))


def load_done_ids() -> set[str]:
    done: set[str] = set()
    if LOG_CSV.is_file() and LOG_CSV.stat().st_size > 0:
        with LOG_CSV.open(encoding="utf-8-sig", newline="") as f:
            for r in csv.DictReader(f):
                if r.get("id"):
                    done.add(r["id"])
    return done


def fetch_tuition_rows(supabase) -> list[dict]:
    """All staging rows with a tuition value (paged past the 1000-row cap)."""
    rows: list[dict] = []
    page = 0
    while True:
        chunk = (supabase.table("admissions_staging")
                 .select("id,university_code,major_name,year,tuition_min,tuition_max,"
                         "source_url,raw_extracted_json")
                 .not_.is_("tuition_min", "null")
                 .range(page * 1000, page * 1000 + 999).execute().data)
        rows.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1
    return rows


def main() -> None:
    from supabase import create_client
    supabase = create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )
    client = config.get_genai_client()

    rows = fetch_tuition_rows(supabase)
    done = load_done_ids()
    todo = [r for r in rows if r["id"] not in done]
    print(f"Rows có tuition: {len(rows)} | đã xử lý: {len(rows) - len(todo)} | "
          f"sẽ xử lý: {len(todo)}\n")
    if not todo:
        print("Không còn row nào để chuẩn hoá.")
        return

    log_new = not (LOG_CSV.is_file() and LOG_CSV.stat().st_size > 0)
    updated = low = errored = 0

    with LOG_CSV.open("a", encoding="utf-8", newline="") as lf:
        writer = csv.DictWriter(lf, fieldnames=LOG_FIELDS)
        if log_new:
            writer.writeheader()

        for i, row in enumerate(todo, start=1):
            res: dict | None = None
            for attempt in range(1, MAX_RETRIES + 2):
                try:
                    res = normalize_one(client, row)
                    break
                except Exception as e:  # noqa: BLE001
                    if attempt <= MAX_RETRIES:
                        time.sleep(RETRY_BACKOFF_SEC * attempt)
                        continue
                    print(f"  [{i}/{len(todo)}] {row['university_code']} ERROR: {str(e)[:80]}")

            if res is None:
                errored += 1
                action, conf = "error", ""
                new_min = new_max = unit = None
            else:
                conf = res.get("confidence", "low")
                new_min = res.get("tuition_min_vnd_million")
                new_max = res.get("tuition_max_vnd_million")
                unit = res.get("unit_original", "")
                if conf == "high":
                    supabase.table("admissions_staging").update(
                        {"tuition_min": new_min, "tuition_max": new_max}
                    ).eq("id", row["id"]).execute()
                    updated += 1
                    action = "updated"
                else:
                    low += 1
                    action = "skipped_low"

            writer.writerow({
                "id": row["id"], "university_code": row["university_code"],
                "major_name": row.get("major_name"), "year": row.get("year"),
                "old_min": row.get("tuition_min"), "old_max": row.get("tuition_max"),
                "new_min": new_min, "new_max": new_max,
                "unit_original": unit, "confidence": conf, "action": action,
            })
            lf.flush()
            if i % 20 == 0:
                print(f"  [{i}/{len(todo)}] updated={updated} low={low} error={errored}")
            time.sleep(REQUEST_DELAY_SEC)

    # Write the low-confidence rows to their own file for manual review.
    with LOG_CSV.open(encoding="utf-8-sig", newline="") as f:
        low_rows = [r for r in csv.DictReader(f) if r["confidence"] == "low"]
    if low_rows:
        with LOWCONF_CSV.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=LOG_FIELDS)
            w.writeheader(); w.writerows(low_rows)

    print(f"\n✅ Xong. updated(high)={updated} | low(review tay)={low} | error={errored}")
    print(f"   Log: {LOG_CSV}")
    if low_rows:
        print(f"   Low-confidence để review: {LOWCONF_CSV} ({len(low_rows)} rows)")


if __name__ == "__main__":
    main()
