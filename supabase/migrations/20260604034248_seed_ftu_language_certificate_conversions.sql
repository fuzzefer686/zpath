WITH source AS (
  SELECT 'FTU 2026 admissions methods, Decision No. 1566/QĐ-ĐHNT dated 08/04/2026, section IV conversion tables.'::text AS source_label
),
seed_rows (
  id,
  certificate_type,
  skill_name,
  band_id,
  min_score,
  max_score,
  text_value,
  label,
  bonus_score_out_of_10,
  converted_subject_score_out_of_10,
  notes
) AS (
  VALUES
    ('FTU_2026_IELTS_ACADEMIC_6_5', 'IELTS', NULL, 'ielts_6_5', 6.5, 6.5, NULL, 'IELTS Academic 6.5', 0, 8.5, 'International English certificate conversion table.'),
    ('FTU_2026_IELTS_ACADEMIC_7_0', 'IELTS', NULL, 'ielts_7_0', 7.0, 7.0, NULL, 'IELTS Academic 7.0', 0, 9.0, 'International English certificate conversion table.'),
    ('FTU_2026_IELTS_ACADEMIC_7_5', 'IELTS', NULL, 'ielts_7_5', 7.5, 7.5, NULL, 'IELTS Academic 7.5', 0, 9.5, 'International English certificate conversion table.'),
    ('FTU_2026_IELTS_ACADEMIC_8_0_9_0', 'IELTS', NULL, 'ielts_8_0_9_0', 8.0, 9.0, NULL, 'IELTS Academic 8.0-9.0', 0, 10.0, 'International English certificate conversion table.'),

    ('FTU_2026_TOEFL_IBT_79_92', 'TOEFL_IBT', NULL, 'toefl_ibt_79_92', 79, 92, NULL, 'TOEFL iBT 79-92', 0, 8.5, 'TOEFL iBT Home Edition is not accepted.'),
    ('FTU_2026_TOEFL_IBT_93_101', 'TOEFL_IBT', NULL, 'toefl_ibt_93_101', 93, 101, NULL, 'TOEFL iBT 93-101', 0, 9.0, 'TOEFL iBT Home Edition is not accepted.'),
    ('FTU_2026_TOEFL_IBT_102_109', 'TOEFL_IBT', NULL, 'toefl_ibt_102_109', 102, 109, NULL, 'TOEFL iBT 102-109', 0, 9.5, 'TOEFL iBT Home Edition is not accepted.'),
    ('FTU_2026_TOEFL_IBT_110_120', 'TOEFL_IBT', NULL, 'toefl_ibt_110_120', 110, 120, NULL, 'TOEFL iBT 110-120', 0, 10.0, 'TOEFL iBT Home Edition is not accepted.'),

    ('FTU_2026_SAT_1380_1390', 'SAT', NULL, 'sat_1380_1390', 1380, 1390, NULL, 'SAT 1380-1390', 0, 17.5, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_SAT_1400_1420', 'SAT', NULL, 'sat_1400_1420', 1400, 1420, NULL, 'SAT 1400-1420', 0, 18.0, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_SAT_1430_1470', 'SAT', NULL, 'sat_1430_1470', 1430, 1470, NULL, 'SAT 1430-1470', 0, 18.5, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_SAT_1480_1490', 'SAT', NULL, 'sat_1480_1490', 1480, 1490, NULL, 'SAT 1480-1490', 0, 19.0, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_SAT_1500_1520', 'SAT', NULL, 'sat_1500_1520', 1500, 1520, NULL, 'SAT 1500-1520', 0, 19.5, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_SAT_1530_1540', 'SAT', NULL, 'sat_1530_1540', 1530, 1540, NULL, 'SAT 1530-1540', 0, 19.75, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_SAT_1550_1600', 'SAT', NULL, 'sat_1550_1600', 1550, 1600, NULL, 'SAT 1550-1600', 0, 20.0, 'SAT/ACT international assessment conversion table, scale 20.'),

    ('FTU_2026_ACT_30', 'ACT', NULL, 'act_30', 30, 30, NULL, 'ACT 30', 0, 17.5, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_ACT_31', 'ACT', NULL, 'act_31', 31, 31, NULL, 'ACT 31', 0, 18.0, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_ACT_32', 'ACT', NULL, 'act_32', 32, 32, NULL, 'ACT 32', 0, 18.5, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_ACT_33', 'ACT', NULL, 'act_33', 33, 33, NULL, 'ACT 33', 0, 19.0, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_ACT_34', 'ACT', NULL, 'act_34', 34, 34, NULL, 'ACT 34', 0, 19.5, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_ACT_35', 'ACT', NULL, 'act_35', 35, 35, NULL, 'ACT 35', 0, 19.75, 'SAT/ACT international assessment conversion table, scale 20.'),
    ('FTU_2026_ACT_36', 'ACT', NULL, 'act_36', 36, 36, NULL, 'ACT 36', 0, 20.0, 'SAT/ACT international assessment conversion table, scale 20.'),

    ('FTU_2026_A_LEVEL_A_STAR', 'A_LEVEL', NULL, 'a_level_a_star', NULL, NULL, 'A*', 'A-Level A*', 0, 10.0, 'A-Level subject conversion table, scale 10.'),
    ('FTU_2026_A_LEVEL_A', 'A_LEVEL', NULL, 'a_level_a', NULL, NULL, 'A', 'A-Level A', 0, 9.0, 'A-Level subject conversion table, scale 10.'),
    ('FTU_2026_A_LEVEL_B', 'A_LEVEL', NULL, 'a_level_b', NULL, NULL, 'B', 'A-Level B', 0, 8.0, 'A-Level subject conversion table, scale 10.'),
    ('FTU_2026_A_LEVEL_C', 'A_LEVEL', NULL, 'a_level_c', NULL, NULL, 'C', 'A-Level C', 0, 7.5, 'A-Level subject conversion table, scale 10.'),
    ('FTU_2026_A_LEVEL_D', 'A_LEVEL', NULL, 'a_level_d', NULL, NULL, 'D', 'A-Level D', 0, 7.0, 'A-Level subject conversion table, scale 10.'),
    ('FTU_2026_A_LEVEL_E', 'A_LEVEL', NULL, 'a_level_e', NULL, NULL, 'E', 'A-Level E', 0, 6.5, 'A-Level subject conversion table, scale 10.')
)
INSERT INTO public.language_certificate_conversions (
  id,
  school_code,
  effective_year,
  certificate_type,
  skill_name,
  band_id,
  min_score,
  max_score,
  text_value,
  label,
  bonus_score_out_of_10,
  converted_subject_score_out_of_10,
  notes,
  source_label
)
SELECT
  seed_rows.id,
  'FTU',
  2026,
  seed_rows.certificate_type,
  seed_rows.skill_name,
  seed_rows.band_id,
  seed_rows.min_score,
  seed_rows.max_score,
  seed_rows.text_value,
  seed_rows.label,
  seed_rows.bonus_score_out_of_10,
  seed_rows.converted_subject_score_out_of_10,
  seed_rows.notes,
  source.source_label
FROM seed_rows
CROSS JOIN source
ON CONFLICT (id) DO UPDATE SET
  certificate_type = EXCLUDED.certificate_type,
  skill_name = EXCLUDED.skill_name,
  band_id = EXCLUDED.band_id,
  min_score = EXCLUDED.min_score,
  max_score = EXCLUDED.max_score,
  text_value = EXCLUDED.text_value,
  label = EXCLUDED.label,
  bonus_score_out_of_10 = EXCLUDED.bonus_score_out_of_10,
  converted_subject_score_out_of_10 = EXCLUDED.converted_subject_score_out_of_10,
  notes = EXCLUDED.notes,
  source_label = EXCLUDED.source_label,
  updated_at = now();
