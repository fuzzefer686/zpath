
# Kế hoạch nâng cấp ZPath Advisor để trả lời sâu hơn, nhất quán hơn và ít chung chung hơn

## 1. Bối cảnh hiện tại

ZPath Advisor hiện đã có nền tảng khá đầy đủ cho bài toán tư vấn tuyển sinh và hướng nghiệp:

- Chat UI
- Question Templates
- Intent Classification
- Entity Extraction
- Structured Retrieval từ Supabase
- Optional Web Search
- Prompt Builder
- Gemini Answer Generation
- Conversation Persistence
- Feedback Logging

Hiện tại Advisor đã xử lý khá tốt các câu hỏi dựa trên dữ liệu có cấu trúc, ví dụ:

- Điểm chuẩn
- Học phí
- Phương thức xét tuyển
- Tổ hợp xét tuyển
- Chỉ tiêu tuyển sinh
- Thông tin trường
- Thông tin ngành theo dữ liệu tuyển sinh

Các câu hỏi dạng này có thể trả lời chính xác bằng SQL retrieval và các bộ lọc đơn giản.

Tuy nhiên, Advisor vẫn còn trả lời khá chung chung với các câu hỏi mang tính tư vấn ngành học và định hướng nghề nghiệp, ví dụ:

- “Ngành Công nghệ AI học những gì?”
- “Data Science khác AI thế nào?”
- “Ngành này hợp với ai?”
- “Ngành này có khó không?”
- “Ra trường làm nghề gì?”
- “Nên chọn AI hay Khoa học dữ liệu?”
- “Em thích toán nhưng không giỏi code thì nên học gì?”

Nguyên nhân chính không phải do thiếu RAG, mà là Advisor chưa có một lớp tri thức ngành học được chuẩn hóa để làm nguồn nền cho LLM.

---

## 2. Mục tiêu

Mục tiêu của giai đoạn này là:

1. Trả lời sâu hơn cho các câu hỏi về ngành học và nghề nghiệp.
2. Giảm các câu trả lời generic, an toàn nhưng thiếu giá trị.
3. Tăng tính nhất quán giữa các câu trả lời cùng chủ đề.
4. Hạn chế hallucination bằng cách dựa vào dữ liệu nội bộ có cấu trúc.
5. Chuẩn bị nền tảng dữ liệu và prompt để sau này có thể mở rộng sang Hybrid Retrieval.
6. Phân biệt rõ giữa tri thức tuyển sinh, tri thức ngành học, và tri thức nghề nghiệp.

---

## 3. Phạm vi áp dụng

Tài liệu này tập trung vào 3 lớp tri thức chính:

### 3.1. Dữ liệu tuyển sinh có cấu trúc

Bao gồm:

- admissions
- tuition_fees
- universities
- schools
- admission_programs
- admission_methods

Loại dữ liệu này tiếp tục truy xuất bằng:

- SQL
- Exact Match
- Fuzzy Match nhẹ

Không cần vector search cho nhóm dữ liệu này.

---

### 3.2. Tri thức ngành học và tư vấn lựa chọn ngành

Bao gồm:

- ngành là gì
- học gì
- khó không
- mức độ toán / code / tiếng Anh
- kỹ năng cần có
- phù hợp với ai
- không phù hợp với ai
- nghề nghiệp đầu ra
- hiểu lầm phổ biến
- ngành liên quan
- so sánh giữa các ngành

Đây là phần cần xây dựng thành **Advisor Knowledge Base**.

---

### 3.3. Tri thức nghề nghiệp

Bao gồm:

- mô tả công việc
- công việc hằng ngày
- kỹ năng cần có
- công cụ thường dùng
- lộ trình phát triển
- mức độ phù hợp với các nhóm ngành

Phần này giúp Advisor trả lời các câu hỏi kiểu:

- “Ngành này ra làm gì?”
- “Làm công việc đó có cần code không?”
- “Ngành này có thể chuyển sang nghề gì?”

---

## 4. Nguyên tắc thiết kế

### 4.1. Không triển khai RAG ngay

Hiện tại dữ liệu chủ yếu là structured data và tri thức ngành học ở mức chuẩn hóa.

Các dữ liệu tuyển sinh và thông tin trường nên tiếp tục truy xuất bằng:

- SQL
- Exact Match
- Fuzzy Match nhẹ

Không cần triển khai vector search ngay.

Vector search chỉ nên cân nhắc khi có nhiều dữ liệu dài như:

