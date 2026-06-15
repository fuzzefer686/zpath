# Bổ sung dữ liệu ngành bằng PDF thủ công

Khi search engine trả thiếu ngành cho một trường, đặt **file PDF đề án tuyển
sinh / danh mục ngành chính thức** vào thư mục này để pipeline đọc trực tiếp
(Gemini đọc PDF native nên giữ bảng/cột tốt hơn nhiều so với crawl HTML).

## Cách dùng

1. Đặt file vào đây, **tên file = mã trường** (viết hoa), đuôi `.pdf`:
   ```
   pipeline/data/input/pdfs/MSH.pdf
   pipeline/data/input/pdfs/XSH.pdf
   ```

2. Chạy (từ thư mục `pipeline/`):
   ```bash
   .venv/bin/python scripts/ingest_pdf.py                  # tất cả PDF trong thư mục
   .venv/bin/python scripts/ingest_pdf.py --codes MSH,XSH  # chỉ vài trường

   # đổ vào DB (giống flow crawl):
   .venv/bin/python scripts/merge_programs_to_staging.py --codes MSH,XSH --yes
   .venv/bin/python scripts/promote_to_admissions.py --step admissions --include-partial --yes
   .venv/bin/python scripts/seed_subject_combinations.py --yes        # seed tổ hợp mới (FK)
   .venv/bin/python scripts/transform_to_frontend.py                  # ghi 6 bảng frontend

   # kiểm tra coverage sau khi nạp:
   .venv/bin/python scripts/audit_coverage.py --reuse-expected
   ```

3. `ingest_pdf.py` ghi ra `data/output/programs_2026_results/<MÃ>.json` (cùng
   định dạng với crawler) → các bước sau dùng lại nguyên si.

## Ghi chú
- Ưu tiên năm 2026; nếu PDF chỉ có 2025, dữ liệu được nạp làm **proxy 2026** và
  đánh dấu `proxy_2025` trong `note`.
- Mọi ghi DB là **insert-only**, gắn marker `pipeline_import_2026` → rollback được.
- File PDF trong thư mục này **không nên commit** (dữ liệu nguồn lớn) — chỉ giữ
  `README.md` này. Thêm `pipeline/data/input/pdfs/*.pdf` vào `.gitignore` nếu cần.
