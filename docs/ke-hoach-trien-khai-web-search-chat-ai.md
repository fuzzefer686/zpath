# Kế hoạch triển khai RAG nội bộ từ Database trong 7 ngày

## 1. Mục tiêu

Xây một cơ chế **RAG nội bộ từ dữ liệu đã có trong database** cho ZPath Advisor.

Dữ liệu hiện đã được đẩy lên database, vì vậy kế hoạch này **không đi theo hướng PDF → parse → RAG** nữa. Thay vào đó, luồng chính sẽ là:

```text
Database hiện có
  -> lấy record xuống
  -> biến record thành text document
  -> chunk nếu cần
  -> tạo embedding
  -> lưu vào bảng vector
  -> retrieve theo câu hỏi
  -> đưa context vào Gemini
```

Mục tiêu MVP trong 7 ngày:
- Tận dụng dữ liệu đã có trong DB.
- Biến một số bảng quan trọng thành nguồn RAG.
- Khi user hỏi, hệ thống tìm được các record/chunk liên quan.
- Gemini trả lời dựa trên context nội bộ.
- Câu trả lời có nguồn rõ ràng từ ZPath database.
- Không thay thế structured retrieval hiện có, mà bổ sung thêm lớp RAG.

## 2. Tư duy đúng khi DB đã có dữ liệu

Không phải dữ liệu nào trong DB cũng nên đưa vào RAG.

### Dữ liệu nên query SQL trực tiếp
Các dữ liệu có cấu trúc rõ, dạng số hoặc lookup chính xác:
- điểm chuẩn
- học phí dạng số
- chỉ tiêu
- mã ngành
- mã trường
- tổ hợp xét tuyển
- năm tuyển sinh
- trạng thái published/draft

Với nhóm này, SQL chính xác hơn vector search.

### Dữ liệu phù hợp để RAG
Các dữ liệu dạng mô tả, văn bản dài, ghi chú hoặc nội dung bán cấu trúc:
- mô tả trường
- mô tả ngành
- ngành học gì
- cơ hội nghề nghiệp
- ai phù hợp với ngành này
- chính sách tuyển sinh dạng text
- ghi chú học phí
- học bổng
- FAQ tư vấn
- thông tin giới thiệu chương trình đào tạo
- nội dung tư vấn đã được chuẩn hóa

Vì vậy RAG sẽ là lớp bổ sung cho Advisor, không thay toàn bộ DB retrieval.

## 3. Kiến trúc đề xuất

```text
User question
  -> classify intent
  -> structured DB retrieval hiện có
  -> DB-to-RAG retrieval
  -> nếu cần thông tin mới nhất thì web search
  -> build grounded prompt
  -> Gemini trả lời
  -> UI hiển thị answer + internal DB sources + web sources nếu có
```

### Luồng build dữ liệu RAG từ DB

```text
Supabase tables hiện có
  -> extractor theo từng bảng
  -> serialize row thành text document
  -> chunk nếu text dài
  -> embedding
  -> advisor_rag_chunks / advisor_document_chunks
  -> retrieve top-k theo query
```

## 4. Tech stack cần dùng

### Backend / database
- **Next.js API routes**
- **Supabase Postgres**
- **pgvector**
- **Supabase server client** hiện có trong project
- SQL migration cho bảng vector

### AI / embedding
- **Gemini / Vertex AI** cho answer generation
- **Vertex AI embeddings** hoặc embedding model tương thích Google
- **@google/genai** đang có trong project

### Code tổ chức
- TypeScript service trong `lib/advisor/rag/`
- Tận dụng pipeline hiện có trong `app/api/advisor/answer/route.ts`
- Tận dụng prompt builder hiện có trong `lib/advisor/prompts.ts`
- Tận dụng source UI hiện có trong `components/advisor/SourceList.tsx`

### Không cần trong MVP này
- PDF parser
- OCR
- upload tài liệu
- dashboard quản trị tài liệu
- crawler
- reranker model riêng

## 5. Thiết kế dữ liệu RAG

Có thể dùng tên bảng mới rõ nghĩa hơn, ví dụ:

### Bảng `advisor_rag_sources`
Lưu nguồn dữ liệu được serialize từ DB.

Gợi ý cột:
- `id`
- `source_table`
- `source_record_id`
- `source_type`
- `title`
- `school_code`
- `school_name`
- `major_name`
- `program_code`
- `document_year`
- `content_hash`
- `status`
- `created_at`
- `updated_at`

### Bảng `advisor_rag_chunks`
Lưu chunk và embedding.

