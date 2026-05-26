-- HUST benchmark fallback seed data for admission calculator MVP.
-- Sample data for development only. Replace with verified official data before production.

WITH sample_benchmarks(program_code, method_code, combination_code, score, scale) AS (
  VALUES
    ('IT1', 'THPT', null::text, 28.40::numeric, 30),
    ('IT2', 'THPT', null::text, 27.65::numeric, 30),
    ('IT-E10', 'THPT', null::text, 28.10::numeric, 30),
    ('ET1', 'THPT', null::text, 26.70::numeric, 30),
    ('ME1', 'THPT', null::text, 26.60::numeric, 30),
    ('IT1', 'TSA', null::text, 78.00::numeric, 100),
    ('IT2', 'TSA', null::text, 76.00::numeric, 100),
    ('IT-E10', 'TSA', null::text, 77.00::numeric, 100),
    ('ET1', 'TSA', null::text, 72.00::numeric, 100),
    ('ME1', 'TSA', null::text, 71.00::numeric, 100),
    ('IT1', 'XTTN', null::text, 28.20::numeric, 30),
    ('IT2', 'XTTN', null::text, 27.40::numeric, 30),
    ('IT-E10', 'XTTN', null::text, 28.00::numeric, 30),
    ('ET1', 'XTTN', null::text, 26.50::numeric, 30),
    ('ME1', 'XTTN', null::text, 26.40::numeric, 30)
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
  sample_benchmarks.method_code,
  sample_benchmarks.combination_code,
  sample_benchmarks.score,
  sample_benchmarks.scale,
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
    AND existing.method_code = sample_benchmarks.method_code
    AND existing.combination_code IS NOT DISTINCT FROM sample_benchmarks.combination_code
);