- đề án tuyển sinh
- handbook
- chương trình đào tạo
- bài viết hướng nghiệp
- FAQ dài
- tài liệu chính thức nhiều trang

---

### 4.2. LLM không phải nguồn tri thức chính

LLM chỉ nên làm nhiệm vụ:

- tổng hợp
- giải thích
- so sánh
- cá nhân hóa
- trình bày dễ hiểu

Nguồn tri thức nên đến từ:

- Structured DB
- Advisor Knowledge Base
- Official Sources
- Controlled Web Search

LLM không nên tự bịa thêm chi tiết nếu dữ liệu đầu vào không đủ.

---

### 4.3. Tri thức ngành học phải được chuẩn hóa

Không lưu một đoạn mô tả dài duy nhất.

Thay vào đó, chia thành các field có ý nghĩa rõ ràng để prompt có thể khai thác đúng phần cần thiết.

Ví dụ:

- ngành là gì
- học gì
- học khó không
- mức độ toán
- mức độ lập trình
- mức độ tiếng Anh
- kỹ năng cần có
- nghề nghiệp đầu ra
- hiểu lầm phổ biến
- ngành liên quan

Điều này giúp câu trả lời sâu hơn, ổn định hơn, và dễ kiểm soát hơn.

---

### 4.4. Dữ liệu phải có nguồn và độ tin cậy

Các field mang tính định tính như:

- marketDemand
- salaryOutlook
- futureTrend

không nên viết như kết luận tuyệt đối.

Nên có thêm:

- nguồn
- thời gian cập nhật
- mức độ tin cậy

để khi cần có thể giải thích mức độ chắc chắn của câu trả lời.

---

### 4.5. Tránh khẳng định tuyệt đối

Advisor không nên trả lời theo kiểu:

- “Ngành này chắc chắn lương cao”
- “Ngành này chắc chắn thất nghiệp”
- “Con trai / con gái thì nên học ngành này”
- “Chỉ cần học ngành này là dễ xin việc”

Thay vào đó nên trả lời theo hướng:

- có điều kiện
- có ngữ cảnh
- có giới hạn
- có lưu ý

---

## 5. Kiến trúc đề xuất

```text
User Question
    ↓

Intent Classification
    ↓

Entity Extraction
    ↓

Structured DB Retrieval
    ↓

Advisor Knowledge Retrieval
    ↓

Optional Web Search
    ↓

Context Builder
    ↓

Gemini
    ↓

Validation / Normalization
    ↓

Conversation Persistence
    ↓

Feedback Logging
```

### Giải thích luồng

- **Intent Classification**: xác định câu hỏi thuộc loại nào
- **Entity Extraction**: tìm ngành, trường, nghề, năm, khu vực, từ khóa
- **Structured DB Retrieval**: lấy dữ liệu tuyển sinh chính xác
- **Advisor Knowledge Retrieval**: lấy tri thức ngành học / nghề nghiệp đã chuẩn hóa
- **Optional Web Search**: dùng khi cần xác minh nguồn ngoài hoặc dữ liệu bổ sung
- **Context Builder**: ghép các phần dữ liệu thành ngữ cảnh cho LLM
- **Gemini**: sinh câu trả lời cuối cùng
- **Validation / Normalization**: kiểm tra lại câu trả lời có quá chung chung hoặc quá khẳng định không
- **Conversation Persistence**: lưu lịch sử hội thoại
- **Feedback Logging**: ghi nhận phản hồi để cải thiện

---

## 6. Advisor Knowledge Base

Thay vì chỉ có một Major Knowledge Base đơn lẻ, nên xây một Advisor Knowledge Base tổng quát hơn gồm các nhóm dữ liệu sau:

```text
major_profiles
major_comparisons
major_faqs
career_paths
```

Tùy giai đoạn có thể mở rộng thêm:

```text
major_fit_signals
program_profiles
advisor_faq_rules
```

---

## 7. Major Profile

Mỗi ngành nên có một hồ sơ tri thức chuẩn hóa.

### Gợi ý schema

