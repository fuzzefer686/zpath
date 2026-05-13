-- =========================================
-- Bảng news_articles: Lưu bài viết bảng tin
-- =========================================

CREATE TABLE IF NOT EXISTS public.news_articles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text UNIQUE NOT NULL,
    tag text NOT NULL DEFAULT '',
    title text NOT NULL,
    excerpt text NOT NULL DEFAULT '',
    content text NOT NULL DEFAULT '',
    author text NOT NULL DEFAULT 'Ban biên tập ZPATH',
    read_time text NOT NULL DEFAULT '5 phút đọc',
    featured boolean NOT NULL DEFAULT false,
    image_gradient text NOT NULL DEFAULT 'from-primary/40 via-accent/40 to-secondary/60',
    published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index cho truy vấn phổ biến
CREATE INDEX idx_news_articles_published ON public.news_articles(published, created_at DESC);
CREATE INDEX idx_news_articles_slug ON public.news_articles(slug);
CREATE INDEX idx_news_articles_tag ON public.news_articles(tag);

-- =========================================
-- RLS: Bật Row Level Security
-- =========================================
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Mọi người đều đọc được bài đã published
CREATE POLICY "Anyone can read published articles"
    ON public.news_articles
    FOR SELECT
    USING (published = true);

-- Policy 2: Admin đọc tất cả bài (kể cả draft)
CREATE POLICY "Admin can read all articles"
    ON public.news_articles
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );

-- Policy 3: Chỉ admin mới được tạo bài
CREATE POLICY "Admin can insert articles"
    ON public.news_articles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );

-- Policy 4: Chỉ admin mới được sửa bài
CREATE POLICY "Admin can update articles"
    ON public.news_articles
    FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    )
    WITH CHECK (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );

-- Policy 5: Chỉ admin mới được xóa bài
CREATE POLICY "Admin can delete articles"
    ON public.news_articles
    FOR DELETE
    TO authenticated
    USING (
        (auth.jwt()->'app_metadata'->>'role') = 'admin'
    );

-- Grant permissions cho các role
GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT ON public.news_articles TO authenticated;
GRANT ALL ON public.news_articles TO service_role;

-- =========================================
-- Trigger: Auto-update updated_at
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_news_articles_updated_at
    BEFORE UPDATE ON public.news_articles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Seed data: Bài viết mẫu
