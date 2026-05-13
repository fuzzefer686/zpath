CREATE TABLE IF NOT EXISTS public.advisor_major_weights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  major_id text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  interest_tags text[] NOT NULL DEFAULT '{}',
  career_goal_tags text[] NOT NULL DEFAULT '{}',
  personality_tags text[] NOT NULL DEFAULT '{}',
  skills_to_improve text[] NOT NULL DEFAULT '{}',
  career_paths text[] NOT NULL DEFAULT '{}',
  math_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (math_weight >= 0 AND math_weight <= 1),
  literature_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (literature_weight >= 0 AND literature_weight <= 1),
  english_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (english_weight >= 0 AND english_weight <= 1),
  physics_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (physics_weight >= 0 AND physics_weight <= 1),
  chemistry_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (chemistry_weight >= 0 AND chemistry_weight <= 1),
  biology_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (biology_weight >= 0 AND biology_weight <= 1),
  history_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (history_weight >= 0 AND history_weight <= 1),
  geography_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (geography_weight >= 0 AND geography_weight <= 1),
  civic_education_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (civic_education_weight >= 0 AND civic_education_weight <= 1),
  informatics_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (informatics_weight >= 0 AND informatics_weight <= 1),
  technology_weight numeric(4,3) NOT NULL DEFAULT 0 CHECK (technology_weight >= 0 AND technology_weight <= 1),
  academic_fit_weight numeric(4,3) NOT NULL DEFAULT 0.4 CHECK (academic_fit_weight >= 0 AND academic_fit_weight <= 1),
  interest_fit_weight numeric(4,3) NOT NULL DEFAULT 0.3 CHECK (interest_fit_weight >= 0 AND interest_fit_weight <= 1),
  career_goal_fit_weight numeric(4,3) NOT NULL DEFAULT 0.2 CHECK (career_goal_fit_weight >= 0 AND career_goal_fit_weight <= 1),
  personality_fit_weight numeric(4,3) NOT NULL DEFAULT 0.1 CHECK (personality_fit_weight >= 0 AND personality_fit_weight <= 1),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.advisor_weight_contributions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  major_id text NOT NULL REFERENCES public.advisor_major_weights(major_id) ON DELETE CASCADE,
  contributor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contributor_name text,
  contributor_email text,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  math_weight numeric(4,3) NOT NULL CHECK (math_weight >= 0 AND math_weight <= 1),
  literature_weight numeric(4,3) NOT NULL CHECK (literature_weight >= 0 AND literature_weight <= 1),
  english_weight numeric(4,3) NOT NULL CHECK (english_weight >= 0 AND english_weight <= 1),
  physics_weight numeric(4,3) NOT NULL CHECK (physics_weight >= 0 AND physics_weight <= 1),
  chemistry_weight numeric(4,3) NOT NULL CHECK (chemistry_weight >= 0 AND chemistry_weight <= 1),
  biology_weight numeric(4,3) NOT NULL CHECK (biology_weight >= 0 AND biology_weight <= 1),
  history_weight numeric(4,3) NOT NULL CHECK (history_weight >= 0 AND history_weight <= 1),
  geography_weight numeric(4,3) NOT NULL CHECK (geography_weight >= 0 AND geography_weight <= 1),
  civic_education_weight numeric(4,3) NOT NULL CHECK (civic_education_weight >= 0 AND civic_education_weight <= 1),
  informatics_weight numeric(4,3) NOT NULL CHECK (informatics_weight >= 0 AND informatics_weight <= 1),
  technology_weight numeric(4,3) NOT NULL CHECK (technology_weight >= 0 AND technology_weight <= 1),
  academic_fit_weight numeric(4,3) NOT NULL CHECK (academic_fit_weight >= 0 AND academic_fit_weight <= 1),
  interest_fit_weight numeric(4,3) NOT NULL CHECK (interest_fit_weight >= 0 AND interest_fit_weight <= 1),
  career_goal_fit_weight numeric(4,3) NOT NULL CHECK (career_goal_fit_weight >= 0 AND career_goal_fit_weight <= 1),
  personality_fit_weight numeric(4,3) NOT NULL CHECK (personality_fit_weight >= 0 AND personality_fit_weight <= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS advisor_major_weights_active_idx
  ON public.advisor_major_weights (is_active, name);

CREATE INDEX IF NOT EXISTS advisor_weight_contributions_major_status_idx
  ON public.advisor_weight_contributions (major_id, status, created_at DESC);

ALTER TABLE public.advisor_major_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_weight_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advisor weights are publicly readable" ON public.advisor_major_weights;
CREATE POLICY "Advisor weights are publicly readable"
  ON public.advisor_major_weights
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Anonymous users can submit advisor contributions" ON public.advisor_weight_contributions;
CREATE POLICY "Anonymous users can submit advisor contributions"
  ON public.advisor_weight_contributions
  FOR INSERT
  TO anon
  WITH CHECK (contributor_user_id IS NULL);

DROP POLICY IF EXISTS "Authenticated users can submit advisor contributions" ON public.advisor_weight_contributions;
CREATE POLICY "Authenticated users can submit advisor contributions"
  ON public.advisor_weight_contributions
  FOR INSERT
  TO authenticated
  WITH CHECK (contributor_user_id IS NULL OR (select auth.uid()) = contributor_user_id);

GRANT SELECT ON public.advisor_major_weights TO anon, authenticated;
GRANT INSERT ON public.advisor_weight_contributions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_major_weights TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.advisor_weight_contributions TO service_role;

INSERT INTO public.advisor_major_weights (
  major_id, name, category, description, interest_tags, career_goal_tags, personality_tags, skills_to_improve, career_paths,
  math_weight, literature_weight, english_weight, physics_weight, chemistry_weight, biology_weight, history_weight, geography_weight, civic_education_weight, informatics_weight, technology_weight,
  academic_fit_weight, interest_fit_weight, career_goal_fit_weight, personality_fit_weight
) VALUES
  ('computer_science', 'Công nghệ thông tin', 'Công nghệ', 'Ngành học về lập trình, hệ thống phần mềm, dữ liệu, mạng máy tính và giải quyết vấn đề bằng công nghệ.', ARRAY['công nghệ', 'phân tích dữ liệu']::text[], ARRAY['thu nhập cao', 'làm việc với dữ liệu', 'có thể làm freelancer/remote']::text[], ARRAY['INTJ', 'INTP', 'ENTJ', 'ISTJ']::text[], ARRAY['Lập trình', 'Toán tư duy', 'Tiếng Anh chuyên ngành', 'Git']::text[], ARRAY['Software Engineer', 'Data Analyst', 'AI Engineer', 'System Administrator']::text[], 0.9, 0.1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('data_science', 'Khoa học dữ liệu', 'Công nghệ', 'Tập trung vào thống kê, lập trình và mô hình hóa dữ liệu để tạo insight, dự báo và hỗ trợ ra quyết định.', ARRAY['công nghệ', 'phân tích dữ liệu', 'tài chính']::text[], ARRAY['thu nhập cao', 'làm việc với dữ liệu', 'có cơ hội thăng tiến']::text[], ARRAY['INTJ', 'INTP', 'ISTJ', 'ENTJ']::text[], ARRAY['Python', 'SQL', 'Thống kê', 'Machine Learning']::text[], ARRAY['Data Scientist', 'ML Engineer', 'Business Analyst', 'Quantitative Analyst']::text[], 0.95, 0.05, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('ai', 'Trí tuệ nhân tạo', 'Công nghệ', 'Nghiên cứu và phát triển hệ thống thông minh: máy học, xử lý ngôn ngữ tự nhiên, thị giác máy tính.', ARRAY['công nghệ', 'phân tích dữ liệu', 'sáng tạo']::text[], ARRAY['thu nhập cao', 'làm việc với dữ liệu', 'môi trường quốc tế']::text[], ARRAY['INTJ', 'INTP', 'ENTJ']::text[], ARRAY['Toán cao cấp', 'Deep Learning', 'Nghiên cứu khoa học', 'Python']::text[], ARRAY['AI Research Engineer', 'NLP Engineer', 'Computer Vision Engineer', 'Robotics Engineer']::text[], 0.95, 0.05, 0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('cyber_security', 'An toàn thông tin', 'Công nghệ', 'Bảo vệ hệ thống, dữ liệu và mạng khỏi các mối đe dọa an ninh mạng.', ARRAY['công nghệ', 'phân tích dữ liệu']::text[], ARRAY['thu nhập cao', 'công việc ổn định', 'có cơ hội thăng tiến']::text[], ARRAY['ISTJ', 'INTJ', 'ISTP', 'INTP']::text[], ARRAY['Mạng máy tính', 'Linux', 'Mã hóa', 'Pentesting']::text[], ARRAY['Security Analyst', 'Penetration Tester', 'SOC Engineer', 'Security Architect']::text[], 0.8, 0.1, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('marketing', 'Marketing', 'Kinh doanh', 'Nghiên cứu thị trường, xây dựng thương hiệu, truyền thông và phát triển khách hàng.', ARRAY['kinh doanh', 'giao tiếp', 'sáng tạo', 'phân tích dữ liệu']::text[], ARRAY['thu nhập cao', 'môi trường quốc tế', 'công việc sáng tạo', 'có cơ hội thăng tiến']::text[], ARRAY['ENFP', 'ENTJ', 'ESFJ', 'ESTP']::text[], ARRAY['Content Marketing', 'Phân tích dữ liệu', 'Thuyết trình', 'Excel']::text[], ARRAY['Marketing Executive', 'Brand Manager', 'Digital Marketer', 'Market Researcher']::text[], 0.5, 0.5, 0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('business_admin', 'Quản trị kinh doanh', 'Kinh doanh', 'Quản lý vận hành, chiến lược, nhân sự và phát triển doanh nghiệp.', ARRAY['kinh doanh', 'giao tiếp', 'tài chính']::text[], ARRAY['thu nhập cao', 'có cơ hội thăng tiến', 'công việc ổn định']::text[], ARRAY['ENTJ', 'ESTJ', 'ENFJ', 'ESTP']::text[], ARRAY['Quản lý dự án', 'Tài chính cơ bản', 'Đàm phán', 'Leadership']::text[], ARRAY['Business Analyst', 'Operations Manager', 'Startup Founder', 'Management Trainee']::text[], 0.6, 0.4, 0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('international_business', 'Kinh doanh quốc tế', 'Kinh doanh', 'Thương mại quốc tế, logistics, đàm phán và vận hành kinh doanh xuyên biên giới.', ARRAY['kinh doanh', 'giao tiếp', 'du lịch']::text[], ARRAY['môi trường quốc tế', 'thu nhập cao', 'có cơ hội thăng tiến']::text[], ARRAY['ENTJ', 'ENFJ', 'ESTP', 'ENTP']::text[], ARRAY['Ngoại ngữ thứ 2', 'Đàm phán quốc tế', 'Logistics', 'Văn hóa kinh doanh']::text[], ARRAY['International Sales', 'Import-Export Manager', 'Trade Analyst', 'Supply Chain Manager']::text[], 0.5, 0.3, 0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('finance_banking', 'Tài chính - Ngân hàng', 'Kinh doanh', 'Dòng tiền, đầu tư, thị trường tài chính và quản trị rủi ro.', ARRAY['tài chính', 'phân tích dữ liệu', 'kinh doanh']::text[], ARRAY['thu nhập cao', 'công việc ổn định', 'có cơ hội thăng tiến']::text[], ARRAY['ISTJ', 'INTJ', 'ESTJ', 'ENTJ']::text[], ARRAY['Excel nâng cao', 'Phân tích tài chính', 'Quản trị rủi ro', 'CFA prep']::text[], ARRAY['Financial Analyst', 'Investment Banker', 'Risk Manager', 'Auditor']::text[], 0.85, 0.15, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('accounting', 'Kế toán', 'Kinh doanh', 'Ghi chép, phân tích và báo cáo tình hình tài chính của tổ chức.', ARRAY['tài chính', 'phân tích dữ liệu']::text[], ARRAY['công việc ổn định', 'có cơ hội thăng tiến']::text[], ARRAY['ISTJ', 'ISFJ', 'ESTJ', 'INTJ']::text[], ARRAY['Excel', 'Phần mềm kế toán', 'Luật thuế', 'Kiểm toán']::text[], ARRAY['Accountant', 'Internal Auditor', 'Tax Consultant', 'CFO']::text[], 0.8, 0.2, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('logistics', 'Logistics', 'Kinh doanh', 'Quản lý chuỗi cung ứng, vận tải, kho bãi và phân phối hàng hóa.', ARRAY['kinh doanh', 'công nghệ', 'phân tích dữ liệu']::text[], ARRAY['công việc ổn định', 'môi trường quốc tế', 'có cơ hội thăng tiến']::text[], ARRAY['ISTJ', 'ESTJ', 'ENTJ', 'ISTP']::text[], ARRAY['Supply Chain Management', 'ERP Systems', 'Data Analysis', 'Negotiation']::text[], ARRAY['Supply Chain Analyst', 'Logistics Coordinator', 'Warehouse Manager', 'Procurement Specialist']::text[], 0.6, 0.2, 0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('english_language', 'Ngôn ngữ Anh', 'Ngôn ngữ', 'Nghiên cứu ngôn ngữ, văn hóa, dịch thuật và giao tiếp quốc tế bằng tiếng Anh.', ARRAY['ngôn ngữ', 'giao tiếp', 'du lịch', 'giáo dục']::text[], ARRAY['môi trường quốc tế', 'có thể làm freelancer/remote', 'công việc sáng tạo']::text[], ARRAY['ENFP', 'ENFJ', 'INFJ', 'ESFJ']::text[], ARRAY['Academic Writing', 'IELTS/TOEFL', 'Dịch thuật', 'Public Speaking']::text[], ARRAY['Interpreter', 'Translator', 'English Teacher', 'Content Writer']::text[], 0.1, 0.6, 0.95, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('chinese_language', 'Ngôn ngữ Trung', 'Ngôn ngữ', 'Ngôn ngữ, văn hóa và giao thương với thị trường Trung Quốc.', ARRAY['ngôn ngữ', 'giao tiếp', 'du lịch', 'kinh doanh']::text[], ARRAY['môi trường quốc tế', 'công việc ổn định']::text[], ARRAY['ENFJ', 'ESFJ', 'INFJ', 'ENFP']::text[], ARRAY['HSK', 'Dịch thuật Trung-Việt', 'Văn hóa Trung Quốc', 'Thương mại']::text[], ARRAY['Biên phiên dịch', 'Nhân viên xuất nhập khẩu', 'Giáo viên tiếng Trung', 'Tour Guide']::text[], 0.1, 0.6, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('multimedia', 'Truyền thông đa phương tiện', 'Truyền thông', 'Sản xuất nội dung số, video, podcast, social media và truyền thông thương hiệu.', ARRAY['sáng tạo', 'công nghệ', 'giao tiếp', 'thiết kế']::text[], ARRAY['công việc sáng tạo', 'có thể làm freelancer/remote', 'thu nhập cao']::text[], ARRAY['ENFP', 'ENTP', 'ISFP', 'INFP']::text[], ARRAY['Video Editing', 'Copywriting', 'Social Media', 'Adobe Creative Suite']::text[], ARRAY['Content Creator', 'Video Producer', 'Social Media Manager', 'Brand Storyteller']::text[], 0.2, 0.7, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('public_relations', 'Quan hệ công chúng', 'Truyền thông', 'Xây dựng hình ảnh tổ chức, quản lý khủng hoảng truyền thông và quan hệ báo chí.', ARRAY['giao tiếp', 'sáng tạo', 'kinh doanh']::text[], ARRAY['công việc sáng tạo', 'làm việc với con người', 'có cơ hội thăng tiến']::text[], ARRAY['ENFJ', 'ENFP', 'ESFJ', 'ENTJ']::text[], ARRAY['Viết thông cáo', 'Quan hệ báo chí', 'Event Management', 'Crisis Communication']::text[], ARRAY['PR Executive', 'Communications Manager', 'Event Planner', 'Corporate Affairs']::text[], 0.2, 0.8, 0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('law', 'Luật', 'Pháp lý', 'Pháp luật doanh nghiệp, hợp đồng, sở hữu trí tuệ và giải quyết tranh chấp.', ARRAY['luật', 'giao tiếp', 'phân tích dữ liệu']::text[], ARRAY['công việc ổn định', 'thu nhập cao', 'có cơ hội thăng tiến']::text[], ARRAY['INTJ', 'ENTJ', 'ISTJ', 'ESTJ']::text[], ARRAY['Tư duy phản biện', 'Viết pháp lý', 'Nghiên cứu case study', 'Đàm phán']::text[], ARRAY['Luật sư', 'Pháp chế doanh nghiệp', 'Công chứng viên', 'Thẩm phán']::text[], 0.3, 0.9, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('psychology', 'Tâm lý học', 'Xã hội', 'Nghiên cứu hành vi, cảm xúc và tư duy con người, ứng dụng trong tư vấn và tổ chức.', ARRAY['giáo dục', 'giao tiếp', 'y tế']::text[], ARRAY['làm việc với con người', 'công việc ổn định', 'công việc sáng tạo']::text[], ARRAY['INFJ', 'ENFJ', 'INFP', 'ISFJ']::text[], ARRAY['Lắng nghe chủ động', 'Tâm lý lâm sàng', 'Nghiên cứu hành vi', 'Empathy']::text[], ARRAY['Nhà tâm lý', 'HR Specialist', 'School Counselor', 'UX Researcher']::text[], 0.3, 0.7, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('tourism', 'Du lịch và lữ hành', 'Dịch vụ', 'Tổ chức tour, quản lý điểm đến, marketing du lịch và trải nghiệm khách hàng.', ARRAY['du lịch', 'giao tiếp', 'sáng tạo', 'ngôn ngữ']::text[], ARRAY['môi trường quốc tế', 'làm việc với con người', 'công việc sáng tạo']::text[], ARRAY['ESFP', 'ENFP', 'ESFJ', 'ESTP']::text[], ARRAY['Ngoại ngữ', 'Tour planning', 'Hospitality', 'Kỹ năng giao tiếp']::text[], ARRAY['Tour Operator', 'Travel Consultant', 'Destination Manager', 'Airline Staff']::text[], 0.2, 0.5, 0.8, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('hospitality', 'Quản trị khách sạn', 'Dịch vụ', 'Vận hành khách sạn, resort, nhà hàng và dịch vụ lưu trú cao cấp.', ARRAY['du lịch', 'giao tiếp', 'kinh doanh']::text[], ARRAY['môi trường quốc tế', 'làm việc với con người', 'có cơ hội thăng tiến']::text[], ARRAY['ESFJ', 'ENFJ', 'ESTJ', 'ESFP']::text[], ARRAY['Hotel Operations', 'F&B Management', 'Ngoại ngữ', 'Customer Service']::text[], ARRAY['Hotel Manager', 'F&B Director', 'Guest Relations', 'Revenue Manager']::text[], 0.3, 0.4, 0.85, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('medicine', 'Y khoa', 'Sức khỏe', 'Đào tạo bác sĩ đa khoa với cường độ học cao, yêu cầu kỷ luật và tinh thần phục vụ.', ARRAY['y tế', 'phân tích dữ liệu']::text[], ARRAY['công việc ổn định', 'làm việc với con người', 'thu nhập cao']::text[], ARRAY['ISTJ', 'ISFJ', 'INTJ', 'INFJ']::text[], ARRAY['Sinh học nâng cao', 'Hóa hữu cơ', 'Kỹ năng lâm sàng', 'Tiếng Anh y khoa']::text[], ARRAY['Bác sĩ đa khoa', 'Bác sĩ chuyên khoa', 'Nghiên cứu y sinh', 'Giảng viên y khoa']::text[], 0.5, 0.3, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('pharmacy', 'Dược học', 'Sức khỏe', 'Nghiên cứu, sản xuất và phân phối thuốc, tư vấn sử dụng dược phẩm.', ARRAY['y tế', 'phân tích dữ liệu', 'kinh doanh']::text[], ARRAY['thu nhập cao', 'công việc ổn định']::text[], ARRAY['ISTJ', 'ISFJ', 'INTJ', 'ESTJ']::text[], ARRAY['Hóa dược', 'Dược lý', 'GMP', 'Nghiên cứu lâm sàng']::text[], ARRAY['Dược sĩ', 'QC/QA Dược phẩm', 'Medical Representative', 'R&D Researcher']::text[], 0.5, 0.2, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('nursing', 'Điều dưỡng', 'Sức khỏe', 'Chăm sóc sức khỏe, hỗ trợ điều trị và giáo dục sức khỏe cộng đồng.', ARRAY['y tế', 'giao tiếp']::text[], ARRAY['công việc ổn định', 'làm việc với con người', 'môi trường quốc tế']::text[], ARRAY['ISFJ', 'ESFJ', 'INFJ', 'ENFJ']::text[], ARRAY['Kỹ năng lâm sàng', 'Giao tiếp bệnh nhân', 'Tiếng Anh y khoa', 'Sơ cứu']::text[], ARRAY['Điều dưỡng viên', 'Điều dưỡng quốc tế', 'Quản lý y tế', 'Giảng viên điều dưỡng']::text[], 0.3, 0.3, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('biotechnology', 'Công nghệ sinh học', 'Khoa học', 'Ứng dụng sinh học vào nông nghiệp, y dược, thực phẩm và môi trường.', ARRAY['công nghệ', 'y tế', 'phân tích dữ liệu']::text[], ARRAY['làm việc với dữ liệu', 'công việc ổn định', 'môi trường quốc tế']::text[], ARRAY['INTJ', 'INTP', 'ISTJ', 'INFJ']::text[], ARRAY['Sinh học phân tử', 'Thí nghiệm', 'Nghiên cứu khoa học', 'Tiếng Anh']::text[], ARRAY['R&D Biotech', 'QC thực phẩm', 'Nghiên cứu viên', 'Kỹ sư môi trường']::text[], 0.5, 0.1, 0.6, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('electrical_engineering', 'Kỹ thuật điện', 'Kỹ thuật', 'Thiết kế, vận hành hệ thống điện, năng lượng và điện tử công suất.', ARRAY['công nghệ', 'phân tích dữ liệu']::text[], ARRAY['công việc ổn định', 'thu nhập cao']::text[], ARRAY['ISTJ', 'INTJ', 'ISTP', 'ESTJ']::text[], ARRAY['Mạch điện', 'PLC', 'AutoCAD', 'Vật lý kỹ thuật']::text[], ARRAY['Kỹ sư điện', 'Kỹ sư năng lượng', 'Kỹ sư tự động hóa', 'Kỹ sư bảo trì']::text[], 0.9, 0.05, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('automation', 'Tự động hóa', 'Kỹ thuật', 'Điều khiển tự động, robot, IoT và hệ thống sản xuất thông minh.', ARRAY['công nghệ', 'phân tích dữ liệu', 'sáng tạo']::text[], ARRAY['thu nhập cao', 'làm việc với dữ liệu', 'công việc ổn định']::text[], ARRAY['INTJ', 'ISTP', 'INTP', 'ISTJ']::text[], ARRAY['PLC/SCADA', 'Robotics', 'IoT', 'Lập trình nhúng']::text[], ARRAY['Automation Engineer', 'Robotics Engineer', 'IoT Developer', 'Control Systems Engineer']::text[], 0.9, 0.05, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('english_education', 'Sư phạm Anh', 'Giáo dục', 'Đào tạo giáo viên tiếng Anh với phương pháp sư phạm hiện đại.', ARRAY['giáo dục', 'ngôn ngữ', 'giao tiếp']::text[], ARRAY['công việc ổn định', 'làm việc với con người', 'có thể làm freelancer/remote']::text[], ARRAY['ENFJ', 'ESFJ', 'INFJ', 'ENFP']::text[], ARRAY['Phương pháp giảng dạy', 'IELTS/CELTA', 'Classroom Management', 'EdTech']::text[], ARRAY['Giáo viên tiếng Anh', 'IELTS Trainer', 'Curriculum Developer', 'EdTech Specialist']::text[], 0.1, 0.5, 0.95, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('math_education', 'Sư phạm Toán', 'Giáo dục', 'Đào tạo giáo viên Toán có nền tảng toán học vững và năng lực truyền đạt.', ARRAY['giáo dục', 'phân tích dữ liệu']::text[], ARRAY['công việc ổn định', 'làm việc với con người']::text[], ARRAY['ISTJ', 'INTJ', 'ISFJ', 'INFJ']::text[], ARRAY['Toán cao cấp', 'Phương pháp sư phạm', 'Công nghệ giáo dục', 'Tâm lý học sinh']::text[], ARRAY['Giáo viên Toán', 'Giảng viên đại học', 'Nghiên cứu giáo dục', 'EdTech Developer']::text[], 0.95, 0.3, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('graphic_design', 'Thiết kế đồ họa', 'Nghệ thuật', 'Thiết kế hình ảnh, UI/UX, branding và sản phẩm sáng tạo thị giác.', ARRAY['thiết kế', 'sáng tạo', 'công nghệ']::text[], ARRAY['công việc sáng tạo', 'có thể làm freelancer/remote', 'thu nhập cao']::text[], ARRAY['ISFP', 'INFP', 'ENFP', 'ISTP']::text[], ARRAY['Adobe Illustrator', 'Figma', 'Typography', 'Color Theory']::text[], ARRAY['Graphic Designer', 'UI/UX Designer', 'Brand Designer', 'Art Director']::text[], 0.15, 0.4, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1),
  ('ecommerce', 'Thương mại điện tử', 'Kinh doanh', 'Kinh doanh trực tuyến, nền tảng số, thanh toán điện tử và marketing online.', ARRAY['kinh doanh', 'công nghệ', 'sáng tạo', 'phân tích dữ liệu']::text[], ARRAY['thu nhập cao', 'có thể làm freelancer/remote', 'có cơ hội thăng tiến']::text[], ARRAY['ENTP', 'ENTJ', 'ESTP', 'ENFP']::text[], ARRAY['SEO/SEM', 'E-commerce platforms', 'Digital Ads', 'Data Analytics']::text[], ARRAY['E-commerce Manager', 'Growth Hacker', 'Dropshipper', 'Digital Product Manager']::text[], 0.5, 0.3, 0.7, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.3, 0.2, 0.1)
ON CONFLICT (major_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  interest_tags = EXCLUDED.interest_tags,
  career_goal_tags = EXCLUDED.career_goal_tags,
  personality_tags = EXCLUDED.personality_tags,
  skills_to_improve = EXCLUDED.skills_to_improve,
  career_paths = EXCLUDED.career_paths,
  math_weight = EXCLUDED.math_weight,
  literature_weight = EXCLUDED.literature_weight,
  english_weight = EXCLUDED.english_weight,
  physics_weight = EXCLUDED.physics_weight,
  chemistry_weight = EXCLUDED.chemistry_weight,
  biology_weight = EXCLUDED.biology_weight,
  history_weight = EXCLUDED.history_weight,
  geography_weight = EXCLUDED.geography_weight,
  civic_education_weight = EXCLUDED.civic_education_weight,
  informatics_weight = EXCLUDED.informatics_weight,
  technology_weight = EXCLUDED.technology_weight,
  academic_fit_weight = EXCLUDED.academic_fit_weight,
  interest_fit_weight = EXCLUDED.interest_fit_weight,
  career_goal_fit_weight = EXCLUDED.career_goal_fit_weight,
  personality_fit_weight = EXCLUDED.personality_fit_weight,
  updated_at = now();