Gợi ý cột:
- `id`
- `source_id`
- `chunk_index`
- `chunk_text`
- `embedding vector(...)`
- `metadata jsonb`
- `created_at`

### Metadata bắt buộc nên có

```json
{
  "source": "zpath_database",
  "table": "majors",
  "recordId": "...",
  "schoolCode": "HUST",
  "schoolName": "Đại học Bách khoa Hà Nội",
  "majorName": "Khoa học máy tính",
  "programCode": "IT1",
  "year": 2026,
  "docType": "major_profile"
}
```

Metadata quan trọng vì nó giúp:
- filter theo trường/ngành/năm
- debug retrieval
- hiển thị source trong UI
- tránh lấy nhầm trường hoặc nhầm năm

## 6. Cách serialize DB row thành RAG text

Ví dụ với hồ sơ ngành/chương trình:

```text
Loại dữ liệu: Hồ sơ ngành
Trường: Đại học Bách khoa Hà Nội
Mã trường: HUST
Ngành: Khoa học máy tính
Mã chương trình: IT1
Năm: 2026
Nhóm ngành: Công nghệ thông tin
Mô tả: ...
Ngành này học gì: ...
Cơ hội nghề nghiệp: ...
Phù hợp với học sinh: ...
Nguồn: ZPath database
```

Ví dụ với hồ sơ trường:

```text
Loại dữ liệu: Hồ sơ trường
Tên trường: Đại học Ngoại thương
Mã trường: FTU
Khu vực: Hà Nội
Thế mạnh: kinh tế, kinh doanh quốc tế, logistics
Mô tả: ...
Website tuyển sinh: ...
Nguồn: ZPath database
```

Ví dụ với dữ liệu tuyển sinh dạng text:

```text
Loại dữ liệu: Chính sách tuyển sinh
Trường: Đại học X
Năm: 2026
Phương thức xét tuyển: ...
Điều kiện phụ: ...
Quy đổi chứng chỉ: ...
Lưu ý: ...
Nguồn: ZPath database
```

## 7. Bảng dữ liệu nên ưu tiên đưa vào RAG

Ưu tiên theo thứ tự:

### Ưu tiên 1 — Ngành/chương trình
Dùng cho câu hỏi:
- ngành này học gì
- ngành này ra làm gì
- ngành này hợp với ai
- so sánh hai ngành
- ngành nào phù hợp với em

### Ưu tiên 2 — Trường
Dùng cho câu hỏi:
- trường này mạnh về gì
- môi trường học thế nào
- trường này hợp với kiểu học sinh nào
- so sánh hai trường

### Ưu tiên 3 — Tuyển sinh dạng mô tả
Dùng cho câu hỏi:
- phương thức xét tuyển
- điều kiện phụ
- quy đổi chứng chỉ
- lưu ý hồ sơ

### Ưu tiên 4 — Học phí/học bổng dạng text
Dùng cho câu hỏi:
- chính sách học phí
- học bổng
- hỗ trợ tài chính
- ghi chú tăng học phí

## 8. Kế hoạch triển khai theo ngày

## Ngày 1 — Rà schema DB và chọn nguồn RAG đầu tiên

### Việc cần làm
- Xem các bảng hiện có mà Advisor đang dùng.
- Chọn 2-3 nguồn đầu tiên để RAG.
- Ưu tiên bảng ngành/chương trình và trường.
- Xác định cột nào đưa vào text, cột nào chỉ đưa vào metadata.
- Chốt tên bảng vector và metadata format.

### Output mong muốn
- Có mapping rõ:

```text
bảng nguồn -> loại document RAG -> field text -> field metadata
```

Ví dụ:

```text
majors/programs -> major_profile -> name, description, career, fit -> schoolCode, programCode, year
schools -> school_profile -> description, strengths, location -> schoolCode, region
admission_data -> admission_policy -> methods, conditions, notes -> schoolCode, year
```

---

## Ngày 2 — Viết DB extractor và serializer

### Việc cần làm
- Tạo folder `lib/advisor/rag/`.
- Viết type chung cho RAG source/chunk.
- Viết extractor đọc dữ liệu từ Supabase.
- Viết serializer biến mỗi row thành text document.
- Gắn metadata cho từng document.

### Output mong muốn
- Có function dạng:

```text
buildRagDocumentsFromDatabase()
```

hoặc chia nhỏ:

```text
buildMajorRagDocuments()
buildSchoolRagDocuments()
buildAdmissionRagDocuments()
```

---

