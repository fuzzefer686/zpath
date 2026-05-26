CREATE TABLE IF NOT EXISTS public.language_certificate_conversions (
  id text PRIMARY KEY,
  school_code text NOT NULL REFERENCES public.schools(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  effective_year int NOT NULL,
  certificate_type text NOT NULL,
  skill_name text,
  band_id text NOT NULL,
  min_score numeric,
  max_score numeric,
  text_value text,
  label text NOT NULL,
  bonus_score_out_of_10 numeric NOT NULL,
  converted_subject_score_out_of_10 numeric NOT NULL,
  notes text,
  source_label text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS language_certificate_conversions_stable_key
  ON public.language_certificate_conversions (
    school_code,
    effective_year,
    certificate_type,
    band_id,
    COALESCE(skill_name, '')
  );

CREATE INDEX IF NOT EXISTS idx_language_certificate_conversions_school_year
  ON public.language_certificate_conversions (school_code, effective_year);

CREATE INDEX IF NOT EXISTS idx_language_certificate_conversions_certificate_type
  ON public.language_certificate_conversions (certificate_type);

CREATE TRIGGER set_language_certificate_conversions_updated_at
  BEFORE UPDATE ON public.language_certificate_conversions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.language_certificate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Language certificate conversions are publicly readable"
  ON public.language_certificate_conversions
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.language_certificate_conversions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.language_certificate_conversions TO service_role;

WITH source AS (
  SELECT 'Bảng tham chiếu quy đổi tương đương các chứng chỉ ngoại ngữ áp dụng cho tuyển sinh đại học chính quy từ năm 2026'::text AS source_label
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
    ('HUST_2026_IELTS_ACADEMIC_band_1', 'IELTS_ACADEMIC', NULL, 'band_1', 5.0, 5.0, NULL, 'IELTS Academic 5.0', 1, 8.0, NULL),
    ('HUST_2026_VSTEP_band_1', 'VSTEP', NULL, 'band_1', 5.5, 5.5, NULL, 'VSTEP 5.5', 1, 8.0, NULL),
    ('HUST_2026_APTIS_ESOL_band_1', 'APTIS_ESOL', NULL, 'band_1', 80, 120, NULL, 'Aptis ESOL 80-120', 1, 8.0, NULL),
    ('HUST_2026_PEIC_band_1', 'PEIC', NULL, 'band_1', NULL, NULL, 'Level 2', 'Level 2', 1, 8.0, NULL),
    ('HUST_2026_PTE_ACADEMIC_band_1', 'PTE_ACADEMIC', NULL, 'band_1', 31, 38, NULL, 'PTE Academic 31-38', 1, 8.0, NULL),
    ('HUST_2026_LINGUASKILL_band_1', 'LINGUASKILL', NULL, 'band_1', 140, 159, NULL, 'Linguaskill 140-159', 1, 8.0, NULL),
    ('HUST_2026_CAMBRIDGE_ASSESSMENT_ENGLISH_band_1', 'CAMBRIDGE_ASSESSMENT_ENGLISH', NULL, 'band_1', NULL, NULL, 'B1 Preliminary / B1 Business Preliminary', 'B1 Preliminary / B1 Business Preliminary', 1, 8.0, NULL),
    ('HUST_2026_CAMBRIDGE_ENGLISH_TESTS_band_1', 'CAMBRIDGE_ENGLISH_TESTS', NULL, 'band_1', NULL, NULL, 'PET 140-159', 'PET 140-159', 1, 8.0, NULL),
    ('HUST_2026_TOEIC_band_1_listening', 'TOEIC', 'listening', 'band_1', 275, 395, NULL, 'TOEIC Listening 275-395', 1, 8.0, NULL),
    ('HUST_2026_TOEIC_band_1_speaking', 'TOEIC', 'speaking', 'band_1', 120, 150, NULL, 'TOEIC Speaking 120-150', 1, 8.0, NULL),
    ('HUST_2026_TOEIC_band_1_reading', 'TOEIC', 'reading', 'band_1', 275, 380, NULL, 'TOEIC Reading 275-380', 1, 8.0, NULL),
    ('HUST_2026_TOEIC_band_1_writing', 'TOEIC', 'writing', 'band_1', 120, 140, NULL, 'TOEIC Writing 120-140', 1, 8.0, NULL),
    ('HUST_2026_TOEFL_IBT_band_1', 'TOEFL_IBT', NULL, 'band_1', 30, 45, NULL, 'TOEFL iBT 30-45', 1, 8.0, NULL),
    ('HUST_2026_TOEFL_ITP_band_1', 'TOEFL_ITP', NULL, 'band_1', 450, 499, NULL, 'TOEFL ITP 450-499', 1, 8.0, NULL),
    ('HUST_2026_DELF_DALF_band_1', 'DELF_DALF', NULL, 'band_1', NULL, NULL, 'DELF A2 50-70', 'DELF A2 50-70', 1, 8.0, NULL),
    ('HUST_2026_TCF_band_1', 'TCF', NULL, 'band_1', 200, 249, NULL, 'TCF 200-249', 1, 8.0, NULL),
    ('HUST_2026_JLPT_band_1', 'JLPT', NULL, 'band_1', NULL, NULL, 'N4 145-180', 'N4 145-180', 1, 8.0, NULL),
    ('HUST_2026_HSK_band_1', 'HSK', NULL, 'band_1', NULL, NULL, 'HSK3 241-300', 'HSK3 241-300', 1, 8.0, NULL),
    ('HUST_2026_HSKK_band_1', 'HSKK', NULL, 'band_1', NULL, NULL, 'HSKK sơ cấp 60-100', 'HSKK sơ cấp 60-100', 1, 8.0, NULL),
    ('HUST_2026_TOPIK_band_1', 'TOPIK', NULL, 'band_1', NULL, NULL, 'TOPIK 3 135-149', 'TOPIK 3 135-149', 1, 8.0, NULL),

    ('HUST_2026_IELTS_ACADEMIC_band_2', 'IELTS_ACADEMIC', NULL, 'band_2', 5.5, 5.5, NULL, 'IELTS Academic 5.5', 2, 8.5, NULL),
    ('HUST_2026_VSTEP_band_2', 'VSTEP', NULL, 'band_2', 6.0, 6.5, NULL, 'VSTEP 6.0-6.5', 2, 8.5, NULL),
    ('HUST_2026_APTIS_ESOL_band_2', 'APTIS_ESOL', NULL, 'band_2', 121, 134, NULL, 'Aptis ESOL 121-134', 2, 8.5, NULL),
    ('HUST_2026_PEIC_band_2', 'PEIC', NULL, 'band_2', NULL, NULL, 'Level 3 Pass', 'Level 3 Pass', 2, 8.5, NULL),
    ('HUST_2026_PTE_ACADEMIC_band_2', 'PTE_ACADEMIC', NULL, 'band_2', 39, 46, NULL, 'PTE Academic 39-46', 2, 8.5, NULL),
    ('HUST_2026_LINGUASKILL_band_2', 'LINGUASKILL', NULL, 'band_2', 160, 166, NULL, 'Linguaskill 160-166', 2, 8.5, NULL),
    ('HUST_2026_CAMBRIDGE_ASSESSMENT_ENGLISH_band_2', 'CAMBRIDGE_ASSESSMENT_ENGLISH', NULL, 'band_2', NULL, NULL, 'B2 First / B2 Business Vantage 160-172 / Pass at Grade C', 'B2 First / B2 Business Vantage 160-172 / Pass at Grade C', 2, 8.5, NULL),
    ('HUST_2026_CAMBRIDGE_ENGLISH_TESTS_band_2', 'CAMBRIDGE_ENGLISH_TESTS', NULL, 'band_2', NULL, NULL, 'FCE 160-166', 'FCE 160-166', 2, 8.5, NULL),
    ('HUST_2026_TOEIC_band_2_listening', 'TOEIC', 'listening', 'band_2', 400, 428, NULL, 'TOEIC Listening 400-428', 2, 8.5, NULL),
    ('HUST_2026_TOEIC_band_2_speaking', 'TOEIC', 'speaking', 'band_2', 160, 163, NULL, 'TOEIC Speaking 160-163', 2, 8.5, NULL),
    ('HUST_2026_TOEIC_band_2_reading', 'TOEIC', 'reading', 'band_2', 385, 406, NULL, 'TOEIC Reading 385-406', 2, 8.5, NULL),
    ('HUST_2026_TOEIC_band_2_writing', 'TOEIC', 'writing', 'band_2', 150, 156, NULL, 'TOEIC Writing 150-156', 2, 8.5, NULL),
    ('HUST_2026_TOEFL_IBT_band_2', 'TOEFL_IBT', NULL, 'band_2', 46, 61, NULL, 'TOEFL iBT 46-61', 2, 8.5, NULL),
    ('HUST_2026_TOEFL_ITP_band_2', 'TOEFL_ITP', NULL, 'band_2', 500, 541, NULL, 'TOEFL ITP 500-541', 2, 8.5, NULL),
    ('HUST_2026_DELF_DALF_band_2', 'DELF_DALF', NULL, 'band_2', NULL, NULL, 'DELF A2 71-100', 'DELF A2 71-100', 2, 8.5, NULL),
    ('HUST_2026_TCF_band_2', 'TCF', NULL, 'band_2', 250, 299, NULL, 'TCF 250-299', 2, 8.5, NULL),
    ('HUST_2026_GOETHE_OSD_TELC_ECL_band_2', 'GOETHE_OSD_TELC_ECL', NULL, 'band_2', NULL, NULL, 'A2', 'A2', 2, 8.5, NULL),
    ('HUST_2026_JLPT_band_2', 'JLPT', NULL, 'band_2', NULL, NULL, 'N3 95-120', 'N3 95-120', 2, 8.5, NULL),
    ('HUST_2026_HSK_band_2', 'HSK', NULL, 'band_2', NULL, NULL, 'HSK4 180-210', 'HSK4 180-210', 2, 8.5, NULL),
    ('HUST_2026_HSKK_band_2', 'HSKK', NULL, 'band_2', NULL, NULL, 'HSKK trung cấp 60-100', 'HSKK trung cấp 60-100', 2, 8.5, NULL),
    ('HUST_2026_TOPIK_band_2', 'TOPIK', NULL, 'band_2', NULL, NULL, 'TOPIK 4 150-162', 'TOPIK 4 150-162', 2, 8.5, NULL),

    ('HUST_2026_IELTS_ACADEMIC_band_3', 'IELTS_ACADEMIC', NULL, 'band_3', 6.0, 6.0, NULL, 'IELTS Academic 6.0', 3, 9.0, NULL),
    ('HUST_2026_VSTEP_band_3', 'VSTEP', NULL, 'band_3', 7.0, 7.5, NULL, 'VSTEP 7.0-7.5', 3, 9.0, NULL),
    ('HUST_2026_APTIS_ESOL_band_3', 'APTIS_ESOL', NULL, 'band_3', 135, 148, NULL, 'Aptis ESOL 135-148', 3, 9.0, NULL),
    ('HUST_2026_PEIC_band_3', 'PEIC', NULL, 'band_3', NULL, NULL, 'Level 3 Pass with Merit', 'Level 3 Pass with Merit', 3, 9.0, NULL),
    ('HUST_2026_PTE_ACADEMIC_band_3', 'PTE_ACADEMIC', NULL, 'band_3', 47, 54, NULL, 'PTE Academic 47-54', 3, 9.0, NULL),
    ('HUST_2026_LINGUASKILL_band_3', 'LINGUASKILL', NULL, 'band_3', 167, 173, NULL, 'Linguaskill 167-173', 3, 9.0, NULL),
    ('HUST_2026_CAMBRIDGE_ASSESSMENT_ENGLISH_band_3', 'CAMBRIDGE_ASSESSMENT_ENGLISH', NULL, 'band_3', NULL, NULL, 'B2 First / B2 Business Vantage 173-179 / Pass at Grade B', 'B2 First / B2 Business Vantage 173-179 / Pass at Grade B', 3, 9.0, NULL),
    ('HUST_2026_CAMBRIDGE_ENGLISH_TESTS_band_3', 'CAMBRIDGE_ENGLISH_TESTS', NULL, 'band_3', NULL, NULL, 'FCE 167-173', 'FCE 167-173', 3, 9.0, NULL),
    ('HUST_2026_TOEIC_band_3_listening', 'TOEIC', 'listening', 'band_3', 429, 457, NULL, 'TOEIC Listening 429-457', 3, 9.0, NULL),
    ('HUST_2026_TOEIC_band_3_speaking', 'TOEIC', 'speaking', 'band_3', 164, 167, NULL, 'TOEIC Speaking 164-167', 3, 9.0, NULL),
    ('HUST_2026_TOEIC_band_3_reading', 'TOEIC', 'reading', 'band_3', 407, 428, NULL, 'TOEIC Reading 407-428', 3, 9.0, NULL),
    ('HUST_2026_TOEIC_band_3_writing', 'TOEIC', 'writing', 'band_3', 157, 163, NULL, 'TOEIC Writing 157-163', 3, 9.0, NULL),
    ('HUST_2026_TOEFL_IBT_band_3', 'TOEFL_IBT', NULL, 'band_3', 62, 77, NULL, 'TOEFL iBT 62-77', 3, 9.0, NULL),
    ('HUST_2026_TOEFL_ITP_band_3', 'TOEFL_ITP', NULL, 'band_3', 542, 583, NULL, 'TOEFL ITP 542-583', 3, 9.0, NULL),
    ('HUST_2026_DELF_DALF_band_3', 'DELF_DALF', NULL, 'band_3', NULL, NULL, 'DELF B1 50-70', 'DELF B1 50-70', 3, 9.0, NULL),
    ('HUST_2026_TCF_band_3', 'TCF', NULL, 'band_3', 300, 349, NULL, 'TCF 300-349', 3, 9.0, NULL),
    ('HUST_2026_GOETHE_OSD_TELC_ECL_band_3', 'GOETHE_OSD_TELC_ECL', NULL, 'band_3', NULL, NULL, 'B1', 'B1', 3, 9.0, NULL),
    ('HUST_2026_DSD_band_3', 'DSD', NULL, 'band_3', NULL, NULL, 'DSD1', 'DSD1', 3, 9.0, NULL),
    ('HUST_2026_JLPT_band_3', 'JLPT', NULL, 'band_3', NULL, NULL, 'N3 121-149', 'N3 121-149', 3, 9.0, NULL),
    ('HUST_2026_HSK_band_3', 'HSK', NULL, 'band_3', NULL, NULL, 'HSK4 211-240', 'HSK4 211-240', 3, 9.0, NULL),
    ('HUST_2026_HSKK_band_3', 'HSKK', NULL, 'band_3', NULL, NULL, 'HSKK trung cấp 60-100', 'HSKK trung cấp 60-100', 3, 9.0, NULL),
    ('HUST_2026_TOPIK_band_3', 'TOPIK', NULL, 'band_3', NULL, NULL, 'TOPIK 4 163-175', 'TOPIK 4 163-175', 3, 9.0, NULL),

    ('HUST_2026_IELTS_ACADEMIC_band_4', 'IELTS_ACADEMIC', NULL, 'band_4', 6.5, 6.5, NULL, 'IELTS Academic 6.5', 4, 9.5, NULL),
    ('HUST_2026_VSTEP_band_4', 'VSTEP', NULL, 'band_4', 8.0, 8.0, NULL, 'VSTEP 8.0', 4, 9.5, NULL),
    ('HUST_2026_APTIS_ESOL_band_4', 'APTIS_ESOL', NULL, 'band_4', 149, 160, NULL, 'Aptis ESOL 149-160', 4, 9.5, NULL),
    ('HUST_2026_PEIC_band_4', 'PEIC', NULL, 'band_4', NULL, NULL, 'Level 3 Pass with Distinction', 'Level 3 Pass with Distinction', 4, 9.5, NULL),
    ('HUST_2026_PTE_ACADEMIC_band_4', 'PTE_ACADEMIC', NULL, 'band_4', 55, 62, NULL, 'PTE Academic 55-62', 4, 9.5, NULL),
    ('HUST_2026_LINGUASKILL_band_4', 'LINGUASKILL', NULL, 'band_4', 174, 179, NULL, 'Linguaskill 174-179', 4, 9.5, NULL),
    ('HUST_2026_CAMBRIDGE_ASSESSMENT_ENGLISH_band_4', 'CAMBRIDGE_ASSESSMENT_ENGLISH', NULL, 'band_4', NULL, NULL, 'B2 First / B2 Business Vantage 180-190 / Pass at Grade A', 'B2 First / B2 Business Vantage 180-190 / Pass at Grade A', 4, 9.5, NULL),
    ('HUST_2026_CAMBRIDGE_ENGLISH_TESTS_band_4', 'CAMBRIDGE_ENGLISH_TESTS', NULL, 'band_4', NULL, NULL, 'FCE 174-179', 'FCE 174-179', 4, 9.5, NULL),
    ('HUST_2026_TOEIC_band_4_listening', 'TOEIC', 'listening', 'band_4', 458, 485, NULL, 'TOEIC Listening 458-485', 4, 9.5, NULL),
    ('HUST_2026_TOEIC_band_4_speaking', 'TOEIC', 'speaking', 'band_4', 168, 170, NULL, 'TOEIC Speaking 168-170', 4, 9.5, NULL),
    ('HUST_2026_TOEIC_band_4_reading', 'TOEIC', 'reading', 'band_4', 429, 450, NULL, 'TOEIC Reading 429-450', 4, 9.5, NULL),
    ('HUST_2026_TOEIC_band_4_writing', 'TOEIC', 'writing', 'band_4', 164, 170, NULL, 'TOEIC Writing 164-170', 4, 9.5, NULL),
    ('HUST_2026_TOEFL_IBT_band_4', 'TOEFL_IBT', NULL, 'band_4', 78, 93, NULL, 'TOEFL iBT 78-93', 4, 9.5, NULL),
    ('HUST_2026_TOEFL_ITP_band_4', 'TOEFL_ITP', NULL, 'band_4', 584, 626, NULL, 'TOEFL ITP 584-626', 4, 9.5, NULL),
    ('HUST_2026_DELF_DALF_band_4', 'DELF_DALF', NULL, 'band_4', NULL, NULL, 'DELF B1 71-100 / DELF B2 50-100', 'DELF B1 71-100 / DELF B2 50-100', 4, 9.5, NULL),
    ('HUST_2026_TCF_band_4', 'TCF', NULL, 'band_4', 350, 399, NULL, 'TCF 350-399', 4, 9.5, NULL),
    ('HUST_2026_TESTDAF_band_4', 'TESTDAF', NULL, 'band_4', NULL, NULL, 'TDN3', 'TDN3', 4, 9.5, NULL),
    ('HUST_2026_GOETHE_OSD_TELC_ECL_band_4', 'GOETHE_OSD_TELC_ECL', NULL, 'band_4', NULL, NULL, 'B2', 'B2', 4, 9.5, NULL),
    ('HUST_2026_DSH_band_4', 'DSH', NULL, 'band_4', NULL, NULL, 'DSH1', 'DSH1', 4, 9.5, NULL),
    ('HUST_2026_JLPT_band_4', 'JLPT', NULL, 'band_4', NULL, NULL, 'N3 150-180 / N2 90-180', 'N3 150-180 / N2 90-180', 4, 9.5, NULL),
    ('HUST_2026_HSK_band_4', 'HSK', NULL, 'band_4', NULL, NULL, 'HSK4 241-300 / HSK5 180-300', 'HSK4 241-300 / HSK5 180-300', 4, 9.5, NULL),
    ('HUST_2026_HSKK_band_4', 'HSKK', NULL, 'band_4', NULL, NULL, 'HSKK trung cấp 60-100 / HSKK cao cấp 60-100', 'HSKK trung cấp 60-100 / HSKK cao cấp 60-100', 4, 9.5, NULL),
    ('HUST_2026_TOPIK_band_4', 'TOPIK', NULL, 'band_4', NULL, NULL, 'TOPIK 4 176-189 / TOPIK 5 190-229', 'TOPIK 4 176-189 / TOPIK 5 190-229', 4, 9.5, NULL),

    ('HUST_2026_IELTS_ACADEMIC_band_5', 'IELTS_ACADEMIC', NULL, 'band_5', 7.0, 9.0, NULL, 'IELTS Academic 7.0-9.0', 5, 10.0, NULL),
    ('HUST_2026_VSTEP_band_5', 'VSTEP', NULL, 'band_5', 8.5, 10.0, NULL, 'VSTEP 8.5-10', 5, 10.0, NULL),
    ('HUST_2026_APTIS_ESOL_band_5', 'APTIS_ESOL', NULL, 'band_5', 161, 180, NULL, 'Aptis ESOL 161-180', 5, 10.0, NULL),
    ('HUST_2026_PEIC_band_5', 'PEIC', NULL, 'band_5', NULL, NULL, 'Level 4 - Level 5 Pass', 'Level 4 - Level 5 Pass', 5, 10.0, NULL),
    ('HUST_2026_PTE_ACADEMIC_band_5', 'PTE_ACADEMIC', NULL, 'band_5', 63, 90, NULL, 'PTE Academic 63-90', 5, 10.0, NULL),
    ('HUST_2026_LINGUASKILL_band_5', 'LINGUASKILL', NULL, 'band_5', 180, 210, NULL, 'Linguaskill 180-210', 5, 10.0, NULL),
    ('HUST_2026_CAMBRIDGE_ASSESSMENT_ENGLISH_band_5', 'CAMBRIDGE_ASSESSMENT_ENGLISH', NULL, 'band_5', NULL, NULL, 'C1 Advanced / C1 Business Higher 180-210 / C2 Proficiency 200-230', 'C1 Advanced / C1 Business Higher 180-210 / C2 Proficiency 200-230', 5, 10.0, NULL),
    ('HUST_2026_CAMBRIDGE_ENGLISH_TESTS_band_5', 'CAMBRIDGE_ENGLISH_TESTS', NULL, 'band_5', NULL, NULL, 'CAE 180-199 / CPE 200-230', 'CAE 180-199 / CPE 200-230', 5, 10.0, NULL),
    ('HUST_2026_TOEIC_band_5_listening', 'TOEIC', 'listening', 'band_5', 490, 495, NULL, 'TOEIC Listening 490-495', 5, 10.0, NULL),
    ('HUST_2026_TOEIC_band_5_speaking', 'TOEIC', 'speaking', 'band_5', 180, 200, NULL, 'TOEIC Speaking 180-200', 5, 10.0, NULL),
    ('HUST_2026_TOEIC_band_5_reading', 'TOEIC', 'reading', 'band_5', 455, 495, NULL, 'TOEIC Reading 455-495', 5, 10.0, NULL),
    ('HUST_2026_TOEIC_band_5_writing', 'TOEIC', 'writing', 'band_5', 180, 200, NULL, 'TOEIC Writing 180-200', 5, 10.0, NULL),
    ('HUST_2026_TOEFL_IBT_band_5', 'TOEFL_IBT', NULL, 'band_5', 94, 120, NULL, 'TOEFL iBT 94-120', 5, 10.0, NULL),
    ('HUST_2026_TOEFL_ITP_band_5', 'TOEFL_ITP', NULL, 'band_5', 627, 677, NULL, 'TOEFL ITP 627-677', 5, 10.0, NULL),
    ('HUST_2026_DELF_DALF_band_5', 'DELF_DALF', NULL, 'band_5', NULL, NULL, 'DALF C1 50-100 / DALF C2 50-100', 'DALF C1 50-100 / DALF C2 50-100', 5, 10.0, NULL),
    ('HUST_2026_TCF_band_5', 'TCF', NULL, 'band_5', 400, 699, NULL, 'TCF 400-699', 5, 10.0, NULL),
    ('HUST_2026_TESTDAF_band_5', 'TESTDAF', NULL, 'band_5', NULL, NULL, 'TDN4 / TDN5', 'TDN4 / TDN5', 5, 10.0, NULL),
    ('HUST_2026_GOETHE_OSD_TELC_ECL_band_5', 'GOETHE_OSD_TELC_ECL', NULL, 'band_5', NULL, NULL, 'C1/C2', 'C1/C2', 5, 10.0, NULL),
    ('HUST_2026_DSH_band_5', 'DSH', NULL, 'band_5', NULL, NULL, 'DSH2 / DSH3', 'DSH2 / DSH3', 5, 10.0, NULL),
    ('HUST_2026_DSD_band_5', 'DSD', NULL, 'band_5', NULL, NULL, 'DSD2', 'DSD2', 5, 10.0, NULL),
    ('HUST_2026_JLPT_band_5', 'JLPT', NULL, 'band_5', NULL, NULL, 'N1 100-180', 'N1 100-180', 5, 10.0, NULL),
    ('HUST_2026_HSK_band_5', 'HSK', NULL, 'band_5', NULL, NULL, 'HSK6 180-300', 'HSK6 180-300', 5, 10.0, NULL),
    ('HUST_2026_HSKK_band_5', 'HSKK', NULL, 'band_5', NULL, NULL, 'HSKK cao cấp 60-100', 'HSKK cao cấp 60-100', 5, 10.0, NULL),
    ('HUST_2026_TOPIK_band_5', 'TOPIK', NULL, 'band_5', NULL, NULL, 'TOPIK 6 230-300', 'TOPIK 6 230-300', 5, 10.0, NULL)
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
  'HUST',
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
