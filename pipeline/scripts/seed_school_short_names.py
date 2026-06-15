"""Populate schools.short_name + aliases with student-friendly names.

Students recognize popular abbreviations (PTIT, DAV, UEH) or a short Vietnamese
name far better than the internal code (BVH, VKA) or the long official name.
This seeds a curated map; edit SHORT_NAMES below to fix/extend. Idempotent — it
overwrites short_name/aliases for the listed codes only.

short_name = the single most-recognized label shown prominently in the UI.
aliases    = other names/abbreviations students might search by.

Run from the pipeline root:
  .venv/bin/python scripts/seed_school_short_names.py --dry-run
  .venv/bin/python scripts/seed_school_short_names.py --yes
"""

from __future__ import annotations

import argparse
import sys

import config

# code -> (short_name, [aliases...])
SHORT_NAMES: dict[str, tuple[str, list[str]]] = {
    # --- curated 5 (already well-known) ---
    "HUST": ("HUST", ["Bách khoa Hà Nội", "BKHN"]),
    "FTU": ("FTU", ["Ngoại thương"]),
    "NEU": ("NEU", ["Kinh tế Quốc dân"]),
    "UET": ("UET", ["ĐH Công nghệ HN", "VNU-UET"]),
    "VINUNI": ("VinUni", []),
    # --- big-name acronyms students use ---
    "BVH": ("PTIT", ["Học viện Bưu chính Viễn thông", "Bưu chính Viễn thông"]),
    "VKA": ("DAV", ["Học viện Ngoại giao", "Ngoại giao"]),
    "DBS": ("UEH", ["Kinh tế TP.HCM", "Kinh tế HCM"]),
    "DBH": ("Bách khoa HCM", ["HCMUT", "BK HCM"]),
    "DHK": ("Tự nhiên HCM", ["HCMUS", "KHTN HCM"]),
    "XSH": ("Nhân văn HCM", ["USSH", "HCMUSSH", "KHXH&NV HCM"]),
    "DPX": ("Sư phạm HCM", ["HCMUE"]),
    "DQL": ("Luật HCM", ["ULAW", "HCMULAW"]),
    "YDS": ("Y Dược HCM", ["UMP", "Y Dược TP.HCM"]),
    "DGD": ("Công nghiệp HCM", ["IUH"]),
    "DCN": ("HaUI", ["Công nghiệp Hà Nội"]),
    "HHA": ("Hàng hải VN", ["VMU"]),
    "CTS": ("Cần Thơ", ["CTU", "ĐH Cần Thơ"]),
    "QHT": ("Tự nhiên Hà Nội", ["HUS", "VNU-HUS", "KHTN HN"]),
    "QHI": ("ĐH Công nghệ HN", ["UET", "VNU-UET"]),
    # --- Đà Nẵng ---
    "DFL": ("Ngoại ngữ Đà Nẵng", ["UFL", "ĐH Ngoại ngữ ĐN"]),
    "DED": ("Sư phạm Đà Nẵng", ["UED"]),
    # --- regional / specialized (friendly VN short name; acronym in aliases) ---
    "DAG": ("ĐH An Giang", ["AGU"]),
    "TKG": ("ĐH Kiên Giang", ["KGU"]),
    "DHP": ("ĐH Hải Phòng", ["DHHP"]),
    "DQN": ("ĐH Quy Nhơn", ["QNU"]),
    "DQC": ("ĐH Quảng Bình", ["QBU"]),
    "TQU": ("ĐH Tân Trào", ["TTU"]),
    "DPT": ("ĐH Phan Thiết", ["UPT"]),
    "LDA": ("ĐH Lao động - Xã hội", ["ULSA"]),
    "VHH": ("Văn hóa Hà Nội", ["HUC"]),
    "HIU": ("Hồng Bàng", ["HIU", "Quốc tế Hồng Bàng"]),
    "SKD": ("Sân khấu - Điện ảnh HN", ["SKDA"]),
    "NHA": ("Nhạc viện Hà Nội", ["VNAM", "Âm nhạc Quốc gia"]),
    "MSH": ("Mỹ thuật HCM", ["HCMUFA"]),
    "DTH": ("ĐH Thăng Long", ["TLU"]),
    "HBT": ("Công nghệ Sài Gòn", ["STU"]),
    # --- defunct (merged into Học viện Hành chính Quốc gia, 2022) ---
    "DNV": ("ĐH Nội vụ HN", ["NAPA", "đã sáp nhập Học viện Hành chính Quốc gia"]),
}


def get_client():
    from supabase import create_client
    return create_client(
        config.require("SUPABASE_URL"), config.require("SUPABASE_SERVICE_ROLE_KEY")
    )


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
    existing = {r["code"] for r in client.table("schools").select("code").execute().data}
    missing_in_db = [c for c in SHORT_NAMES if c not in existing]
    missing_in_map = sorted(existing - set(SHORT_NAMES))

    print(f"Schools trong DB: {len(existing)} | có trong map: {len(SHORT_NAMES)}")
    if missing_in_map:
        print(f"⚠️ chưa có short_name trong map: {missing_in_map}")
    if missing_in_db:
        print(f"⚠️ code trong map nhưng không có trong DB (bỏ qua): {missing_in_db}")
    print("\nPreview:")
    for code, (sn, al) in sorted(SHORT_NAMES.items()):
        if code in existing:
            print(f"  {code:7} -> {sn!r}  aliases={al}")
    if args.dry_run:
        print("\n(DRY-RUN) chưa ghi."); return
    if not confirm(f"\nCập nhật short_name/aliases cho {len(SHORT_NAMES)} trường? [y/N] "):
        print("Đã huỷ."); return

    updated = 0
    for code, (sn, al) in SHORT_NAMES.items():
        if code not in existing:
            continue
        client.table("schools").update({"short_name": sn, "aliases": al}).eq("code", code).execute()
        updated += 1
    print(f"\n✅ cập nhật {updated} trường.")


if __name__ == "__main__":
    main()