## Ngày 3 — Tạo embedding và lưu vector

### Việc cần làm
- Tạo migration bật `pgvector` nếu chưa có.
- Tạo bảng `advisor_rag_sources` và `advisor_rag_chunks`.
- Viết service tạo embedding cho text.
- Viết script hoặc API nội bộ để ingest DB rows vào bảng RAG.
- Dùng `content_hash` để tránh embed lại record không đổi.

### Output mong muốn
- Chạy ingest được từ DB sang bảng RAG.
- Mỗi chunk có embedding.
- Log được số source/chunk đã tạo.

---

## Ngày 4 — Xây retrieval top-k

### Việc cần làm
- Tạo embedding cho câu hỏi user.
- Query vector similarity trong Postgres.
- Filter theo metadata nếu có:
  - schoolCode
  - majorName
  - programCode
  - year
  - docType
- Trả về top 4-8 chunks.
- Log score và metadata để debug.

### Output mong muốn
- Có function:

```text
retrieveAdvisorRagContext(question, extractedEntities)
```

- Test được bằng câu hỏi thật và xem chunk trả về.

---

## Ngày 5 — Gắn vào Advisor API

### Việc cần làm
- Sửa `app/api/advisor/answer/route.ts`.
- Sau structured internal retrieval, gọi thêm RAG retrieval.
- Merge RAG context vào `internalContext` hoặc truyền riêng vào prompt.
- Đưa source RAG vào `buildAdvisorPromptSources`.
- Giới hạn số chunk để prompt không quá dài.

### Output mong muốn
- Advisor bắt đầu trả lời dựa trên DB RAG.
- Trong development debug thấy:
  - `usedRagRetrieval`
  - `ragChunkCount`
  - `ragTopSources`

---

## Ngày 6 — Hiển thị nguồn và kiểm soát câu trả lời

### Việc cần làm
- Sửa `SourceList` nếu cần để hiển thị nguồn `zpath_database` rõ hơn.
- Hiển thị title/source table/record/source type.
- Prompt yêu cầu Gemini không bịa nếu RAG không có dữ liệu.
- Thêm warning khi retrieval yếu hoặc không có chunk phù hợp.

### Output mong muốn
- Người dùng thấy câu trả lời lấy từ nguồn nội bộ nào.
- Có thể debug câu trả lời dựa trên chunk nào.

---

## Ngày 7 — Test, chỉnh chất lượng, demo MVP

### Việc cần làm
- Chuẩn bị 15-20 câu hỏi test.
- Test các nhóm:
  - câu hỏi có dữ liệu trong DB
  - câu hỏi gần đúng tên trường/ngành
  - câu hỏi không có dữ liệu
  - câu hỏi cần web search hơn là RAG
- Chỉnh serializer/chunk/filter.
- Chỉnh prompt để câu trả lời bớt bịa.
- Ghi lại limitation hiện tại.

### Output mong muốn
- Có demo end-to-end:

```text
User hỏi
  -> Advisor retrieve structured DB
  -> Advisor retrieve RAG chunks từ DB
  -> Gemini trả lời có nguồn
```

## 9. 7 ngày tới tôi sẽ làm gì

### Ngày 1: Tôi sẽ kiểm kê database
- Mở các hàm retrieval hiện có trong `lib/advisor/retrieval/internal.ts`.
- Ghi lại các bảng đang dùng cho school, major, admission, tuition.
- Chọn tối đa 2 nguồn để làm trước.
- Không chọn quá nhiều bảng.

Kết quả cuối ngày:
- Một danh sách bảng/cột sẽ đưa vào RAG.

---

### Ngày 2: Tôi sẽ biến dữ liệu DB thành text
- Viết serializer cho từng loại dữ liệu.
- Mỗi row DB biến thành một đoạn text dễ đọc.
- Không embed ngay, chỉ in/log output để kiểm tra.

Kết quả cuối ngày:
- Có text document từ DB thật.

---

### Ngày 3: Tôi sẽ tạo bảng vector và ingest thử
- Tạo migration pgvector.
- Tạo bảng RAG source/chunk.
- Tạo embedding cho một nhóm dữ liệu nhỏ.
- Lưu vào Supabase.

Kết quả cuối ngày:
- DB có chunk + embedding đầu tiên.

---

### Ngày 4: Tôi sẽ làm search nội bộ bằng vector
- Viết hàm retrieve top-k.
- Hỏi thử 5-10 câu.
- Kiểm tra chunk trả về có đúng không.

Kết quả cuối ngày:
- Một câu hỏi có thể lấy ra context liên quan từ DB.

