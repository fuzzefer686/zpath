"""Seed any exam-block codes referenced by admissions but missing from
subject_combinations, so transform_to_frontend's program_combinations insert
doesn't trip the combination_code FK.

program_combinations.combination_code references subject_combinations.code. The
2026 crawl/proxy surfaces school-specific blocks (D21, X29, X50, ...) not yet in
that lookup. Standard blocks get their official subject list; school-specific /
unknown ones are seeded with empty subjects and a clear "needs verification"
description (we don't fabricate subjects we can't verify). Idempotent.

Run from the pipeline root:
  .venv/bin/python scripts/seed_subject_combinations.py --dry-run
  .venv/bin/python scripts/seed_subject_combinations.py --yes
"""

from __future__ import annotations

import argparse
import sys

import config

# Official subject lists for the standard blocks we may newly reference.
KNOWN = {
    "D21": ["Toán", "Hóa học", "Tiếng Đức"],
    "D22": ["Toán", "Hóa học", "Tiếng Nga"],
    "D27": ["Toán", "Hóa học", "Tiếng Pháp"],
    "D36": ["Toán", "Lịch sử", "Tiếng Anh"],
}
PLACEHOLDER_DESC = ("Auto-seeded bởi pipeline coverage 2026; tổ hợp trường tự "
                    "đặt — subjects CHƯA xác minh, cần bổ sung dữ liệu chính thức.")
KNOWN_DESC = "Tổ hợp xét tuyển chuẩn, seed bởi pipeline coverage 2026."


def get_client():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


def fetch_all(client, table: str, columns: str) -> list[dict]:
    out, page = [], 0
    while True:
        chunk = (client.table(table).select(columns)
                 .range(page * 1000, page * 1000 + 999).execute().data)
        out.extend(chunk)
        if len(chunk) < 1000:
            break
        page += 1
    return out


def confirm(prompt: str) -> bool:
    if "--yes" in sys.argv:
        print(f"{prompt} y (--yes)"); return True
    try:
        return input(prompt).strip().lower() in ("y", "yes")
    except EOFError:
        return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()

    client = get_client()
    existing = {r["code"] for r in fetch_all(client, "subject_combinations", "code")}
    used: set[str] = set()
    for a in fetch_all(client, "admissions", "exam_blocks"):
        for b in (a.get("exam_blocks") or []):
            code = str(b).strip().upper()
            if code:
                used.add(code)
    missing = sorted(used - existing)

    if not missing:
        print("Không có tổ hợp nào thiếu — subject_combinations đã đủ."); return
    rows = [{
        "code": c,
        "subjects": KNOWN.get(c, []),
        "description": KNOWN_DESC if c in KNOWN else PLACEHOLDER_DESC,
    } for c in missing]
    n_known = sum(1 for c in missing if c in KNOWN)
    print(f"Thiếu {len(missing)} tổ hợp: {missing}")
    print(f"  có subjects chuẩn: {n_known} | placeholder (chưa xác minh): {len(missing) - n_known}")
    if args.dry_run:
        print("(DRY-RUN) chưa ghi."); return
    if not confirm(f"Seed {len(rows)} tổ hợp vào subject_combinations? [y/N] "):
        print("Đã huỷ."); return

    client.table("subject_combinations").upsert(rows, on_conflict="code",
                                                ignore_duplicates=True).execute()
    print(f"✅ seeded {len(rows)} tổ hợp.")


if __name__ == "__main__":
    main()
