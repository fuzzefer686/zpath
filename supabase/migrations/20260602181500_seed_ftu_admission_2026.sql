-- FTU (Đại học Ngoại thương) admission seed for 2026.
-- Source: Quyết định 1566/QĐ-ĐHNT (08/04/2026), Phụ lục 1.
-- Program/combination data mirrors src/lib/admission-data/ftu-programs-2026.ts.
-- NOTE: Official FTU 2026 benchmark (điểm chuẩn) is not published in the admission plan,
-- so benchmarks are intentionally left empty here and should be seeded once announced.

-- 1) Subject combinations used by FTU 2026 (idempotent).
INSERT INTO public.subject_combinations (code, subjects, description) VALUES
  ('A00', ARRAY['Toán', 'Vật lý', 'Hóa học']::text[], 'Tổ hợp xét tuyển FTU 2026.'),
  ('A01', ARRAY['Toán', 'Vật lý', 'Tiếng Anh']::text[], 'Tổ hợp xét tuyển FTU 2026.'),
  ('D01', ARRAY['Toán', 'Ngữ văn', 'Tiếng Anh']::text[], 'Tổ hợp xét tuyển FTU 2026.'),
  ('D02', ARRAY['Toán', 'Ngữ văn', 'Tiếng Nga']::text[], 'Tổ hợp xét tuyển FTU 2026.'),
  ('D03', ARRAY['Toán', 'Ngữ văn', 'Tiếng Pháp']::text[], 'Tổ hợp xét tuyển FTU 2026.'),
  ('D04', ARRAY['Toán', 'Ngữ văn', 'Tiếng Trung']::text[], 'Tổ hợp xét tuyển FTU 2026.'),
  ('D06', ARRAY['Toán', 'Ngữ văn', 'Tiếng Nhật']::text[], 'Tổ hợp xét tuyển FTU 2026.'),
  ('D07', ARRAY['Toán', 'Hóa học', 'Tiếng Anh']::text[], 'Tổ hợp xét tuyển FTU 2026.')
ON CONFLICT (code) DO NOTHING;

-- 2) Admission methods for FTU 2026.
INSERT INTO public.admission_methods (
  school_code, method_code, method_name, year, description, is_active, source_url
) VALUES
  ('FTU', 'XTT', 'Xét tuyển thẳng theo Quy chế của Bộ GD&ĐT', 2026, 'Xét tuyển thẳng theo đối tượng/giải thưởng; đối tượng mục d cần tổng 3 môn thi TN THPT theo tổ hợp >= 24.0.', true, 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'HOC_BA', 'Xét tuyển dựa trên kết quả học tập THPT (học bạ)', 2026, 'Dùng điểm trung bình chung cả năm lớp 10, 11, 12 theo tổ hợp; có thể kết hợp chứng chỉ ngoại ngữ quốc tế.', true, 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'THPT', 'Xét tuyển theo kết quả thi tốt nghiệp THPT 2026', 2026, 'Dùng điểm thi tốt nghiệp THPT 2026 theo tổ hợp; có thể kết hợp chứng chỉ ngoại ngữ quốc tế.', true, 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'DGNL', 'Xét tuyển bằng ĐGNL/ĐGTD trong nước và ĐGNL quốc tế', 2026, 'HSA/V-ACT/TSA trong nước và SAT/ACT/A-Level quốc tế kết hợp chứng chỉ ngoại ngữ quốc tế.', true, 'https://tuyensinh.ftu.edu.vn')
ON CONFLICT (school_code, method_code, year) DO UPDATE SET
  method_name = EXCLUDED.method_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  source_url = EXCLUDED.source_url;