---

### Ngày 5: Tôi sẽ gắn RAG vào Advisor
- Gọi retrieval trong `/api/advisor/answer`.
- Đưa context RAG vào prompt Gemini.
- Thêm debug log.

Kết quả cuối ngày:
- Chat Advisor trả lời dựa trên context RAG.

---

### Ngày 6: Tôi sẽ làm nguồn hiển thị rõ hơn
- Hiện nguồn nội bộ trong câu trả lời.
- Kiểm tra answer có dẫn nguồn đúng không.
- Thêm warning nếu không tìm thấy context.

Kết quả cuối ngày:
- User biết câu trả lời dựa trên dữ liệu nào.

---

### Ngày 7: Tôi sẽ test và chốt MVP
- Chuẩn bị bộ câu hỏi test.
- Ghi lại câu nào đúng/sai.
- Chỉnh serializer/chunk/filter.
- Chốt version demo.

Kết quả cuối ngày:
- Có một MVP RAG từ DB chạy được, dù chưa hoàn thiện.

## 10. File cần tạo hoặc sửa

### Tạo mới
- `lib/advisor/rag/types.ts`
- `lib/advisor/rag/serialize.ts`
- `lib/advisor/rag/embedding.ts`
- `lib/advisor/rag/ingest.ts`
- `lib/advisor/rag/retrieve.ts`
- migration tạo bảng RAG + pgvector

### Sửa
- `app/api/advisor/answer/route.ts`
- `lib/advisor/prompts.ts`
- `lib/advisor/gemini.ts`
- `components/advisor/AdvisorAnswer.tsx` nếu cần
- `components/advisor/SourceList.tsx` nếu cần

## 11. Prompt strategy

Khi đưa RAG context vào Gemini, prompt cần nói rõ:

- Context RAG là dữ liệu nội bộ của ZPath.
- Ưu tiên context nội bộ khi có liên quan.
- Nếu context không đủ, không được bịa.
- Nếu có web search và RAG mâu thuẫn, ưu tiên nguồn chính thức mới hơn.
- Nếu chỉ có dữ liệu tổng quát, trả lời với confidence thấp hơn.

Ví dụ tinh thần:

```text
Dưới đây là các đoạn dữ liệu nội bộ đã được truy xuất từ ZPath database.
Chỉ sử dụng chúng nếu liên quan trực tiếp đến câu hỏi.
Nếu không đủ dữ liệu, hãy nói rõ phần nào chưa có dữ liệu.
```

## 12. Lưu ý quan trọng

### 1) Không thay SQL bằng vector search
Nếu cần số liệu chính xác, vẫn dùng SQL retrieval trước.

### 2) Không embed mọi thứ
Chỉ embed các field có giá trị ngữ nghĩa.

### 3) Metadata quan trọng hơn bạn nghĩ
Thiếu metadata sẽ khiến retrieve nhầm trường/ngành/năm.

### 4) Bắt đầu nhỏ
Tuần đầu chỉ cần 1-2 nguồn dữ liệu là đủ.

### 5) Cần content hash
Nếu record không đổi, không cần embed lại.

### 6) Cần fallback
Nếu RAG không có kết quả tốt, Advisor vẫn dùng structured retrieval và web search như hiện tại.

## 13. Tiêu chí hoàn thành MVP

MVP đạt nếu:
- Dữ liệu DB được serialize thành text.
- Text được embed và lưu vào vector table.
- Câu hỏi user retrieve được top-k chunks.
- Advisor dùng chunks đó để trả lời.
- UI/source cho biết dữ liệu đến từ ZPath database.
- Khi không có context phù hợp, hệ thống không bịa quá mức.

## 14. Rủi ro

- DB nhiều dữ liệu nhưng field text nghèo, retrieval không tốt.
- Tên trường/ngành không đồng nhất khiến filter sai.
- Embedding tốn chi phí nếu ingest lại nhiều lần.
- Prompt quá dài nếu đưa quá nhiều chunk.
- Query vector thiếu filter gây lấy nhầm kết quả.

## 15. Kết luận

Vì dữ liệu đã nằm trong database, hướng đúng trong 7 ngày là:

```text
DB -> serialize -> embedding -> vector search -> Advisor Gemini
```

Không làm PDF ingestion trong MVP này.

Mục tiêu không phải xây RAG hoàn hảo, mà là có một bản chạy được:
- lấy dữ liệu thật từ DB
- biến thành context
- trả lời có nguồn
- có thể debug và cải thiện dần.
