# Batch 2 — Crawl 50 trường + double-check (2026-06-17)

## Tổng quan
- Input: 50 dòng → khử trùng còn **48 trường** (bỏ SGU=SGD, DQK=UNETI).
- Crawl `programs_2026` qua `crawl_programs_2026.py --csv` + double-check số ngành
  thực tế bằng Gemini Search Grounding (`double_check_batch.py`).
- Kết quả cuối: **~40 đủ**, 3 trường thực sự kẹt nguồn (YDH, YQD, DHA).

## Verdict
- ĐỦ (programs_2026 ≥ 80% số ngành thực): 37 trường + (DCT, DUE, UAH unknown nhưng
  crawl 22–39 ngành ⇒ thực tế đủ) ≈ **40**.
- THIẾU thực sự cần theo dõi:
  - **YDH** (Y Dược Huế): 0 — site huemed-univ.edu.vn JS, grounding trả về trang chủ. Cần URL thủ công.
  - **YQD** (Học viện Quân y): 0 — trường quân đội, ít công bố danh sách ngành công khai.
  - **DHA** (Luật Huế): 1 — trang chỉ là tin tức, không có bảng ngành.
- THIẾU "giả" (expected bị Google đếm dư, data thực chất đã ổn):
  - **TDTU**: crawl 51, exp 138 (đếm cả chuyên ngành) — 51 hợp lý.
  - **DHS** (SP Huế): 21/35 — đáng kể, có thể bổ sung sau.
  - **RMIT**: 17/24 — trường quốc tế, gần đủ.
- Trường nhỏ/đặc thù count thấp nhưng đúng: KMA (4), ANH (3), VNC (7), VJD (9), DLA (9), HMT (6).

## Re-crawl đã sửa được
- DQN 0→53, QSK 0→40, DDL 9→2→34 (giữ bản tốt nhất), ANH 2→3.

## ⚠️ Reconciliation mã trường (CHƯA ghi DB — cần quyết định)
- **Trùng trường, mã khác** (mã user = mã MOET chuẩn; DB đang để mã cũ):
  - QSB ↔ DBH (Bách khoa HCM)
  - QSX ↔ XSH (KHXH&NV HCM)
  - SPS ↔ DPX (Sư phạm HCM)
  - IUH ↔ DGD (Công nghiệp HCM)
- **Đã tồn tại cùng mã** (re-crawl bổ sung): DQN, VHH.
- **Trùng mã khác trường**: DHK (list=Kinh tế Huế, đã crawl dưới nhãn KTH; DB DHK=KHTN HCM).
- **Đổi nhãn tránh va chạm**: DLĐ→DDL (Điện lực), DHA(Luật HN)→LHN.

## Files
- `data/input/batch2_schools.csv` — 48 trường + cột recon_note.
- `data/output/programs_2026_results/*.json` — kết quả crawl từng trường.
- `data/output/batch2_coverage.csv` — verdict cuối.
- `data/output/programs_2026_summary.csv` — summary crawl (gộp batch1+batch2).
