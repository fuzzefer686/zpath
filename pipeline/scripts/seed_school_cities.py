"""Backfill `schools.city` for every school so the UniMap region filter
(cityToRegion in lib/vn-regions.ts) buckets all 80 schools, not just the 5
curated ones. transform_to_frontend inserts new schools with code+name only,
leaving city null -> they vanish whenever a "Khu vực" filter is active.

city is set to the province/city string that vn-regions maps to a region:
  Hà Nội / TP.HCM directly; province names for Miền Bắc/Trung/Nam.

Idempotent: updates only when the stored city differs from the target.

Run from the pipeline root:
  .venv/bin/python scripts/seed_school_cities.py --dry-run
  .venv/bin/python scripts/seed_school_cities.py --yes
"""

from __future__ import annotations

import argparse
import sys

import config

# code -> province/city. Values chosen so lib/vn-regions.cityToRegion() resolves
# the right bucket (Hà Nội / TP.HCM / Miền Bắc|Trung|Nam).
CITY = {
    # Hà Nội
    "HUST": "Hà Nội", "NEU": "Hà Nội", "FTU": "Hà Nội", "UET": "Hà Nội",
    "QHI": "Hà Nội", "QHT": "Hà Nội", "QHQ": "Hà Nội", "VJD": "Hà Nội",
    "EDU": "Hà Nội", "VINUNI": "Hà Nội", "AEP": "Hà Nội", "ANH": "Hà Nội",
    "CSH": "Hà Nội", "BVH": "Hà Nội", "DCN": "Hà Nội", "DDL": "Hà Nội",
    "DKH": "Hà Nội", "DNV": "Hà Nội", "DTH": "Hà Nội", "HAU": "Hà Nội",
    "HMT": "Hà Nội", "KCN": "Hà Nội", "KMA": "Hà Nội", "LDA": "Hà Nội",
    "LHN": "Hà Nội", "MHN": "Hà Nội", "NHA": "Hà Nội", "SKD": "Hà Nội",
    "UNETI": "Hà Nội", "VHH": "Hà Nội", "VKA": "Hà Nội", "YQD": "Hà Nội",
    # TP.HCM
    "DBH": "Thành phố Hồ Chí Minh", "DBS": "Thành phố Hồ Chí Minh",
    "DCT": "Thành phố Hồ Chí Minh", "DGD": "Thành phố Hồ Chí Minh",
    "DHK": "Thành phố Hồ Chí Minh", "DPX": "Thành phố Hồ Chí Minh",
    "DQL": "Thành phố Hồ Chí Minh", "QSC": "Thành phố Hồ Chí Minh",
    "QSK": "Thành phố Hồ Chí Minh", "XSH": "Thành phố Hồ Chí Minh",
    "HBT": "Thành phố Hồ Chí Minh", "HIU": "Thành phố Hồ Chí Minh",
    "KTC": "Thành phố Hồ Chí Minh", "MSH": "Thành phố Hồ Chí Minh",
    "OU": "Thành phố Hồ Chí Minh", "SGD": "Thành phố Hồ Chí Minh",
    "TDTU": "Thành phố Hồ Chí Minh", "UAH": "Thành phố Hồ Chí Minh",
    "UMT": "Thành phố Hồ Chí Minh", "VLU": "Thành phố Hồ Chí Minh",
    "VNC": "Thành phố Hồ Chí Minh", "YDS": "Thành phố Hồ Chí Minh",
    "RMIT": "Thành phố Hồ Chí Minh",
    # Miền Trung
    "DDT": "Đà Nẵng", "DED": "Đà Nẵng", "DFL": "Đà Nẵng", "DUE": "Đà Nẵng",
    "DHA": "Huế", "DHF": "Huế", "DHS": "Huế", "KTH": "Huế", "YDH": "Huế",
    "DPH": "Quảng Ngãi", "DPT": "Bình Thuận", "DQC": "Quảng Bình",
    "DQN": "Bình Định", "TBD": "Khánh Hòa", "TDU": "Đắk Lắk", "VUT": "Nghệ An",
    # Miền Bắc
    "DHP": "Hải Phòng", "HHA": "Hải Phòng", "TBU": "Sơn La", "TQU": "Tuyên Quang",
    # Miền Nam
    "CTS": "Cần Thơ", "DAG": "An Giang", "BTU": "Bình Dương",
    "DLA": "Long An", "TKG": "Kiên Giang",
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
    schools = client.table("schools").select("id,code,name,city").execute().data
    by_code = {(s.get("code") or "").strip(): s for s in schools}

    updates, missing = [], []
    for code, target in CITY.items():
        s = by_code.get(code)
        if not s:
            continue
        if (s.get("city") or "").strip() != target:
            updates.append((s["id"], code, s.get("city") or "∅", target))
    missing = [c for c in by_code if c and c not in CITY]

    print(f"Schools: {len(schools)} | mapped: {len(CITY)} | cần cập nhật: {len(updates)}")
    for _id, code, old, new in updates:
        print(f"  {code:6} {old!r} -> {new!r}")
    if missing:
        print(f"\n⚠️ trường chưa có trong map (giữ nguyên): {sorted(missing)}")
    if args.dry_run:
        print("\n(DRY-RUN) chưa ghi."); return
    if not updates:
        print("Không có gì để cập nhật."); return
    if not confirm(f"\nCập nhật city cho {len(updates)} trường? [y/N] "):
        print("Đã huỷ."); return

    for _id, code, _old, new in updates:
        client.table("schools").update({"city": new}).eq("id", _id).execute()
    print(f"✅ updated city cho {len(updates)} trường.")


if __name__ == "__main__":
    main()
