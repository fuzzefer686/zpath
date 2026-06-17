"""Apply crawled 2026 tuition onto existing admissions rows (UPDATE tuition only).

Reads data/output/tuition_2026_results/<code>.json and, per school, sets
admissions.tuition_min/max on the 2026 program rows that currently have no fee:
  1. per-major fee matched by school_major_code, else by normalized major_name;
  2. for the school's remaining fee-less majors, the school_wide range (if any).

It never touches exam_blocks/score and never overwrites a non-null fee, so it is
safe to re-run. After applying, run transform_to_frontend to populate tuition_fees.

Run from the pipeline root:
  .venv/bin/python scripts/apply_tuition.py --dry-run
  .venv/bin/python scripts/apply_tuition.py --yes
  .venv/bin/python scripts/apply_tuition.py --codes BTU,OU --yes
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from collections import defaultdict

import config

RESULTS_DIR = config.PIPELINE_ROOT / "data" / "output" / "tuition_2026_results"
TARGET_YEAR = 2026

# school_wide fallback is only used when the published range is informative.
# Schools whose "range" is actually a CLC/high-tier figure mislabelled as
# school-wide are excluded outright; very wide ranges (mixing standard + CLC +
# international) are dropped by the ratio guard so we don't stamp a misleading
# fee on every standard-program row.
# Excluded outright: ranges so wide (>4x) they can't represent a per-program fee
# even loosely (mixing standard + CLC + international + sau-đại-học).
BAD_SCHOOL_WIDE = {"DQL", "DDT", "TDTU", "KCN", "HAU"}
MAX_SW_RATIO = 3.0


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


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def core_norm(s: str) -> str:
    """Normalized name with a trailing program-type qualifier removed, so
    'Kế toán (Tiêu chuẩn)' matches the tuition entry 'Kế toán'."""
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s or "").strip()
    return norm(s)


def expand_tuition_names(major_name: str) -> list[str]:
    """A grouped fee like 'Nhóm 1 (Kinh tế quốc tế, Luật học, ...)' lists many
    majors under one fee; return each listed major (+ the whole string) so every
    member maps to the group's fee."""
    names = [major_name]
    for inner in re.findall(r"\(([^)]*)\)", major_name or ""):
        for part in re.split(r"[,;]", inner):
            part = part.strip()
            if len(part) >= 4 and not part.lower().startswith(("chương trình", "ct ")):
                names.append(part)
    return names


def _num(v):
    return v if isinstance(v, (int, float)) else None


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
    parser.add_argument("--codes", type=str, default=None)
    parser.add_argument("--yes", action="store_true")
    args = parser.parse_args()
    only = ({c.strip() for c in args.codes.split(",") if c.strip()} if args.codes else None)

    if not RESULTS_DIR.is_dir():
        config.fail(f"Results not found: {RESULTS_DIR}")

    client = get_client()
    uni_id = {u["code"]: u["id"] for u in fetch_all(client, "universities", "id,code")}
    code_by_id = {v: k for k, v in uni_id.items()}

    # admissions 2026 rows grouped by university
    adm_by_uni: dict[str, list[dict]] = defaultdict(list)
    for a in fetch_all(client, "admissions",
                       "id,university_id,school_major_code,major_name,year,tuition_min,tuition_max"):
        if a.get("year") == TARGET_YEAR:
            adm_by_uni[a["university_id"]].append(a)

    updates: list[tuple] = []   # (id, code, major, min, max, via)
    summary: list[tuple] = []   # (code, n_major, n_wide, n_skip_nofee)

    for jf in sorted(RESULTS_DIR.glob("*.json")):
        fj = json.loads(jf.read_text(encoding="utf-8"))
        code = fj["university_code"]
        if only and code not in only:
            continue
        uid = uni_id.get(code)
        if not uid:
            continue
        rows = adm_by_uni.get(uid, [])
        if not rows:
            continue

        by_code, by_name = {}, {}
        for rec in fj.get("data") or []:
            tmin, tmax = _num(rec.get("tuition_min")), _num(rec.get("tuition_max"))
            if tmin is None and tmax is None:
                continue
            fee = (tmin, tmax if tmax is not None else tmin)
            if rec.get("school_major_code"):
                by_code[str(rec["school_major_code"]).strip()] = fee
            for nm in expand_tuition_names(rec.get("major_name") or ""):
                key = core_norm(nm)
                if key and key not in by_name:  # first (more specific) wins
                    by_name[key] = fee
        sw = fj.get("school_wide") or {}
        sw_fee = None
        if _num(sw.get("tuition_min")) is not None and code not in BAD_SCHOOL_WIDE:
            smin = _num(sw["tuition_min"])
            smax = _num(sw.get("tuition_max")) if _num(sw.get("tuition_max")) is not None else smin
            # guard: skip ranges too wide to represent a per-program fee
            if smin and smin > 0 and (smax / smin) <= MAX_SW_RATIO:
                sw_fee = (smin, smax)
            elif smin == 0 and smax == 0:
                sw_fee = (0, 0)  # genuinely free (police/military)

        n_major = n_wide = 0
        for a in rows:
            if a.get("tuition_min") is not None or a.get("tuition_max") is not None:
                continue  # never overwrite an existing fee
            fee = by_code.get((a.get("school_major_code") or "").strip()) \
                or by_name.get(core_norm(a.get("major_name") or ""))
            via = "major"
            if not fee and sw_fee:
                fee, via = sw_fee, "school_wide"
            if not fee:
                continue
            updates.append((a["id"], code, a.get("major_name") or "", fee[0], fee[1], via))
            if via == "major":
                n_major += 1
            else:
                n_wide += 1
        summary.append((code, n_major, n_wide))

    by_school = defaultdict(lambda: [0, 0])
    for _id, code, _m, _mn, _mx, via in updates:
        by_school[code][0 if via == "major" else 1] += 1
    print(f"=== APPLY TUITION -> admissions ({len(updates)} rows, {len(by_school)} trường) ===")
    for code in sorted(by_school):
        m, w = by_school[code]
        print(f"  {code:6} per-major={m:>3}  school_wide_fill={w:>3}")
    if args.dry_run:
        print("\n(DRY-RUN) chưa ghi."); return
    if not updates:
        print("Không có gì để cập nhật."); return
    if not confirm(f"\nUPDATE tuition cho {len(updates)} program rows? [y/N] "):
        print("Đã huỷ."); return

    done = 0
    for _id, _code, _m, tmin, tmax, _via in updates:
        client.table("admissions").update(
            {"tuition_min": tmin, "tuition_max": tmax}).eq("id", _id).execute()
        done += 1
        if done % 200 == 0:
            print(f"  updated {done}/{len(updates)}...")
    print(f"\n✅ updated tuition cho {done} rows. Chạy transform_to_frontend để tạo tuition_fees.")


if __name__ == "__main__":
    main()