-- 3) Admission programs (mã xét tuyển) for FTU 2026.
INSERT INTO public.admission_programs (
  school_code, program_code, program_name, major_code, major_name, year, quota, degree_level, training_type, note, source_url
) VALUES
  ('FTU', 'NTH.KT.H01', 'CT TT Kinh tế đối ngoại', null, 'Kinh tế đối ngoại', 2026, 80, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KT.H02', 'Kinh tế đối ngoại (CLC/TC)', null, 'Kinh tế đối ngoại', 2026, 640, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KT.H03', 'CT ĐHNNQT Logistics toàn cầu và đổi mới chuỗi cung ứng', null, 'Logistics và Quản lý chuỗi cung ứng', 2026, 50, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KT.H04', 'Kinh tế quốc tế (CLC/TC/ĐHNNQT KT số & PT dữ liệu)', null, 'Kinh tế quốc tế', 2026, 340, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KD.H05', 'CT TT i-Hons Kinh doanh quốc tế & Phân tích dữ liệu kinh doanh', null, 'Kinh doanh quốc tế', 2026, 70, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KD.H06', 'Kinh doanh quốc tế (CLC/TC)', null, 'Kinh doanh quốc tế', 2026, 190, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KD.H07', 'CT ĐHNNQT Kinh doanh số toàn cầu / KDQT theo mô hình tiên tiến Nhật Bản', null, 'Kinh doanh quốc tế', 2026, 130, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KD.H08', 'CT ĐHNNQT Kinh doanh sáng tạo & CN văn hóa / Quản lý công nghiệp thông minh', null, 'Kinh doanh quốc tế', 2026, 100, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.QT.H09', 'CT TT Quản trị kinh doanh', null, 'Quản trị kinh doanh', 2026, 80, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.QT.H10', 'Quản trị kinh doanh (CLC/TC/ĐHNNQT QT nguồn nhân lực số)', null, 'Quản trị kinh doanh', 2026, 230, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.TM.H11', 'CT ĐHNNQT Thương mại số thông minh và đổi mới kinh doanh', null, 'Thương mại điện tử', 2026, 100, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.QK.H12', 'CT ĐHNNQT Marketing số / Quản trị khách sạn / ĐHPTQT Kinh tế chính trị quốc tế', null, 'Marketing', 2026, 100, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.TC.H14', 'CT TT Tài chính - Ngân hàng', null, 'Tài chính - Ngân hàng', 2026, 40, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.TC.H15', 'Tài chính - Ngân hàng (CLC/TC/ĐHNNQT Công nghệ tài chính & Tài chính bền vững)', null, 'Tài chính - Ngân hàng', 2026, 300, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KE.H16', 'Kế toán - Kiểm toán (TC/ĐHNNQT ACCA/Kiểm toán tích hợp công nghệ)', null, 'Kế toán', 2026, 200, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.LS.H17', 'Luật (TMQT/ĐHNNQT Luật KDQT/Luật KT & KD số/TH Luật dân sự & tố tụng dân sự)', null, 'Luật', 2026, 220, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.CN.H18', 'CT TH Khoa học máy tính / Trí tuệ nhân tạo / Khoa học dữ liệu trong kinh tế và kinh doanh', null, 'Khoa học máy tính', 2026, 150, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 2 (Toán nhân đôi, thang 40).', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.NN.H19', 'CT TH Tiếng Anh thương mại', null, 'Ngôn ngữ Anh', 2026, 170, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 3 (Văn & Ngoại ngữ hệ số 1.5, thang 40).', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.NN.H20', 'CT TH Tiếng Trung thương mại', null, 'Ngôn ngữ Trung Quốc', 2026, 120, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 3 (Văn & Ngoại ngữ hệ số 1.5, thang 40).', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.NN.H21', 'CT TH Tiếng Nhật thương mại', null, 'Ngôn ngữ Nhật', 2026, 120, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 3 (Văn & Ngoại ngữ hệ số 1.5, thang 40).', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.NN.H22', 'CT TH Tiếng Pháp thương mại', null, 'Ngôn ngữ Pháp', 2026, 60, 'Đại học', 'Chính quy', 'Cơ sở Hà Nội - Nhóm công thức 3 (Văn & Ngoại ngữ hệ số 1.5, thang 40).', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KT.S23', 'Kinh tế đối ngoại (CLC/TC)', null, 'Kinh tế đối ngoại', 2026, 520, 'Đại học', 'Chính quy', 'Cơ sở TP. Hồ Chí Minh - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KT.S24', 'CT ĐHNNQT Logistics toàn cầu và đổi mới chuỗi cung ứng', null, 'Logistics và Quản lý chuỗi cung ứng', 2026, 50, 'Đại học', 'Chính quy', 'Cơ sở TP. Hồ Chí Minh - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.QT.S25', 'Quản trị kinh doanh (CLC/TC)', null, 'Quản trị kinh doanh', 2026, 140, 'Đại học', 'Chính quy', 'Cơ sở TP. Hồ Chí Minh - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.MT.S26', 'CT ĐHNNQT Truyền thông Marketing tích hợp', null, 'Marketing', 2026, 50, 'Đại học', 'Chính quy', 'Cơ sở TP. Hồ Chí Minh - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.TC.S27', 'Tài chính - Ngân hàng (CLC/TC)', null, 'Tài chính - Ngân hàng', 2026, 120, 'Đại học', 'Chính quy', 'Cơ sở TP. Hồ Chí Minh - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KE.S28', 'Kế toán - Kiểm toán (TC)', null, 'Kế toán', 2026, 70, 'Đại học', 'Chính quy', 'Cơ sở TP. Hồ Chí Minh - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn'),
  ('FTU', 'NTH.KK.Q29', 'Kế toán - Kiểm toán / Kinh doanh quốc tế (TC)', null, 'Kế toán', 2026, 100, 'Đại học', 'Chính quy', 'Cơ sở Quảng Ninh - Nhóm công thức 1.', 'https://tuyensinh.ftu.edu.vn')
ON CONFLICT (school_code, program_code, year) DO UPDATE SET
  program_name = EXCLUDED.program_name,
  major_name = EXCLUDED.major_name,
  quota = EXCLUDED.quota,
  degree_level = EXCLUDED.degree_level,
  training_type = EXCLUDED.training_type,
  note = EXCLUDED.note,
  source_url = EXCLUDED.source_url;

-- 4) Program <-> combination mapping for the combination-based methods (HOC_BA, THPT).
INSERT INTO public.program_combinations (
  program_id, combination_code, year, method_code, source_url
)
SELECT
  admission_programs.id,
  pairs.combination_code,
  2026,
  methods.method_code,
  'https://tuyensinh.ftu.edu.vn'
