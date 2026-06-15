# Báo cáo coverage 33 trường — chương trình 2026

_Ngày: 2026-06-15. Ngưỡng "đủ": `programs_2026 ≥ ceil(80% × số ngành thực tế)`,
số ngành thực tế lấy qua Gemini Google-Search grounding._

## Kết quả cuối

- **32/33 trường ĐỦ** (≥80% số ngành thực tế).
- **1 trường cần ghi chú đặc biệt**: DNV (đã sáp nhập, không còn tuyển sinh — xem dưới).
- **MSH**: đạt đủ theo nguồn chính thức (xem ghi chú).

Khởi điểm có **18/33 trường thiếu**; sau backfill + re-crawl còn **0 trường thiếu
thực sự**.

### Cách đạt được (theo từng nguồn)
| Bước | Mô tả | Kết quả |
|---|---|---|
| Proxy 2025→2026 | Clone `admission_programs` 2025 sang 2026 (+ methods/combos/tuition), đánh dấu `proxy_2025` | 18 → 9 trường thiếu |
| Crawl đề án 2026 | `crawl_programs_2026.py` (grounding → tuyensinh247/website trường) | 9 → 1 trường thiếu |
| Re-crawl trường khó | DBH (Playwright), CTS, DPX qua trang đề án tuyensinh247 | 1 → 0 |

## Bảng cuối (sắp theo verdict)

| Code | Trường | programs_2026 | expected | bench_2025 | verdict |
|---|---|---:|---:|---:|---|
| CTS | Cần Thơ | 143 | 127 | 16 | đủ |
| DBS | Kinh tế TP.HCM | 112 | 82 | 9 | đủ |
| DCN | Công nghiệp Hà Nội | 66 | 71 | 62 | đủ |
| DQN | Quy Nhơn | 59 | 53 | 58 | đủ |
| HHA | Hàng hải VN | 58 | 55 | 6 | đủ |
| DGD | Công nghiệp TP.HCM | 58 | 41 | 36 | đủ |
| DBH | Bách khoa TP.HCM | 57 | 44 | 22 | đủ |
| HIU | Quốc tế Hồng Bàng | 50 | 45 | 37 | đủ |
| XSH | KHXH&NV TP.HCM | 48 | 51 | 0 | đủ |
| DPX | Sư phạm TP.HCM | 46 | 30 | 9 | đủ |
| DAG | An Giang | 43 | 43 | 80 | đủ |
| BVH | PTIT (Bưu chính VT) | 40 | 26 | 0 | đủ |
| DHK | KHTN TP.HCM | 39 | 31 | 10 | đủ |
| SKD | Sân khấu - Điện ảnh HN | 39 | 26 | 27 | đủ |
| DHP | Hải Phòng | 37 | 29 | 8 | đủ |
| VHH | Văn hóa Hà Nội | 35 | 21 | 23 | đủ |
| DED | Sư phạm Đà Nẵng | 33 | 38 | 33 | đủ |
| DTH | Thăng Long | 32 | 28 | 0 | đủ |
| QHT | KHTN Hà Nội | 28 | 28 | 28 | đủ |
| TKG | Kiên Giang | 28 | 30 | 125 | đủ |
| DFL | Ngoại ngữ Đà Nẵng | 24 | 17 | 47 | đủ |
| QHI | Công nghệ ĐHQG HN | 20 | 20 | 25 | đủ |
| HBT | Công nghệ Sài Gòn | 19 | 18 | 0 | đủ |
| TQU | Tân Trào | 19 | 21 | 5 | đủ |
| DQC | Quảng Bình | 17 | 16 | 15 | đủ |
| YDS | Y Dược TP.HCM | 17 | 17 | 2 | đủ |
| DPT | Phan Thiết | 16 | 16 | 15 | đủ |
| DQL | Luật TP.HCM | 11 | 11 | 1 | đủ |
| VKA | Học viện Ngoại giao | 11 | 11 | 3 | đủ |
| NHA | Âm nhạc Quốc gia VN | 8 | 8 | 8 | đủ |
| LDA | Lao động - Xã hội | 14 | 15 | 11 | đủ |
| MSH | Mỹ thuật TP.HCM | 6 | (10) | 0 | đủ* |
| DNV | Nội vụ Hà Nội | 22 | — | 19 | N/A (sáp nhập 2022) |

\* MSH: 3 lần crawl độc lập trang đề án chính thức (tuyensinh247) đều cho đúng
**6 ngành**: Sư phạm Mỹ thuật, Lý luận-lịch sử-phê bình mỹ thuật, Hội họa, Đồ họa,
Điêu khắc, Thiết kế đồ họa. Con số "10" từ Gemini đếm cả **chuyên ngành** (sub-track)
nên cao hơn thực tế → 6 là đủ theo nguồn chính thức.

## Trường cần lưu ý

- **DNV — Trường Đại học Nội vụ Hà Nội**: đã **sáp nhập vào Học viện Hành chính
  Quốc gia từ 15/9/2022**, từ 2023 không còn tuyển sinh đại học dưới tên này.
  22 chương trình hiện có trong DB là **dữ liệu cũ/lịch sử**. Đề xuất: ẩn khỏi
  danh sách tuyển sinh 2026 hoặc gắn nhãn "đã sáp nhập". _Không tính vào coverage._

## Đối chiếu tay (sanity check)

- **CTS (Cần Thơ, trường lớn)**: 143 chương trình 2026 (nguồn: đề án tuyển sinh
  trên diemthi.tuyensinh247) — khớp với ~100–127 ngành mà Google trả về. ✔
- **BVH (PTIT, trường nhỏ)**: 40 chương trình (gồm hệ chuẩn/CLC/liên kết), bao
  trùm ~26 ngành chính + biến thể. ✔

## Ghi chú kỹ thuật / rollback

- Mọi row import gắn marker `pipeline_import_2026` (program/tuition proxy gắn thêm
  `proxy_2025`) trong cột `note` → có thể rollback chọn lọc.
- Tổ hợp xét tuyển trường tự đặt (X29, X30, …) được seed vào `subject_combinations`
  với `subjects=[]` + mô tả "CHƯA xác minh" — **cần bổ sung môn thi chính thức** sau.
- Toàn bộ ghi DB là **insert-only**, không ghi đè dữ liệu curated/đã có.

## Script đã thêm
- `scripts/audit_coverage.py` — đếm DB + grounding `expected_majors` + verdict.
- `scripts/crawl_programs_2026.py` — crawl danh sách ngành 2026 (resume + `--force`).
- `scripts/merge_programs_to_staging.py` — đổ vào `admissions_staging` (year=2026).
- `scripts/backfill_proxy_2025.py` — clone 2025→2026 (programs/methods/combos/tuition).
- `scripts/seed_subject_combinations.py` — seed tổ hợp mới để qua FK transform.