```ts
type MajorProfile = {
  majorId: string; // ID nội bộ duy nhất của ngành, dùng làm khóa chính

  canonicalName: string; // Tên chuẩn của ngành
  aliases: string[]; // Các tên gọi khác của cùng ngành

  category: string; // Nhóm ngành lớn
  tags: string[]; // Từ khóa mô tả ngành
  searchKeywords: string[]; // Từ khóa tìm kiếm mở rộng

  scope: "general" | "country_specific" | "school_specific" | "program_specific"; // Phạm vi áp dụng của profile
  status: "draft" | "reviewed" | "approved" | "deprecated"; // Trạng thái nội dung
  version: number; // Phiên bản của profile

  oneLineDefinition: string; // Mô tả siêu ngắn của ngành trong 1 câu
  overview: string; // Tổng quan ngắn đến vừa về ngành

  difficultyLevel: 1 | 2 | 3 | 4 | 5; // Mức độ khó tổng quan

  mathIntensity: 1 | 2 | 3 | 4 | 5; // Mức độ cần toán
  codingIntensity: 1 | 2 | 3 | 4 | 5; // Mức độ cần lập trình
  englishIntensity: 1 | 2 | 3 | 4 | 5; // Mức độ cần tiếng Anh

  foundationSubjects: string[]; // Các môn nền tảng cần học
  advancedSubjects: string[]; // Các môn chuyên sâu

  toolsAndTechnologies: string[]; // Công cụ, framework, công nghệ thường dùng
  typicalProjects: string[]; // Các dạng project thường làm trong ngành

  requiredSkills: string[]; // Kỹ năng cần có để học tốt ngành này

  suitableFor: string[]; // Những kiểu người phù hợp với ngành
  notSuitableFor: string[]; // Những kiểu người không phù hợp hoặc sẽ thấy khó

  keyTakeaways: string[]; // Các điểm cần nhớ nhất về ngành
  cautionNotes: string[]; // Những lưu ý hoặc hiểu nhầm cần tránh

  careerPaths: string[]; // Các hướng nghề nghiệp sau khi học ngành này

  marketDemand: string; // Mô tả nhu cầu thị trường cho ngành
  salaryOutlook: string; // Mô tả triển vọng thu nhập
  futureTrend: string; // Xu hướng tương lai của ngành

  commonMisconceptions: string[]; // Những hiểu lầm phổ biến về ngành

  relatedMajors: {
    major: string; // Tên ngành liên quan
    relationship:
      | "similar"
      | "alternative"
      | "foundat
```

### Ví dụ cặp ngành nên ưu tiên

- AI vs Data Science
- CNTT vs Kỹ thuật phần mềm
- CNTT vs Khoa học máy tính
- Kỹ thuật phần mềm vs An toàn thông tin
- Marketing vs Truyền thông
- Tài chính vs Kế toán
- Kế toán vs Kiểm toán
- Logistics vs Kinh doanh quốc tế

---

## 9. Career Path Knowledge

Advisor không chỉ tư vấn ngành học mà còn cần tư vấn nghề nghiệp.

### Gợi ý schema

```ts
type CareerPathProfile = {
  careerId: string;

  name: string;
  description: string;

  dailyWork: string[];

  requiredSkills: string[];
  commonTools: string[];

  relatedMajors: string[];

  marketDemand: string;
  salaryRange: string;

  growthPath: string[];

  sources?: {
    title: string;
    url?: string;
    type: "official" | "internal" | "expert" | "web";
    retrievedAt?: string;
  }[];

  confidenceLevel?: "high" | "medium" | "low";
  lastUpdated?: string;
};
```

### Ví dụ nghề nghiệp

- AI Engineer
- Data Analyst
- Data Scientist
- Software Engineer
- Cybersecurity Analyst
- Digital Marketer
- Logistics Specialist
- Financial Analyst
- Accountant
- Lawyer / Legal Specialist

---

## 10. Intent Strategy

Prompt phải được thiết kế theo intent để câu trả lời luôn đi đúng cấu trúc.

### 10.1. `REVIEW_MAJOR`

Dùng khi người dùng hỏi về một ngành cụ thể.

Câu trả lời nên luôn bao gồm:

1. Ngành này là gì?
2. Học những gì?
3. Môn nền tảng
4. Môn chuyên sâu
5. Project thực tế
6. Kỹ năng cần có
7. Mức độ toán / code / tiếng Anh
8. Hợp với ai
9. Không hợp với ai
10. Ra trường làm gì

---

### 10.2. `COMPARE_MAJORS`

Dùng khi người dùng muốn so sánh 2 hoặc nhiều ngành.

Câu trả lời nên luôn bao gồm:

1. Kết luận nhanh
2. Điểm giống nhau
3. Khác nhau về mục tiêu học tập
4. Khác nhau về môn học
5. Khác nhau về project
6. Khác nhau về nghề nghiệp
7. Nên chọn ngành nào cho từng kiểu học sinh

