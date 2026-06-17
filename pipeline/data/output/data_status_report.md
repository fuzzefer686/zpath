# Báo cáo tình trạng dữ liệu — 80 trường (2026-06-17)

Nguồn: bảng `admission_programs`, `benchmarks`, `tuition_fees` (DB production).
Tổng records: **programs 3.693 · benchmarks 2.498 · tuition 778**.
Chi tiết từng trường: `data/output/data_status_report.csv`.

## 1. Chương trình đào tạo (programs 2026)

| Mức độ | Số trường |
|---|---|
| ≥ 20 ngành | 47 |
| 10–19 ngành | 17 |
| 1–9 ngành | 14 |
| 0 ngành 2026 | 2 (UET, VINUNI — đều dùng dữ liệu tĩnh curated) |
| **Có dữ liệu 2026** | **78/80** |

→ Mục chương trình đào tạo **phủ tốt nhất**. Nhóm 1–9 ngành phần lớn là trường nhỏ/đặc thù đúng thực tế (KMA, ANH, YQD, VNC, DHA, DKH, HMT, MSH, DLA, UMT, VJD).

## 2. Điểm chuẩn (benchmarks)

- **Chỉ 32/80 trường có điểm chuẩn** (tất cả là năm **2025**; điểm chuẩn 2026 chưa công bố, dự kiến ~8/2026).
- **48/80 trường KHÔNG có điểm chuẩn** — gồm gần như **toàn bộ 48 trường batch 2** (chỉ crawl đề án/chương trình, chưa crawl điểm chuẩn 2025) + vài trường batch 1 (BVH, XSH, DTH, HBT, OU…).
- Trường có điểm chuẩn dày: NEU (528), FTU (491), HUST (195), TKG (125), DAG (80).

→ Đây là **lỗ hổng lớn nhất**. Cần chạy `crawl_diemchuan_2025.py` cho 48 trường thiếu.

## 3. Học phí (tuition)

- **Chỉ 26/80 trường có học phí**; **54/80 KHÔNG có**.
- Trường có học phí: NEU (193), FTU (98), HUST (95), DBH (57), DTH (41), DCT (33), TBD/QHI (22)…
- Phần lớn batch 2 thiếu học phí (crawl đề án không kèm học phí, hoặc trường công bố muộn).

→ Lỗ hổng lớn thứ hai. Học phí thường nằm cùng trang đề án — có thể bổ sung qua re-crawl có chủ đích hoặc nhập từ PDF đề án.

## Tổng kết độ phủ 3 mục

| Mục | Có dữ liệu | Thiếu | % phủ |
|---|---|---|---|
| Chương trình 2026 | 78 | 2 | 98% |
| Điểm chuẩn (2025) | 32 | 48 | 40% |
| Học phí | 26 | 54 | 33% |

## Khuyến nghị ưu tiên
1. **Điểm chuẩn 2025** cho 48 trường thiếu (đặc biệt batch 2) — dùng `crawl_diemchuan_2025.py` (đã có, nguồn tuyensinh247 tốt).
2. **Học phí** cho 54 trường — re-crawl trang đề án 2026 lấy `tuition_min/max`, hoặc ingest PDF đề án.
3. Trường 0 ngành 2026 (UET, VINUNI) dùng dữ liệu tĩnh curated — kiểm tra hiển thị thực tế trên trang.
