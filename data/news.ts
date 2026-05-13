export interface NewsArticle {
  id: string;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  readTime: string;
  featured?: boolean;
  imageGradient: string;
}

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: "1",
    slug: "quy-che-thi-tot-nghiep-thpt-2026",
    tag: "Tuyển sinh 2026",
    title: "Bộ GD công bố quy chế thi tốt nghiệp THPT 2026 với nhiều thay đổi quan trọng",
    excerpt:
      "Bộ Giáo dục và Đào tạo vừa chính thức ban hành quy chế thi tốt nghiệp THPT năm 2026 với hàng loạt điều chỉnh đáng chú ý về cấu trúc đề thi, cách tính điểm xét tuyển đại học và lịch trình tổ chức kỳ thi.",
    content: `## Những thay đổi đáng chú ý

Theo thông tin từ Bộ GD&ĐT, kỳ thi tốt nghiệp THPT 2026 sẽ có nhiều điều chỉnh quan trọng nhằm phù hợp hơn với chương trình giáo dục phổ thông mới.

### 1. Cấu trúc đề thi thay đổi

Đề thi năm nay sẽ tăng tỷ lệ câu hỏi vận dụng và vận dụng cao, giảm bớt phần kiến thức thuần lý thuyết. Điều này đòi hỏi học sinh phải có khả năng tư duy phân tích tốt hơn.

### 2. Cách tính điểm xét tuyển mới

Các trường đại học sẽ sử dụng công thức xét tuyển mới, trong đó điểm thi tốt nghiệp chiếm 60%, điểm học bạ chiếm 30%, và các hoạt động ngoại khóa chiếm 10%.

### 3. Lịch trình kỳ thi

Kỳ thi sẽ diễn ra vào đầu tháng 7/2026, sớm hơn 2 tuần so với các năm trước. Kết quả sẽ được công bố trong vòng 15 ngày sau khi kết thúc kỳ thi.

### Lời khuyên từ ZPATH

Với những thay đổi này, học sinh cần bắt đầu ôn luyện từ sớm và tập trung vào khả năng vận dụng kiến thức thay vì chỉ học thuộc lòng. Hãy sử dụng công cụ tư vấn của ZPATH để xây dựng lộ trình học tập phù hợp.`,
    date: "28/04/2026",
    author: "Ban biên tập ZPATH",
    readTime: "5 phút đọc",
    featured: true,
    imageGradient: "from-primary/40 via-accent/40 to-secondary/60",
  },
  {
    id: "2",
    slug: "top-10-hoc-bong-gen-z",
    tag: "Học bổng",
    title: "Top 10 học bổng Gen-Z dễ apply nhất mùa hè này — cơ hội không thể bỏ lỡ",
    excerpt:
      "Tổng hợp những suất học bổng hấp dẫn dành riêng cho học sinh Gen-Z từ các tổ chức giáo dục uy tín trong và ngoài nước, với quy trình nộp hồ sơ đơn giản.",
    content: `## Danh sách 10 học bổng nổi bật

Mùa hè 2026 mang đến hàng loạt cơ hội học bổng giá trị cho các bạn Gen-Z. Dưới đây là tổng hợp 10 suất học bổng nổi bật nhất.

### 1. VinGroup Young Talent Scholarship
- **Giá trị:** 100% học phí + sinh hoạt phí
- **Đối tượng:** Học sinh THPT có GPA ≥ 8.0
- **Hạn nộp:** 30/06/2026

### 2. FPT Future Builder
- **Giá trị:** 50-100% học phí
- **Đối tượng:** Học sinh đam mê công nghệ
- **Hạn nộp:** 15/07/2026

### 3. Samsung Vietnam Innovation Award
- **Giá trị:** 200 triệu VNĐ
- **Đối tượng:** Dự án sáng tạo của nhóm 3-5 học sinh
- **Hạn nộp:** 31/07/2026

### 4. VNUK International Scholarship
- **Giá trị:** 75% học phí cho 4 năm
- **Đối tượng:** Học sinh có IELTS ≥ 6.0
- **Hạn nộp:** 20/06/2026

### 5. Fulbright Vietnam
- **Giá trị:** Toàn phần bao gồm vé máy bay
- **Đối tượng:** Sinh viên xuất sắc
- **Hạn nộp:** 01/08/2026

### Mẹo apply thành công

Hãy chuẩn bị hồ sơ sớm, viết essay thể hiện đam mê thực sự, và nhờ thầy cô viết thư giới thiệu từ trước ít nhất 1 tháng.`,
    date: "25/04/2026",
    author: "Minh Anh",
    readTime: "7 phút đọc",
    featured: true,
    imageGradient: "from-secondary/50 via-primary/40 to-tier-high/50",
  },
  {
    id: "3",
    slug: "5-nganh-hoc-trien-vong-2030",
    tag: "Hướng nghiệp",
    title: "5 ngành học có triển vọng việc làm cao nhất đến 2030 theo phân tích AI",
    excerpt:
      "Phân tích từ dữ liệu thị trường lao động và xu hướng công nghệ toàn cầu cho thấy những ngành học nào sẽ có nhu cầu nhân lực cao nhất trong 5 năm tới.",
    content: `## Xu hướng nghề nghiệp 2026-2030

Thị trường lao động đang thay đổi nhanh chóng. Dựa trên phân tích dữ liệu từ hàng nghìn nguồn, ZPATH đã xác định 5 ngành học có triển vọng tươi sáng nhất.

### 1. Trí tuệ nhân tạo & Khoa học dữ liệu
Nhu cầu nhân lực AI tăng 300% so với 2023. Mức lương khởi điểm trung bình 15-25 triệu VNĐ/tháng.

### 2. Y sinh & Công nghệ sinh học
Sau đại dịch, ngành y sinh và biotech tăng trưởng mạnh. Các vị trí R&D có mức thu nhập cạnh tranh toàn cầu.

### 3. Năng lượng tái tạo & Phát triển bền vững
Cam kết Net Zero 2050 của Việt Nam tạo ra hàng nghìn vị trí mới mỗi năm trong lĩnh vực năng lượng sạch.

### 4. An ninh mạng
Với số vụ tấn công mạng tăng 45% mỗi năm, nhu cầu chuyên gia an ninh mạng đang ở mức báo động.

### 5. Thiết kế UX/UI & Sản phẩm số
Sự bùng nổ của startup và chuyển đổi số khiến nhu cầu designer sản phẩm số tăng vọt.

### Lời khuyên

Hãy tìm hiểu kỹ và chọn ngành phù hợp với đam mê cá nhân, không chỉ chạy theo xu hướng. Dùng công cụ tư vấn ngành của ZPATH để khám phá thế mạnh của bạn.`,
    date: "20/04/2026",
    author: "Dr. Nguyễn Thanh",
    readTime: "6 phút đọc",
    imageGradient: "from-tier-high/40 via-accent/30 to-primary/50",
  },
  {
    id: "4",
    slug: "huong-dan-chon-truong-dai-hoc",
    tag: "Tư vấn",
    title: "Hướng dẫn chọn trường đại học phù hợp: 7 tiêu chí quan trọng nhất",
    excerpt:
      "Đừng chỉ nhìn vào bảng xếp hạng! Bài viết này sẽ giúp bạn hiểu rõ 7 tiêu chí thực sự quan trọng khi lựa chọn trường đại học.",
    content: `## Chọn trường đại học đúng cách

Việc chọn trường đại học là một trong những quyết định quan trọng nhất của cuộc đời. Hãy xem xét 7 tiêu chí sau:

### 1. Chương trình đào tạo
Xem xét nội dung chương trình, phương pháp giảng dạy và cơ hội thực hành. Một chương trình tốt cần cập nhật theo xu hướng thị trường.

### 2. Đội ngũ giảng viên
Giảng viên có kinh nghiệm thực tế và nghiên cứu chất lượng sẽ mang lại giá trị lớn cho sinh viên.

### 3. Cơ sở vật chất
Phòng lab, thư viện, khu thể thao — môi trường học tập ảnh hưởng trực tiếp đến trải nghiệm đại học.

### 4. Mạng lưới Alumni
Cựu sinh viên thành công là nguồn tài nguyên quý giá cho networking và cơ hội việc làm.

### 5. Vị trí địa lý
Gần khu công nghiệp, trung tâm kinh tế sẽ tạo nhiều cơ hội thực tập và làm việc part-time.

### 6. Học phí & Hỗ trợ tài chính
So sánh học phí giữa các trường và tìm hiểu chính sách học bổng, hỗ trợ tài chính.

### 7. Tỷ lệ có việc làm sau tốt nghiệp
Đây là chỉ số thực tế nhất phản ánh chất lượng đào tạo của một trường đại học.

### Kết luận

Hãy dành thời gian tìm hiểu kỹ và sử dụng UniMap của ZPATH để so sánh các trường một cách trực quan.`,
    date: "15/04/2026",
    author: "Hoàng Linh",
    readTime: "8 phút đọc",
    imageGradient: "from-accent/40 via-secondary/40 to-primary/40",
  },
  {
    id: "5",
    slug: "ky-nang-mem-sinh-vien",
    tag: "Kỹ năng",
    title: "8 kỹ năng mềm sinh viên cần trang bị trước khi ra trường",
    excerpt:
      "Bằng cấp chưa đủ! Nhà tuyển dụng ngày càng chú trọng kỹ năng mềm. Đây là 8 kỹ năng bạn cần phát triển ngay từ bây giờ.",
    content: `## Kỹ năng mềm — vũ khí bí mật

Theo khảo sát của LinkedIn, 92% nhà tuyển dụng đánh giá kỹ năng mềm ngang bằng hoặc quan trọng hơn kỹ năng cứng.

### 1. Giao tiếp hiệu quả
Biết cách trình bày ý tưởng rõ ràng, thuyết phục cả bằng lời nói và văn bản.

### 2. Tư duy phản biện
Khả năng phân tích vấn đề từ nhiều góc độ, không chấp nhận thông tin một chiều.

### 3. Làm việc nhóm
Biết phối hợp, phân công và giải quyết xung đột trong nhóm hiệu quả.

### 4. Quản lý thời gian
Sắp xếp công việc ưu tiên, đặt deadline và hoàn thành đúng hạn.

### 5. Lãnh đạo
Không chỉ dành cho quản lý — ai cũng cần khả năng dẫn dắt bản thân và ảnh hưởng tích cực.

### 6. Thích ứng
Trong thời đại thay đổi nhanh, khả năng thích ứng là kỹ năng sống còn.

### 7. Sáng tạo
Tư duy ngoài khuôn khổ giúp bạn nổi bật và tạo ra giá trị khác biệt.

### 8. Kỹ năng số
Thành thạo các công cụ số cơ bản và biết cách tận dụng AI hỗ trợ công việc.

### Bắt đầu từ đâu?

Tham gia câu lạc bộ, dự án nhóm, và thực tập sớm. Sử dụng công cụ đánh giá tính cách của ZPATH để hiểu điểm mạnh bạn cần phát huy.`,
    date: "10/04/2026",
    author: "Thảo Nguyên",
    readTime: "6 phút đọc",
    imageGradient: "from-primary/50 via-tier-mid/30 to-secondary/40",
  },
  {
    id: "6",
    slug: "phuong-phap-on-thi-hieu-qua",
    tag: "Học tập",
    title: "Phương pháp ôn thi hiệu quả theo khoa học: Spaced Repetition & Active Recall",
    excerpt:
      "Bỏ qua kiểu học nhồi nhét! Hai phương pháp được khoa học chứng minh hiệu quả gấp 3 lần so với cách học truyền thống.",
    content: `## Học thông minh, không học nhiều

Nghiên cứu từ ĐH Harvard cho thấy phương pháp học truyền thống (đọc lại nhiều lần) chỉ hiệu quả 30% so với các phương pháp khoa học.

### Spaced Repetition (Lặp lại ngắt quãng)

Thay vì học dồn 8 tiếng 1 ngày, hãy chia nhỏ thành 4 buổi × 2 tiếng trong 4 ngày. Khoảng cách giữa các lần ôn tăng dần: 1 ngày → 3 ngày → 7 ngày → 14 ngày.

**Công cụ hỗ trợ:** Anki, Quizlet, hoặc tự tạo flashcard.

### Active Recall (Gợi nhớ chủ động)

Đóng sách lại và tự trả lời câu hỏi. Viết lại những gì bạn nhớ trên giấy trắng. Giải thích khái niệm cho người khác (kỹ thuật Feynman).

### Kết hợp cả hai

1. Học bài mới → Tóm tắt bằng flashcard
2. Ngày hôm sau: Tự test bằng Active Recall
3. 3 ngày sau: Ôn lại flashcard
4. 1 tuần sau: Test lại toàn bộ
5. 2 tuần sau: Ôn cuối cùng

### Lịch ôn thi gợi ý

Bắt đầu ôn trước kỳ thi 2-3 tháng, mỗi ngày 3-4 tiếng chia thành 2 buổi. Dành 1 ngày/tuần để nghỉ ngơi hoàn toàn.`,
    date: "05/04/2026",
    author: "Ban biên tập ZPATH",
    readTime: "5 phút đọc",
    imageGradient: "from-tier-mid/40 via-primary/30 to-accent/50",
  },
  {
    id: "7",
    slug: "nghe-hot-nganh-ai-2026",
    tag: "Công nghệ",
    title: "Ngành AI & Machine Learning: Lộ trình học từ zero đến hero cho Gen-Z",
    excerpt:
      "AI không chỉ dành cho thiên tài! Bài viết hướng dẫn chi tiết lộ trình từ cơ bản đến nâng cao để bắt đầu sự nghiệp trong lĩnh vực AI.",
    content: `## AI cho người mới bắt đầu

Năm 2026, AI đã trở thành kỹ năng thiết yếu. Nhưng bắt đầu từ đâu?

### Giai đoạn 1: Nền tảng (3-6 tháng)
- **Toán:** Đại số tuyến tính, Xác suất thống kê, Giải tích
- **Lập trình:** Python cơ bản, cấu trúc dữ liệu
- **Tài nguyên:** Khan Academy, CS50 Harvard

### Giai đoạn 2: Machine Learning (3-6 tháng)
- Scikit-learn, Pandas, NumPy
- Các thuật toán cơ bản: Linear Regression, Decision Tree, KNN
- Andrew Ng's Machine Learning course

### Giai đoạn 3: Deep Learning (3-6 tháng)
- TensorFlow hoặc PyTorch
- Neural Networks, CNN, RNN, Transformer
- Các dự án thực tế: phân loại ảnh, NLP cơ bản

### Giai đoạn 4: Chuyên sâu (6+ tháng)
- Computer Vision, NLP, Reinforcement Learning
- Large Language Models
- Nghiên cứu và publish paper

### Cơ hội nghề nghiệp
- ML Engineer: 20-40 triệu/tháng
- Data Scientist: 15-35 triệu/tháng
- AI Researcher: 25-50 triệu/tháng

### Tips từ ZPATH
Không cần giỏi toán từ đầu — quan trọng là kiên trì. Bắt đầu với dự án nhỏ và tăng dần độ phức tạp.`,
    date: "01/04/2026",
    author: "Đức Minh",
    readTime: "9 phút đọc",
    imageGradient: "from-secondary/40 via-tier-high/30 to-primary/50",
  },
  {
    id: "8",
    slug: "sai-lam-khi-chon-nganh",
    tag: "Hướng nghiệp",
    title: "5 sai lầm phổ biến khi chọn ngành học và cách tránh",
    excerpt:
      "Hơn 40% sinh viên hối hận về ngành học đã chọn. Đây là 5 sai lầm thường gặp nhất và cách để bạn không mắc phải.",
    content: `## Đừng để hối hận

Theo thống kê, 42% sinh viên Việt Nam cảm thấy đã chọn sai ngành sau năm nhất. Hiểu nguyên nhân để tránh mắc sai lầm.

### Sai lầm 1: Chọn theo phong trào
"Ai cũng học CNTT thì mình cũng học" — tâm lý đám đông khiến nhiều bạn chọn ngành không phù hợp với bản thân.

### Sai lầm 2: Chỉ nhìn vào lương
Mức lương cao nhưng không yêu thích công việc sẽ dẫn đến kiệt sức và chán nản sau vài năm.

### Sai lầm 3: Nghe theo cha mẹ hoàn toàn
Cha mẹ muốn tốt cho con, nhưng không phải lúc nào cũng hiểu rõ sở thích và năng lực thật sự của con.

### Sai lầm 4: Không tìm hiểu kỹ
Nhiều bạn chỉ biết tên ngành mà không hiểu chương trình sẽ học gì, ra trường làm gì.

### Sai lầm 5: Bỏ qua tính cách
Người hướng nội có thể không phù hợp với ngành Marketing, người thiếu kiên nhẫn sẽ khó theo đuổi nghiên cứu.

### Giải pháp

1. Tự khám phá bản thân qua bài test tính cách
2. Tìm hiểu kỹ ngành học qua Majorly
3. Trò chuyện với alumni và người đi trước
4. Dùng công cụ tư vấn ngành của ZPATH
5. Thử trải nghiệm thực tế trước khi quyết định`,
    date: "28/03/2026",
    author: "Ban biên tập ZPATH",
    readTime: "5 phút đọc",
    imageGradient: "from-destructive/30 via-accent/30 to-tier-mid/40",
  },
];
