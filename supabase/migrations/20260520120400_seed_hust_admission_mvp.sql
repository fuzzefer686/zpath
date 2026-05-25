-- HUST admission display MVP seed data.
-- Sample data for development only. Replace with verified official data before production.

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
) VALUES (
  'HUST',
  'Đại học Bách khoa Hà Nội',
  'dai-hoc-bach-khoa-ha-noi',
  'Hanoi University of Science and Technology',
  'Công lập',
  'Hà Nội',
  'https://hust.edu.vn',
  'Sample school profile for ZPATH admission display development. Replace or verify all admission details before production.',
  'sample://zpath-dev/hust-admission-mvp-2025',
  now()
)
ON CONFLICT DO NOTHING;

INSERT INTO public.subject_combinations (
  code,
  subjects,
  description
) VALUES
  (
    'A00',
    ARRAY['Toán', 'Vật lý', 'Hóa học']::text[],
    'Sample subject combination for development. Replace with verified official data before production.'
  ),
  (
    'A01',
    ARRAY['Toán', 'Vật lý', 'Tiếng Anh']::text[],
    'Sample subject combination for development. Replace with verified official data before production.'
  ),
  (
    'B00',
    ARRAY['Toán', 'Hóa học', 'Sinh học']::text[],
    'Sample subject combination for development. Replace with verified official data before production.'
  ),
  (
    'D01',
    ARRAY['Toán', 'Ngữ văn', 'Tiếng Anh']::text[],
    'Sample subject combination for development. Replace with verified official data before production.'
  ),
  (
    'D07',
    ARRAY['Toán', 'Hóa học', 'Tiếng Anh']::text[],
    'Sample subject combination for development. Replace with verified official data before production.'
  )
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admission_methods (
  school_code,
  method_code,
  method_name,
  year,
  description,
  is_active,
  source_url
) VALUES
  (
    'HUST',
    'THPT',
    'Xét tuyển theo điểm thi tốt nghiệp THPT',
    2025,
    'Sample method metadata for development. Replace with verified official data before production.',
    true,
    'sample://zpath-dev/hust-admission-mvp-2025'
  ),
  (
    'HUST',
    'TSA',
    'Xét tuyển theo điểm thi Đánh giá tư duy',
    2025,
    'Sample method metadata for development. Replace with verified official data before production.',
    true,
    'sample://zpath-dev/hust-admission-mvp-2025'
  ),
  (
    'HUST',
    'XTTN',
    'Xét tuyển tài năng',
    2025,
    'Sample method metadata for development. Replace with verified official data before production.',
    true,
    'sample://zpath-dev/hust-admission-mvp-2025'
  )
ON CONFLICT (school_code, method_code, year) DO NOTHING;

INSERT INTO public.admission_programs (
  school_code,
  program_code,
  program_name,
  major_code,
  major_name,
  year,
  degree_level,
  training_type,
  note,
  source_url
) VALUES
  (
    'HUST',
    'IT1',
    'Khoa học máy tính',
    '7480101',
    'Khoa học máy tính',
    2025,
    'Đại học',
    'Chính quy',
    'Sample data for development. Replace with verified official data before production.',
    'sample://zpath-dev/hust-admission-mvp-2025'
  ),
  (
    'HUST',
    'IT2',
    'Kỹ thuật máy tính',
    '7480106',
    'Kỹ thuật máy tính',
    2025,
    'Đại học',
    'Chính quy',
    'Sample data for development. Replace with verified official data before production.',
    'sample://zpath-dev/hust-admission-mvp-2025'
  ),
  (
    'HUST',
    'IT-E10',
    'Khoa học dữ liệu và Trí tuệ nhân tạo',
    null,
    'Khoa học dữ liệu và Trí tuệ nhân tạo',
    2025,
    'Đại học',
    'Chính quy',
    'Sample data for development. Replace with verified official data before production.',
    'sample://zpath-dev/hust-admission-mvp-2025'
  ),
  (
    'HUST',
    'ET1',
    'Kỹ thuật Điện tử - Viễn thông',
    '7520207',
    'Kỹ thuật Điện tử - Viễn thông',
    2025,
    'Đại học',
    'Chính quy',
    'Sample data for development. Replace with verified official data before production.',
    'sample://zpath-dev/hust-admission-mvp-2025'
  ),
  (
    'HUST',
    'ME1',
    'Kỹ thuật Cơ điện tử',
    '7520114',
    'Kỹ thuật Cơ điện tử',
    2025,
    'Đại học',
    'Chính quy',
    'Sample data for development. Replace with verified official data before production.',
    'sample://zpath-dev/hust-admission-mvp-2025'
  )
ON CONFLICT (school_code, program_code, year) DO NOTHING;

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
  'THPT',
  'sample://zpath-dev/hust-admission-mvp-2025'
FROM public.admission_programs
CROSS JOIN (
  VALUES
    ('A00'),
    ('A01')
) AS combinations(combination_code)
WHERE admission_programs.school_code = 'HUST'
  AND admission_programs.year = 2025
  AND admission_programs.program_code IN ('IT1', 'IT2', 'IT-E10', 'ET1', 'ME1')
ON CONFLICT (program_id, combination_code, year, method_code) DO NOTHING;

WITH sample_benchmarks(program_code, combination_code, score) AS (
  VALUES
    ('IT1', 'A00', 28.50::numeric),
    ('IT1', 'A01', 28.30::numeric),
    ('IT2', 'A00', 27.75::numeric),
    ('IT2', 'A01', 27.55::numeric),
    ('IT-E10', 'A00', 28.20::numeric),
    ('IT-E10', 'A01', 28.00::numeric),
    ('ET1', 'A00', 26.80::numeric),
    ('ET1', 'A01', 26.60::numeric),
    ('ME1', 'A00', 26.70::numeric),
    ('ME1', 'A01', 26.50::numeric)
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
  'HUST',
  admission_programs.id,
  2025,
  'THPT',
  sample_benchmarks.combination_code,
  sample_benchmarks.score,
  30,
  'Sample data for development. Replace with verified official data before production.',
  'sample://zpath-dev/hust-admission-mvp-2025'
FROM sample_benchmarks
JOIN public.admission_programs
  ON admission_programs.school_code = 'HUST'
  AND admission_programs.year = 2025
  AND admission_programs.program_code = sample_benchmarks.program_code
WHERE NOT EXISTS (
  SELECT 1
  FROM public.benchmarks existing
  WHERE existing.school_code = 'HUST'
    AND existing.program_id = admission_programs.id
    AND existing.year = 2025
    AND existing.method_code = 'THPT'
    AND existing.combination_code = sample_benchmarks.combination_code
);

INSERT INTO public.admission_info (
  school_code,
  year,
  total_quota,
  admission_scope,
  application_timeline,
  eligibility,
  notes,
  source_url
) VALUES (
  'HUST',
  2025,
  null,
  'Sample MVP admission scope for development display only.',
  'Sample MVP timeline for development display only.',
  'Sample MVP eligibility text for development display only.',
  'Sample data for development. Replace with verified official data before production.',
  'sample://zpath-dev/hust-admission-mvp-2025'
)
ON CONFLICT (school_code, year) DO NOTHING;
