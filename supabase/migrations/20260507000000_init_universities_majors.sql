-- Keep this historical migration replayable for preview branches.
-- Later migrations may drop/restore majors, but programs needs the table
-- to exist before adding the initial FK below.
CREATE TABLE IF NOT EXISTS public.majors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    category text,
    description text,
    tags text[]
);

-- Create universities table
CREATE TABLE IF NOT EXISTS public.universities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    short_desc text,
    tags text[],
    city text,
    website text,
    hero_gradient text,
    
    -- 1. Thông tin chung
    about text,
    highlights text[],
    avatar_url text,
    
    -- 2. Phương thức xét tuyển (Lưu dưới dạng mảng JSON hoặc text)
    admission_methods jsonb, -- Ví dụ: [{"method": "Thi THPTQG", "quota": "50%"}, {"method": "ĐGNL", "quota": "20%"}]
    
    -- 3. Thông tin học phí chung
    tuition_info text
);

-- 4. Bảng danh sách ngành đào tạo + điểm chuẩn
-- LƯU Ý: Không lưu trực tiếp danh sách ngành vào bảng universities. 
-- Ta dùng bảng `programs` (Chương trình đào tạo) để liên kết 1 Trường -> Nhiều Ngành.
CREATE TABLE IF NOT EXISTS public.programs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    university_code text NOT NULL REFERENCES public.universities(code) ON DELETE CASCADE,
    -- major_code không đặt FK ở đây vì bảng public.majors được tạo ở migration
    -- sau (20260507153022_restore_majors.sql), nơi sẽ thêm ràng buộc khóa ngoại.
    major_code text, -- Có thể null nếu ngành đó chưa có trong bảng majors chung
    program_code text NOT NULL, -- VD: "IT1", "EE2"
    name text NOT NULL, -- Tên ngành tại trường đó (VD: "Khoa học Máy tính")
    
    -- Điểm chuẩn và Học phí
    admission_score_2025 numeric,
    tuition_per_semester numeric,
    
    -- Các thông tin mở rộng khác
    duration_years numeric,
    employment_rate numeric,
    avg_starting_salary numeric,
    description text,
    
    UNIQUE(university_code, program_code)
);

-- Note: We disable RLS for now so that Admin (or anyone during MVP) can edit. 
-- In production, you would enable RLS and only allow users with a specific role to UPDATE.
-- (RLS cho public.majors được xử lý ở migration restore_majors, nơi bảng được tạo.)
ALTER TABLE public.universities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs DISABLE ROW LEVEL SECURITY;

-- If you want to enable RLS later:
-- ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all read" ON public.majors FOR SELECT USING (true);
-- CREATE POLICY "Allow admin update" ON public.majors FOR UPDATE USING (auth.role() = 'authenticated');