---

### 10.3. `CAREER_GUIDANCE`

Dùng khi người dùng hỏi về nghề nghiệp.

Câu trả lời nên bao gồm:

1. Nghề này làm gì?
2. Một ngày làm việc điển hình
3. Kỹ năng cần có
4. Công cụ thường dùng
5. Mức độ phù hợp với hồ sơ học sinh
6. Lộ trình phát triển nghề nghiệp

---

### 10.4. `CHOOSE_MAJOR`

Dùng khi người dùng chưa nêu rõ ngành mà chỉ mô tả:

- sở thích
- năng lực
- điểm mạnh / yếu
- khối thi
- phong cách học
- mục tiêu nghề nghiệp

Ví dụ:

- “Em thích toán nhưng không giỏi code thì nên học gì?”
- “Em 24 điểm khối A01 nên chọn ngành nào?”
- “Em thích kinh doanh và công nghệ thì học gì?”
- “Em không giỏi toán nên tránh ngành nào?”

Intent này khác với `COMPARE_MAJORS` vì người dùng chưa đưa ra các ngành cụ thể để so sánh.

---

## 11. Prompt Strategy

### 11.1. Nguyên tắc chung

Prompt của Advisor cần:

- dùng dữ liệu nội bộ làm nền
- không tự bịa chi tiết
- không trả lời quá khẳng định
- ưu tiên cụ thể hơn là chung chung
- có cấu trúc trả lời nhất quán theo intent

---

### 11.2. Gợi ý cho `REVIEW_MAJOR`

Prompt nên ép mô hình trả lời theo các mục cố định:

- Ngành này là gì
- Học gì
- Khó ở điểm nào
- Cần mạnh về gì
- Cần chuẩn bị gì từ cấp 3
- Ra trường làm gì
- Ai phù hợp / không phù hợp
- Những hiểu lầm thường gặp

---

### 11.3. Gợi ý cho `COMPARE_MAJORS`

Prompt nên ép mô hình:

- nêu kết luận ngắn ngay từ đầu
- so sánh theo từng chiều rõ ràng
- không lẫn phần giới thiệu chung quá dài
- kết luận cuối phải theo kiểu “nếu bạn thích X thì chọn A, nếu thích Y thì chọn B”

---

### 11.4. Gợi ý cho `CAREER_GUIDANCE`

Prompt nên trình bày:

- nghề này làm gì
- công việc thực tế hằng ngày
- kỹ năng nào quan trọng nhất
- nên học ngành nào để vào nghề đó
- lộ trình junior -> mid -> senior
- lưu ý về điều kiện đầu vào

---

### 11.5. Gợi ý cho `CHOOSE_MAJOR`

Prompt nên ưu tiên:

- phân tích hồ sơ học sinh
- map hồ sơ sang nhóm ngành phù hợp
- nếu thiếu dữ kiện thì hỏi lại một câu ngắn
- không cố ép ra một ngành duy nhất nếu chưa đủ dữ liệu

---

## 12. Fallback Strategy

Nếu không tìm thấy dữ liệu đủ tốt, Advisor nên xử lý theo thứ tự sau:

1. Dùng structured DB nếu có.
2. Dùng Advisor Knowledge Base nếu có.
3. Nếu câu hỏi cần dữ liệu ngoài, dùng web search với nguồn uy tín/chính thức.
4. Nếu vẫn thiếu dữ liệu, trả lời khái quát và nói rõ chưa đủ thông tin nội bộ.
5. Không bịa chi tiết về môn học, lương, việc làm, hay độ khó.

### Nguyên tắc fallback

- Thiếu dữ liệu thì nói thiếu dữ liệu
- Không suy diễn thành dữ liệu thật
- Không biến kiến thức chung của model thành tri thức chính thức
- Không đưa ra kết luận quá mạnh khi độ tin cậy thấp

---

## 13. Lộ trình triển khai

### Phase 1. Xây schema và seed dữ liệu cốt lõi

Mục tiêu:

- chốt schema cho `major_profiles`
- chốt schema cho `major_comparisons`
- chốt schema cho `career_paths`
- thêm source, lastUpdated, confidenceLevel
- thêm tags và searchKeywords

Ưu tiên seed khoảng 8–12 ngành đầu tiên, nhưng làm kỹ:

- AI
- Data Science
- CNTT
- Kỹ thuật phần mềm
- An toàn thông tin
- Marketing
- Logistics
- Tài chính ngân hàng
- Kế toán
- Luật