-- =========================================
INSERT INTO public.news_articles (slug, tag, title, excerpt, content, author, read_time, featured, image_gradient, published) VALUES
(
    'quy-che-thi-tot-nghiep-thpt-2026',
    'Tuyển sinh 2026',
    'Bộ GD công bố quy chế thi tốt nghiệp THPT 2026 với nhiều thay đổi quan trọng',
    'Bộ Giáo dục và Đào tạo vừa chính thức ban hành quy chế thi tốt nghiệp THPT năm 2026 với hàng loạt điều chỉnh đáng chú ý về cấu trúc đề thi, cách tính điểm xét tuyển đại học và lịch trình tổ chức kỳ thi.',
    E'## Những thay đổi đáng chú ý\n\nTheo thông tin từ Bộ GD&ĐT, kỳ thi tốt nghiệp THPT 2026 sẽ có nhiều điều chỉnh quan trọng nhằm phù hợp hơn với chương trình giáo dục phổ thông mới.\n\n### 1. Cấu trúc đề thi thay đổi\n\nĐề thi năm nay sẽ tăng tỷ lệ câu hỏi vận dụng và vận dụng cao, giảm bớt phần kiến thức thuần lý thuyết. Điều này đòi hỏi học sinh phải có khả năng tư duy phân tích tốt hơn.\n\n### 2. Cách tính điểm xét tuyển mới\n\nCác trường đại học sẽ sử dụng công thức xét tuyển mới, trong đó điểm thi tốt nghiệp chiếm 60%, điểm học bạ chiếm 30%, và các hoạt động ngoại khóa chiếm 10%.\n\n### 3. Lịch trình kỳ thi\n\nKỳ thi sẽ diễn ra vào đầu tháng 7/2026, sớm hơn 2 tuần so với các năm trước. Kết quả sẽ được công bố trong vòng 15 ngày sau khi kết thúc kỳ thi.\n\n### Lời khuyên từ ZPATH\n\nVới những thay đổi này, học sinh cần bắt đầu ôn luyện từ sớm và tập trung vào khả năng vận dụng kiến thức thay vì chỉ học thuộc lòng.',
    'Ban biên tập ZPATH',
    '5 phút đọc',
    true,
    'from-primary/40 via-accent/40 to-secondary/60',
    true
),
(
    'top-10-hoc-bong-gen-z',
    'Học bổng',
    'Top 10 học bổng Gen-Z dễ apply nhất mùa hè này — cơ hội không thể bỏ lỡ',
    'Tổng hợp những suất học bổng hấp dẫn dành riêng cho học sinh Gen-Z từ các tổ chức giáo dục uy tín trong và ngoài nước, với quy trình nộp hồ sơ đơn giản.',
    E'## Danh sách 10 học bổng nổi bật\n\nMùa hè 2026 mang đến hàng loạt cơ hội học bổng giá trị cho các bạn Gen-Z.\n\n### 1. VinGroup Young Talent Scholarship\n- **Giá trị:** 100% học phí + sinh hoạt phí\n- **Đối tượng:** Học sinh THPT có GPA ≥ 8.0\n- **Hạn nộp:** 30/06/2026\n\n### 2. FPT Future Builder\n- **Giá trị:** 50-100% học phí\n- **Đối tượng:** Học sinh đam mê công nghệ\n- **Hạn nộp:** 15/07/2026\n\n### 3. Samsung Vietnam Innovation Award\n- **Giá trị:** 200 triệu VNĐ\n- **Đối tượng:** Dự án sáng tạo của nhóm 3-5 học sinh\n- **Hạn nộp:** 31/07/2026',
    'Minh Anh',
    '7 phút đọc',
    true,
    'from-secondary/50 via-primary/40 to-tier-high/50',
    true
),
(
    '5-nganh-hoc-trien-vong-2030',
    'Hướng nghiệp',
    '5 ngành học có triển vọng việc làm cao nhất đến 2030 theo phân tích AI',
    'Phân tích từ dữ liệu thị trường lao động và xu hướng công nghệ toàn cầu cho thấy những ngành học nào sẽ có nhu cầu nhân lực cao nhất trong 5 năm tới.',
    E'## Xu hướng nghề nghiệp 2026-2030\n\nThị trường lao động đang thay đổi nhanh chóng. Dựa trên phân tích dữ liệu từ hàng nghìn nguồn, ZPATH đã xác định 5 ngành học có triển vọng tươi sáng nhất.\n\n### 1. Trí tuệ nhân tạo & Khoa học dữ liệu\nNhu cầu nhân lực AI tăng 300% so với 2023.\n\n### 2. Y sinh & Công nghệ sinh học\nSau đại dịch, ngành y sinh và biotech tăng trưởng mạnh.\n\n### 3. Năng lượng tái tạo & Phát triển bền vững\nCam kết Net Zero 2050 của Việt Nam tạo ra hàng nghìn vị trí mới mỗi năm.',
    'Dr. Nguyễn Thanh',
    '6 phút đọc',
    false,
    'from-tier-high/40 via-accent/30 to-primary/50',
    true
),
(
    'huong-dan-chon-truong-dai-hoc',
    'Tư vấn',
    'Hướng dẫn chọn trường đại học phù hợp: 7 tiêu chí quan trọng nhất',
    'Đừng chỉ nhìn vào bảng xếp hạng! Bài viết này sẽ giúp bạn hiểu rõ 7 tiêu chí thực sự quan trọng khi lựa chọn trường đại học.',
    E'## Chọn trường đại học đúng cách\n\nViệc chọn trường đại học là một trong những quyết định quan trọng nhất của cuộc đời. Hãy xem xét 7 tiêu chí sau:\n\n### 1. Chương trình đào tạo\nXem xét nội dung chương trình, phương pháp giảng dạy và cơ hội thực hành.\n\n### 2. Đội ngũ giảng viên\nGiảng viên có kinh nghiệm thực tế sẽ mang lại giá trị lớn.\n\n### 3. Cơ sở vật chất\nPhòng lab, thư viện, khu thể thao ảnh hưởng trực tiếp đến trải nghiệm đại học.',
    'Hoàng Linh',
    '8 phút đọc',
    false,
    'from-accent/40 via-secondary/40 to-primary/40',
    true
),
(
    'ky-nang-mem-sinh-vien',
    'Kỹ năng',
    '8 kỹ năng mềm sinh viên cần trang bị trước khi ra trường',
    'Bằng cấp chưa đủ! Nhà tuyển dụng ngày càng chú trọng kỹ năng mềm. Đây là 8 kỹ năng bạn cần phát triển ngay từ bây giờ.',
    E'## Kỹ năng mềm — vũ khí bí mật\n\nTheo khảo sát của LinkedIn, 92% nhà tuyển dụng đánh giá kỹ năng mềm ngang bằng hoặc quan trọng hơn kỹ năng cứng.\n\n### 1. Giao tiếp hiệu quả\nBiết cách trình bày ý tưởng rõ ràng, thuyết phục.\n\n### 2. Tư duy phản biện\nKhả năng phân tích vấn đề từ nhiều góc độ.',
    'Thảo Nguyên',
    '6 phút đọc',
    false,
    'from-primary/50 via-tier-mid/30 to-secondary/40',
    true
),
(
    'phuong-phap-on-thi-hieu-qua',
    'Học tập',
    'Phương pháp ôn thi hiệu quả theo khoa học: Spaced Repetition & Active Recall',
    'Bỏ qua kiểu học nhồi nhét! Hai phương pháp được khoa học chứng minh hiệu quả gấp 3 lần so với cách học truyền thống.',
    E'## Học thông minh, không học nhiều\n\nNghiên cứu từ ĐH Harvard cho thấy phương pháp học truyền thống chỉ hiệu quả 30% so với các phương pháp khoa học.\n\n### Spaced Repetition\nChia nhỏ thành nhiều buổi học. Khoảng cách giữa các lần ôn tăng dần.\n\n### Active Recall\nĐóng sách lại và tự trả lời câu hỏi. Giải thích khái niệm cho người khác.',
    'Ban biên tập ZPATH',
    '5 phút đọc',
    false,
    'from-tier-mid/40 via-primary/30 to-accent/50',
    true
);