FROM public.admission_programs
JOIN (
  VALUES
    ('NTH.KT.H01', 'A01'), ('NTH.KT.H01', 'D01'), ('NTH.KT.H01', 'D07'),
    ('NTH.KT.H02', 'A00'), ('NTH.KT.H02', 'A01'), ('NTH.KT.H02', 'D01'), ('NTH.KT.H02', 'D02'), ('NTH.KT.H02', 'D03'), ('NTH.KT.H02', 'D04'), ('NTH.KT.H02', 'D06'), ('NTH.KT.H02', 'D07'),
    ('NTH.KT.H03', 'A00'), ('NTH.KT.H03', 'A01'), ('NTH.KT.H03', 'D01'), ('NTH.KT.H03', 'D07'),
    ('NTH.KT.H04', 'A00'), ('NTH.KT.H04', 'A01'), ('NTH.KT.H04', 'D01'), ('NTH.KT.H04', 'D03'), ('NTH.KT.H04', 'D07'),
    ('NTH.KD.H05', 'A01'), ('NTH.KD.H05', 'D01'), ('NTH.KD.H05', 'D07'),
    ('NTH.KD.H06', 'A00'), ('NTH.KD.H06', 'A01'), ('NTH.KD.H06', 'D01'), ('NTH.KD.H06', 'D07'),
    ('NTH.KD.H07', 'A00'), ('NTH.KD.H07', 'A01'), ('NTH.KD.H07', 'D01'), ('NTH.KD.H07', 'D06'), ('NTH.KD.H07', 'D07'),
    ('NTH.KD.H08', 'A00'), ('NTH.KD.H08', 'A01'), ('NTH.KD.H08', 'D01'), ('NTH.KD.H08', 'D07'),
    ('NTH.QT.H09', 'A01'), ('NTH.QT.H09', 'D01'), ('NTH.QT.H09', 'D07'),
    ('NTH.QT.H10', 'A00'), ('NTH.QT.H10', 'A01'), ('NTH.QT.H10', 'D01'), ('NTH.QT.H10', 'D07'),
    ('NTH.TM.H11', 'A00'), ('NTH.TM.H11', 'A01'), ('NTH.TM.H11', 'D01'), ('NTH.TM.H11', 'D07'),
    ('NTH.QK.H12', 'A00'), ('NTH.QK.H12', 'A01'), ('NTH.QK.H12', 'D01'), ('NTH.QK.H12', 'D07'),
    ('NTH.TC.H14', 'A01'), ('NTH.TC.H14', 'D01'), ('NTH.TC.H14', 'D07'),
    ('NTH.TC.H15', 'A00'), ('NTH.TC.H15', 'A01'), ('NTH.TC.H15', 'D01'), ('NTH.TC.H15', 'D07'),
    ('NTH.KE.H16', 'A00'), ('NTH.KE.H16', 'A01'), ('NTH.KE.H16', 'D01'), ('NTH.KE.H16', 'D07'),
    ('NTH.LS.H17', 'A00'), ('NTH.LS.H17', 'A01'), ('NTH.LS.H17', 'D01'), ('NTH.LS.H17', 'D07'),
    ('NTH.CN.H18', 'A00'), ('NTH.CN.H18', 'A01'), ('NTH.CN.H18', 'D01'), ('NTH.CN.H18', 'D07'),
    ('NTH.NN.H19', 'D01'),
    ('NTH.NN.H20', 'D01'), ('NTH.NN.H20', 'D04'),
    ('NTH.NN.H21', 'D01'), ('NTH.NN.H21', 'D06'),
    ('NTH.NN.H22', 'D01'), ('NTH.NN.H22', 'D03'),
    ('NTH.KT.S23', 'A00'), ('NTH.KT.S23', 'A01'), ('NTH.KT.S23', 'D01'), ('NTH.KT.S23', 'D06'), ('NTH.KT.S23', 'D07'),
    ('NTH.KT.S24', 'A00'), ('NTH.KT.S24', 'A01'), ('NTH.KT.S24', 'D01'), ('NTH.KT.S24', 'D07'),
    ('NTH.QT.S25', 'A00'), ('NTH.QT.S25', 'A01'), ('NTH.QT.S25', 'D01'), ('NTH.QT.S25', 'D07'),
    ('NTH.MT.S26', 'A00'), ('NTH.MT.S26', 'A01'), ('NTH.MT.S26', 'D01'), ('NTH.MT.S26', 'D07'),
    ('NTH.TC.S27', 'A00'), ('NTH.TC.S27', 'A01'), ('NTH.TC.S27', 'D01'), ('NTH.TC.S27', 'D07'),
    ('NTH.KE.S28', 'A00'), ('NTH.KE.S28', 'A01'), ('NTH.KE.S28', 'D01'), ('NTH.KE.S28', 'D07'),
    ('NTH.KK.Q29', 'A00'), ('NTH.KK.Q29', 'A01'), ('NTH.KK.Q29', 'D01'), ('NTH.KK.Q29', 'D07')
) AS pairs(program_code, combination_code)
  ON admission_programs.school_code = 'FTU'
  AND admission_programs.year = 2026
  AND admission_programs.program_code = pairs.program_code
CROSS JOIN (VALUES ('HOC_BA'), ('THPT')) AS methods(method_code)
ON CONFLICT (program_id, combination_code, year, method_code) DO UPDATE SET
  source_url = EXCLUDED.source_url;

-- 5) Benchmarks for FTU 2026 are not seeded: the official admission plan does not publish
--    điểm chuẩn 2026. Seed them in a follow-up migration once FTU announces the cut-off table.