---

### Phase 2. Tích hợp Advisor Knowledge Retrieval

Mục tiêu:

- route intent sang đúng nguồn dữ liệu
- lấy đúng profile theo major / comparison / career
- ghép context vào prompt builder
- bảo đảm output ổn định hơn

---

### Phase 3. Tối ưu prompt templates theo intent

Mục tiêu:

- mỗi intent có format trả lời riêng
- output nhất quán
- giảm câu trả lời lan man
- giảm generic response

---

### Phase 4. Bổ sung major comparisons và career paths

Mục tiêu:

- làm kỹ các cặp ngành phổ biến
- thêm các nghề nghiệp đầu ra hay được hỏi
- hỗ trợ tốt câu hỏi chọn ngành dựa trên mục tiêu nghề nghiệp

---

### Phase 5. Mở rộng dữ liệu dài và có nguồn chính thức

Mục tiêu:

- FAQ dài
- handbook
- đề án tuyển sinh
- chương trình đào tạo
- bài viết hướng nghiệp
- tài liệu chính thức theo trường/ngành

---

### Phase 6. Hybrid Retrieval

Chỉ triển khai khi dữ liệu dài đã đủ lớn.

Kiến trúc khi đó có thể là:

```text
Structured SQL
+
Advisor Knowledge Base
+
Vector Search
+
Gemini
```

---

## 14. Rủi ro lớn nhất

Rủi ro lớn nhất không nằm ở kỹ thuật mà nằm ở **chất lượng nội dung seed**.

Nếu `MajorProfile` quá chung chung thì Gemini vẫn sẽ trả lời chung chung.

Ví dụ không nên viết:

- “Ngành AI phù hợp với người yêu thích công nghệ, có tư duy logic và khả năng học hỏi.”

Câu này đúng nhưng quá generic.

Nên viết cụ thể hơn:

- “Ngành AI phù hợp với học sinh thích toán ứng dụng, xác suất-thống kê, lập trình và việc thử nghiệm mô hình nhiều lần. Người học cần chấp nhận việc kết quả không đúng ngay từ đầu, thường xuyên phải đọc tài liệu tiếng Anh, xử lý dữ liệu lỗi và điều chỉnh mô hình.”

Tri thức càng cụ thể thì câu trả lời càng có giá trị.

---

## 15. Tiêu chí đánh giá thành công

Có thể đánh giá giai đoạn này theo các tiêu chí sau:

### 15.1. Chất lượng trả lời

- ít generic hơn
- có chiều sâu hơn
- trả lời đúng trọng tâm intent
- bám dữ liệu nội bộ hơn

### 15.2. Tính ổn định

- cùng một câu hỏi, câu trả lời ít dao động
- các câu hỏi tương tự có format tương tự
- ít hallucination hơn

### 15.3. Khả năng mở rộng

- dễ thêm major mới
- dễ thêm comparison mới
- dễ thêm career path mới
- dễ mở rộng sang hybrid retrieval sau này

### 15.4. Khả năng bảo trì

- data có schema rõ
- source được ghi nhận
- update được theo thời gian
- không phụ thuộc quá nhiều vào prompt thủ công

---

# Kết luận

Ở thời điểm hiện tại, ưu tiên đúng không phải là Vector RAG, mà là xây một lớp tri thức ngành học và nghề nghiệp có cấu trúc, có thể kiểm soát và dễ cập nhật.

Hướng làm phù hợp nhất trong giai đoạn này là:

- Structured DB Retrieval cho dữ liệu tuyển sinh
- Advisor Knowledge Base cho tri thức ngành học và nghề nghiệp
- Major Profiles chuẩn hóa theo field
- Major Comparison Profiles cho các cặp ngành phổ biến
- Career Path Knowledge cho tư vấn nghề nghiệp
- Intent-specific Prompts để câu trả lời ổn định hơn
- Fallback strategy rõ ràng khi thiếu dữ liệu
- Source / confidence / lastUpdated để tăng độ tin cậy

Sau khi lớp tri thức này đủ chất lượng và đủ rộng, mới cân nhắc chuyển sang Hybrid Retrieval với vector search.
```

Nếu bạn muốn, mình có thể làm tiếp bước sau cho bạn:

- **rút gọn bản này thành văn phong ngắn gọn, giống tài liệu nội bộ hơn**, hoặc
- **biến nó thành version “đã chốt để triển khai” với checklist kỹ thuật rõ ràng hơn**.