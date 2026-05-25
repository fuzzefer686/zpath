-- Seed export-ready admission rows for the four UniMap schools currently enabled:
-- HUST, FTU, VINUNI, NEU.
--
-- This migration intentionally uses idempotent INSERT ... WHERE NOT EXISTS patterns
-- because the original MVP seed did not define unique constraints on benchmarks,
-- tuition_fees, or data_sources.
--
-- Verification status convention:
-- - verified: source URL is an official school/admissions page.
-- - partially_verified: values are from press/aggregated admissions pages and should
--   be replaced by official school PDFs when available.
-- - placeholder: ZPATH display/export placeholder where the school does not publish
--   a directly comparable THPT-style benchmark.

INSERT INTO public.schools (
  code,
  name,
  slug,
  english_name,
  type,
  city,
  website,
  description,
  source_url,
  last_checked_at
) VALUES
  (
    'FTU',
    'Đại học Ngoại thương',
    'dai-hoc-ngoai-thuong',
    'Foreign Trade University',
    'Công lập',
    'Hà Nội',
    'https://ftu.edu.vn',
    'Trường đại học công lập định hướng kinh tế, kinh doanh quốc tế, ngoại thương, logistics và quản trị.',
    'https://ftu.edu.vn',
    now()
  ),
  (
    'VINUNI',
    'Đại học VinUni',
    'dai-hoc-vinuni',
    'VinUniversity',
    'Tư thục',
    'Hà Nội',
    'https://vinuni.edu.vn',
    'Trường đại học tư thục định hướng quốc tế, xét tuyển toàn diện theo hồ sơ và phỏng vấn.',
    'https://vinuni.edu.vn/admission/',
    now()
  ),
  (
    'NEU',
    'Đại học Kinh tế Quốc dân',
    'dai-hoc-kinh-te-quoc-dan',
    'National Economics University',
    'Công lập',
    'Hà Nội',
    'https://neu.edu.vn',
    'Trường đại học công lập đầu ngành về kinh tế, quản trị, tài chính, ngân hàng, luật và công nghệ trong kinh doanh.',
    'https://neu.edu.vn',
    now()
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  english_name = EXCLUDED.english_name,
  type = EXCLUDED.type,
  city = EXCLUDED.city,
  website = EXCLUDED.website,
  description = EXCLUDED.description,
  source_url = EXCLUDED.source_url,
  last_checked_at = EXCLUDED.last_checked_at;

INSERT INTO public.admission_methods (
  school_code,
  method_code,
  method_name,
  year,
  description,
  is_active,
  source_url
) VALUES
  ('FTU', 'THPT', 'Xét tuyển theo điểm thi tốt nghiệp THPT', 2025, 'Phương thức sử dụng kết quả thi tốt nghiệp THPT năm 2025; dữ liệu seed tập trung vào các chương trình đại diện đang hiển thị trên UniMap.', true, 'https://qtkd.ftu.edu.vn/2025/tin-tuc/thong-tin-bao-chi-hieu-dung-ve-diem-chuan-tuyen-sinh-dai-hoc-chinh-quy-nam-2025-cua-truong-dai-hoc-ngoai-thuong/'),
  ('FTU', 'HOC_BA', 'Xét tuyển sử dụng kết quả học tập THPT', 2025, 'Phương thức xét tuyển học bạ/điều kiện học tập theo đề án tuyển sinh của trường.', true, 'https://ftu.edu.vn'),
  ('FTU', 'DGNL', 'Xét tuyển sử dụng chứng chỉ đánh giá năng lực trong nước và quốc tế', 2025, 'Phương thức xét tuyển bằng chứng chỉ/đánh giá năng lực; cần đối chiếu đề án chính thức khi cập nhật dữ liệu chi tiết.', true, 'https://ftu.edu.vn'),
  ('VINUNI', 'HOLISTIC', 'Xét tuyển toàn diện', 2025, 'VinUni đánh giá ứng viên toàn diện theo hồ sơ, thành tích học tập, năng lực cá nhân, bài luận/phỏng vấn và tiêu chí AACC.', true, 'https://vinuni.edu.vn/admission/'),
  ('NEU', 'THPT', 'Xét tuyển theo điểm thi tốt nghiệp THPT', 2025, 'Phương thức sử dụng kết quả thi tốt nghiệp THPT năm 2025; điểm chuẩn trong seed lấy theo bảng công bố năm 2025.', true, 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
  ('NEU', 'DGNL', 'Xét tuyển kết hợp/chứng chỉ/đánh giá năng lực', 2025, 'Nhóm phương thức xét tuyển kết hợp và sử dụng chứng chỉ/đánh giá năng lực; dùng cho cấu trúc dữ liệu export.', true, 'https://neu.edu.vn')
ON CONFLICT (school_code, method_code, year) DO UPDATE SET
  method_name = EXCLUDED.method_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  source_url = EXCLUDED.source_url;

INSERT INTO public.admission_programs (
  school_code,
  program_code,
  program_name,
  major_code,
  major_name,
  year,
  quota,
  degree_level,
  training_type,
  note,
  source_url
) VALUES
  ('FTU', 'FTU01', 'Kinh tế đối ngoại', '7310106', 'Kinh tế quốc tế/Kinh tế đối ngoại', 2025, null, 'Đại học', 'Chính quy', 'Program code follows current ZPATH UniMap fallback data; replace with official FTU code if needed.', 'https://ftu.edu.vn'),
  ('FTU', 'FTU02', 'Marketing quốc tế', '7340115', 'Marketing', 2025, null, 'Đại học', 'Chính quy', 'Program code follows current ZPATH UniMap fallback data; replace with official FTU code if needed.', 'https://ftu.edu.vn'),
  ('FTU', 'FTU04', 'Logistics và Quản lý chuỗi cung ứng', '7510605', 'Logistics và Quản lý chuỗi cung ứng', 2025, null, 'Đại học', 'Chính quy', 'Program code follows current ZPATH UniMap fallback data; replace with official FTU code if needed.', 'https://ftu.edu.vn'),
  ('VINUNI', 'VIN-CS', 'Khoa học máy tính', '7480101', 'Khoa học máy tính', 2025, null, 'Đại học', 'Chính quy', 'Program code follows current ZPATH UniMap fallback data.', 'https://admissions.vinuni.edu.vn/tuition-fee/'),
  ('VINUNI', 'VIN-BBA', 'Quản trị kinh doanh', '7340101', 'Quản trị kinh doanh', 2025, null, 'Đại học', 'Chính quy', 'Program code follows current ZPATH UniMap fallback data.', 'https://admissions.vinuni.edu.vn/tuition-fee/'),
  ('VINUNI', 'VIN-ME', 'Kỹ thuật cơ khí', '7520103', 'Kỹ thuật cơ khí', 2025, null, 'Đại học', 'Chính quy', 'Program code follows current ZPATH UniMap fallback data.', 'https://admissions.vinuni.edu.vn/tuition-fee/'),
  ('NEU', 'EBBA01', 'Marketing', '7340115', 'Marketing', 2025, 150, 'Đại học', 'Chính quy', 'Quota and benchmark based on NEU 2025 published table where available.', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
  ('NEU', 'EBBA02', 'Tài chính - Ngân hàng', '7340201', 'Tài chính - Ngân hàng', 2025, null, 'Đại học', 'Chính quy', 'Program code follows current ZPATH UniMap fallback data; quota should be completed from official NEU source.', 'https://neu.edu.vn'),
  ('NEU', 'EBBA03', 'Kinh tế đối ngoại', '7310106', 'Kinh tế quốc tế/Kinh tế đối ngoại', 2025, 100, 'Đại học', 'Chính quy', 'Mapped to NEU Kinh tế quốc tế row for current ZPATH display.', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1')
ON CONFLICT (school_code, program_code, year) DO UPDATE SET
  program_name = EXCLUDED.program_name,
  major_code = EXCLUDED.major_code,
  major_name = EXCLUDED.major_name,
  quota = EXCLUDED.quota,
  degree_level = EXCLUDED.degree_level,
  training_type = EXCLUDED.training_type,
  note = EXCLUDED.note,
  source_url = EXCLUDED.source_url;

INSERT INTO public.program_combinations (
  program_id,
  combination_code,
  year,
  method_code,
  source_url
)
SELECT
  admission_programs.id,
  combinations.combination_code,
  admission_programs.year,
  combinations.method_code,
  combinations.source_url
FROM public.admission_programs
JOIN (
  VALUES
    ('HUST', 'IT1', 'A00', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'IT1', 'A01', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'IT2', 'A00', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'IT2', 'A01', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'IT-E10', 'A00', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'IT-E10', 'A01', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'ET1', 'A00', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'ET1', 'A01', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'ME1', 'A00', 'THPT', 'https://hust.edu.vn'),
    ('HUST', 'ME1', 'A01', 'THPT', 'https://hust.edu.vn'),
    ('FTU', 'FTU01', 'A00', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU01', 'A01', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU01', 'D01', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU01', 'D07', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU02', 'A00', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU02', 'A01', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU02', 'D01', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU02', 'D07', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU04', 'A00', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU04', 'A01', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU04', 'D01', 'THPT', 'https://ftu.edu.vn'),
    ('FTU', 'FTU04', 'D07', 'THPT', 'https://ftu.edu.vn'),
    ('NEU', 'EBBA01', 'A00', 'THPT', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
    ('NEU', 'EBBA01', 'A01', 'THPT', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
    ('NEU', 'EBBA01', 'D01', 'THPT', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
    ('NEU', 'EBBA01', 'D07', 'THPT', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
    ('NEU', 'EBBA02', 'A00', 'THPT', 'https://neu.edu.vn'),
    ('NEU', 'EBBA02', 'A01', 'THPT', 'https://neu.edu.vn'),
    ('NEU', 'EBBA02', 'D01', 'THPT', 'https://neu.edu.vn'),
    ('NEU', 'EBBA02', 'D07', 'THPT', 'https://neu.edu.vn'),
    ('NEU', 'EBBA03', 'A00', 'THPT', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
    ('NEU', 'EBBA03', 'A01', 'THPT', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
    ('NEU', 'EBBA03', 'D01', 'THPT', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
    ('NEU', 'EBBA03', 'D07', 'THPT', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1')
) AS combinations(school_code, program_code, combination_code, method_code, source_url)
  ON admission_programs.school_code = combinations.school_code
  AND admission_programs.program_code = combinations.program_code
  AND admission_programs.year = 2025
ON CONFLICT (program_id, combination_code, year, method_code) DO UPDATE SET
  source_url = EXCLUDED.source_url;

WITH benchmark_seed(school_code, program_code, method_code, combination_code, score, scale, note, source_url) AS (
  VALUES
    ('HUST', 'IT1', 'THPT', null::text, 29.19::numeric, 30, 'Partially verified 2025 benchmark; replace with official HUST export/PDF when available.', 'https://baochinhphu.vn/diem-chuan-cua-dai-hoc-bach-khoa-ha-noi-nganh-khoa-hoc-du-lieu-va-tri-tue-nhan-tao-dan-dau-voi-2939-diem-102250822162052678.htm'),
    ('HUST', 'IT2', 'THPT', null::text, 28.87::numeric, 30, 'Partially verified 2025 benchmark from admissions aggregators; replace with official HUST export/PDF when available.', 'https://trangedu.com/diem-chuan/diem-chuan-dai-hoc-bach-khoa-ha-noi/'),
    ('HUST', 'IT-E10', 'THPT', null::text, 29.39::numeric, 30, 'Partially verified 2025 benchmark; replace with official HUST export/PDF when available.', 'https://baochinhphu.vn/diem-chuan-cua-dai-hoc-bach-khoa-ha-noi-nganh-khoa-hoc-du-lieu-va-tri-tue-nhan-tao-dan-dau-voi-2939-diem-102250822162052678.htm'),
    ('HUST', 'ET1', 'THPT', null::text, 28.07::numeric, 30, 'Partially verified 2025 benchmark; replace with official HUST export/PDF when available.', 'https://baochinhphu.vn/diem-chuan-cua-dai-hoc-bach-khoa-ha-noi-nganh-khoa-hoc-du-lieu-va-tri-tue-nhan-tao-dan-dau-voi-2939-diem-102250822162052678.htm'),
    ('HUST', 'ME1', 'THPT', null::text, 27.95::numeric, 30, 'Partially verified 2025 benchmark from admissions aggregators; replace with official HUST export/PDF when available.', 'https://truongvietnam.com/hust-diem-chuan-12090.html'),
    ('FTU', 'FTU01', 'THPT', null::text, 28.50::numeric, 30, 'Partially verified 2025 benchmark; FTU program code is ZPATH display code and should be mapped to official FTU code before production export.', 'https://giaoduc.net.vn/truong-dh-ngoai-thuong-cong-bo-diem-trung-tuyen-nganh-cao-nhat-lay-285-diem-post253924.gd'),
    ('FTU', 'FTU02', 'THPT', null::text, 28.10::numeric, 30, 'ZPATH display benchmark placeholder based on current fallback data; verify against official FTU admission table.', 'https://ftu.edu.vn'),
    ('FTU', 'FTU04', 'THPT', null::text, 27.95::numeric, 30, 'ZPATH display benchmark placeholder based on current fallback data; verify against official FTU admission table.', 'https://ftu.edu.vn'),
    ('VINUNI', 'VIN-CS', 'HOLISTIC', null::text, 27.50::numeric, 30, 'ZPATH display placeholder. VinUni uses holistic admissions and does not publish a directly comparable THPT benchmark for this row.', 'https://vinuni.edu.vn/admission/'),
    ('VINUNI', 'VIN-BBA', 'HOLISTIC', null::text, 27.10::numeric, 30, 'ZPATH display placeholder. VinUni uses holistic admissions and does not publish a directly comparable THPT benchmark for this row.', 'https://vinuni.edu.vn/admission/'),
    ('VINUNI', 'VIN-ME', 'HOLISTIC', null::text, 26.80::numeric, 30, 'ZPATH display placeholder. VinUni uses holistic admissions and does not publish a directly comparable THPT benchmark for this row.', 'https://vinuni.edu.vn/admission/'),
    ('NEU', 'EBBA01', 'THPT', null::text, 28.12::numeric, 30, 'Verified from NEU 2025 published benchmark table for Marketing.', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1'),
    ('NEU', 'EBBA02', 'THPT', null::text, 27.65::numeric, 30, 'ZPATH display benchmark placeholder based on current fallback data; verify against official NEU 2025 table before production export.', 'https://neu.edu.vn'),
    ('NEU', 'EBBA03', 'THPT', null::text, 28.13::numeric, 30, 'Mapped to NEU Kinh tế quốc tế 2025 row from published benchmark table.', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1')
)
INSERT INTO public.benchmarks (
  school_code,
  program_id,
  year,
  method_code,
  combination_code,
  score,
  scale,
  note,
  source_url
)
SELECT
  benchmark_seed.school_code,
  admission_programs.id,
  2025,
  benchmark_seed.method_code,
  benchmark_seed.combination_code,
  benchmark_seed.score,
  benchmark_seed.scale,
  benchmark_seed.note,
  benchmark_seed.source_url
FROM benchmark_seed
JOIN public.admission_programs
  ON admission_programs.school_code = benchmark_seed.school_code
  AND admission_programs.program_code = benchmark_seed.program_code
  AND admission_programs.year = 2025
WHERE NOT EXISTS (
  SELECT 1
  FROM public.benchmarks existing
  WHERE existing.school_code = benchmark_seed.school_code
    AND existing.program_id = admission_programs.id
    AND existing.year = 2025
    AND existing.method_code = benchmark_seed.method_code
    AND existing.combination_code IS NOT DISTINCT FROM benchmark_seed.combination_code
);

WITH tuition_seed(school_code, program_code, min_fee, max_fee, unit, description, note, source_url) AS (
  VALUES
    ('HUST', 'IT1', 15000000::numeric, 17000000::numeric, 'học kỳ', 'Học phí tham khảo nhóm chương trình chuẩn/kỹ thuật của HUST.', 'Partially verified estimate for export; replace with official HUST tuition row if exact program fee is needed.', 'https://hust.edu.vn'),
    ('HUST', 'IT2', 15000000::numeric, 17000000::numeric, 'học kỳ', 'Học phí tham khảo nhóm chương trình chuẩn/kỹ thuật của HUST.', 'Partially verified estimate for export; replace with official HUST tuition row if exact program fee is needed.', 'https://hust.edu.vn'),
    ('HUST', 'IT-E10', 32000000::numeric, 33500000::numeric, 'học kỳ', 'Học phí tham khảo chương trình tiên tiến Khoa học dữ liệu và Trí tuệ nhân tạo.', 'Partially verified from public press summary; replace with official HUST tuition table when available.', 'https://baochinhphu.vn/diem-chuan-cua-dai-hoc-bach-khoa-ha-noi-nganh-khoa-hoc-du-lieu-va-tri-tue-nhan-tao-dan-dau-voi-2939-diem-102250822162052678.htm'),
    ('HUST', 'ET1', 15000000::numeric, 17000000::numeric, 'học kỳ', 'Học phí tham khảo nhóm chương trình chuẩn/kỹ thuật của HUST.', 'Partially verified estimate for export; replace with official HUST tuition row if exact program fee is needed.', 'https://hust.edu.vn'),
    ('HUST', 'ME1', 15000000::numeric, 17000000::numeric, 'học kỳ', 'Học phí tham khảo nhóm chương trình chuẩn/kỹ thuật của HUST.', 'Partially verified estimate for export; replace with official HUST tuition row if exact program fee is needed.', 'https://hust.edu.vn'),
    ('FTU', 'FTU01', 12000000::numeric, 12000000::numeric, 'học kỳ', 'Học phí tham khảo theo dữ liệu UniMap hiện tại.', 'Placeholder from current ZPATH fallback data; update from official FTU finance notice before production export.', 'https://ftu.edu.vn'),
    ('FTU', 'FTU02', 12000000::numeric, 12000000::numeric, 'học kỳ', 'Học phí tham khảo theo dữ liệu UniMap hiện tại.', 'Placeholder from current ZPATH fallback data; update from official FTU finance notice before production export.', 'https://ftu.edu.vn'),
    ('FTU', 'FTU04', 12000000::numeric, 12000000::numeric, 'học kỳ', 'Học phí tham khảo theo dữ liệu UniMap hiện tại.', 'Placeholder from current ZPATH fallback data; update from official FTU finance notice before production export.', 'https://ftu.edu.vn'),
    ('VINUNI', 'VIN-CS', 407925000::numeric, 407925000::numeric, 'học kỳ', 'Listed tuition fee per semester for other bachelor programs, academic year 2025-2026.', 'Verified from VinUni undergraduate tuition page; listed fee before applicable subsidy/scholarship/financial aid.', 'https://admissions.vinuni.edu.vn/tuition-fee/'),
    ('VINUNI', 'VIN-BBA', 407925000::numeric, 407925000::numeric, 'học kỳ', 'Listed tuition fee per semester for other bachelor programs, academic year 2025-2026.', 'Verified from VinUni undergraduate tuition page; listed fee before applicable subsidy/scholarship/financial aid.', 'https://admissions.vinuni.edu.vn/tuition-fee/'),
    ('VINUNI', 'VIN-ME', 407925000::numeric, 407925000::numeric, 'học kỳ', 'Listed tuition fee per semester for other bachelor programs, academic year 2025-2026.', 'Verified from VinUni undergraduate tuition page; listed fee before applicable subsidy/scholarship/financial aid.', 'https://admissions.vinuni.edu.vn/tuition-fee/'),
    ('NEU', 'EBBA01', 11000000::numeric, 11000000::numeric, 'học kỳ', 'Học phí tham khảo theo dữ liệu UniMap hiện tại.', 'Placeholder from current ZPATH fallback data; update from official NEU tuition notice before production export.', 'https://neu.edu.vn'),
    ('NEU', 'EBBA02', 11000000::numeric, 11000000::numeric, 'học kỳ', 'Học phí tham khảo theo dữ liệu UniMap hiện tại.', 'Placeholder from current ZPATH fallback data; update from official NEU tuition notice before production export.', 'https://neu.edu.vn'),
    ('NEU', 'EBBA03', 11000000::numeric, 11000000::numeric, 'học kỳ', 'Học phí tham khảo theo dữ liệu UniMap hiện tại.', 'Placeholder from current ZPATH fallback data; update from official NEU tuition notice before production export.', 'https://neu.edu.vn')
)
INSERT INTO public.tuition_fees (
  school_code,
  program_id,
  year,
  min_fee,
  max_fee,
  currency,
  unit,
  description,
  note,
  source_url
)
SELECT
  tuition_seed.school_code,
  admission_programs.id,
  2025,
  tuition_seed.min_fee,
  tuition_seed.max_fee,
  'VND',
  tuition_seed.unit,
  tuition_seed.description,
  tuition_seed.note,
  tuition_seed.source_url
FROM tuition_seed
JOIN public.admission_programs
  ON admission_programs.school_code = tuition_seed.school_code
  AND admission_programs.program_code = tuition_seed.program_code
  AND admission_programs.year = 2025
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tuition_fees existing
  WHERE existing.school_code = tuition_seed.school_code
    AND existing.program_id IS NOT DISTINCT FROM admission_programs.id
    AND existing.year = 2025
    AND existing.unit IS NOT DISTINCT FROM tuition_seed.unit
);

INSERT INTO public.data_sources (
  entity_type,
  entity_id,
  school_code,
  source_name,
  source_url,
  source_type,
  verified_status,
  last_checked_at,
  note
)
SELECT *
FROM (
  VALUES
    ('school', null::uuid, 'HUST', 'Đại học Bách khoa Hà Nội', 'https://hust.edu.vn', 'official_website', 'verified', now(), 'Official HUST website; use for school profile and official notices.'),
    ('benchmark', null::uuid, 'HUST', 'Báo Chính phủ - điểm chuẩn HUST 2025', 'https://baochinhphu.vn/diem-chuan-cua-dai-hoc-bach-khoa-ha-noi-nganh-khoa-hoc-du-lieu-va-tri-tue-nhan-tao-dan-dau-voi-2939-diem-102250822162052678.htm', 'press', 'partially_verified', now(), 'Public press summary for selected HUST 2025 benchmarks. Replace with official HUST PDF/export if available.'),
    ('school', null::uuid, 'FTU', 'Trường Đại học Ngoại thương', 'https://ftu.edu.vn', 'official_website', 'verified', now(), 'Official FTU website; detailed program-code mapping still needs official admission-plan import.'),
    ('benchmark', null::uuid, 'FTU', 'Giáo dục Việt Nam - điểm chuẩn FTU 2025', 'https://giaoduc.net.vn/truong-dh-ngoai-thuong-cong-bo-diem-trung-tuyen-nganh-cao-nhat-lay-285-diem-post253924.gd', 'press', 'partially_verified', now(), 'Public press summary for FTU 2025 top benchmark; replace placeholders with official FTU admission table.'),
    ('school', null::uuid, 'VINUNI', 'VinUni Admission', 'https://vinuni.edu.vn/admission/', 'official_admission_page', 'verified', now(), 'Official VinUni admission page.'),
    ('tuition_fee', null::uuid, 'VINUNI', 'VinUni Undergraduate Tuition Fees 2025-2026', 'https://admissions.vinuni.edu.vn/tuition-fee/', 'official_admission_page', 'verified', now(), 'Official listed tuition fee page for academic year 2025-2026.'),
    ('school', null::uuid, 'NEU', 'Đại học Kinh tế Quốc dân', 'https://neu.edu.vn', 'official_website', 'verified', now(), 'Official NEU website.'),
    ('benchmark', null::uuid, 'NEU', 'NEU 2025 benchmark table', 'https://fit.neu.edu.vn/post/diem-chuan-trung-tuyen-dai-hoc-chinh-quy-nam-2025-cua-neu-1', 'official_school_page', 'verified', now(), 'NEU published 2025 benchmark table mirrored on faculty site.')
) AS sources(entity_type, entity_id, school_code, source_name, source_url, source_type, verified_status, last_checked_at, note)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.data_sources existing
  WHERE existing.school_code IS NOT DISTINCT FROM sources.school_code
    AND existing.entity_type = sources.entity_type
    AND existing.source_url = sources.source_url
);
