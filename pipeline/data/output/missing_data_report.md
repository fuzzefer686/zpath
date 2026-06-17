# Báo cáo trường chưa có dữ liệu Điểm chuẩn / Học phí (2026-06-17)

Phạm vi: 75 trường (loại 5 trường curated HUST/FTU/NEU/UET/VINUNI).
"Chưa có" = 0 record trong bảng tương ứng. Chi tiết: `data/output/missing_data_report.csv`.

| Hạng mục | Số trường thiếu |
|---|---|
| Thiếu **điểm chuẩn** | 12 |
| Thiếu **học phí** | 15 |
| Thiếu **cả hai** | 3 |

## 1. Thiếu CẢ điểm chuẩn LẪN học phí (3) — ưu tiên cao
| Mã | Trường | Ngành 2026 |
|---|---|---|
| DDT | Đại học Duy Tân | 58 |
| SGD | Đại học Sài Gòn | 48 |
| TDTU | Đại học Tôn Đức Thắng | 51 |

→ 3 trường lớn, nhiều ngành mà trống cả 2 mục → nên xử lý trước (đề án PDF / trang điểm chuẩn đầy đủ).

## 2. Chỉ thiếu ĐIỂM CHUẨN (đã có học phí) — 9
OU (hp 64), XSH (62), VLU (54), KTC (42), QSK (40), RMIT (17), BTU (18), CSH (10), HBT (2).
- **RMIT**: không có điểm chuẩn THPT (xét học bạ/portfolio) — coi như hợp lệ.
- **CSH** (Cảnh sát): điểm chuẩn khối CA công bố hạn chế.
- Còn lại (OU, XSH, VLU, KTC, QSK, BTU, HBT): nguồn điểm chuẩn 2025 chỉ ra bảng một phần → cần trang điểm chuẩn đầy đủ.

## 3. Chỉ thiếu HỌC PHÍ (đã có điểm chuẩn) — 12
UNETI (đc 50), HAU (38), DED (33), QHT (28), DPH (28), TBU (25), LDA (11), DHP (8), HHA (6), MSH (5), KMA (4), DQL (1).
- Học phí không công bố theo ngành công khai, hoặc chỉ có range quá rộng (đã loại để giữ chính xác).
- KMA/MSH (Mật mã/Mỹ thuật) đặc thù; cần đề án PDF.

## Nguyên nhân chung & hướng xử lý
- **Điểm chuẩn 2026 chưa có** (toàn hệ thống) — sẽ công bố ~8/2026; hiện chỉ có 2025 làm tham chiếu.
- Nhiều trường **không công bố điểm chuẩn/học phí theo từng ngành** trên web → crawl tự động đã chạm trần.
- **Cách chính xác nhất**: đề án tuyển sinh PDF của trường (như đã làm cho YDH) → trích đủ ngành + học phí + (điểm chuẩn 2025 nếu có).
