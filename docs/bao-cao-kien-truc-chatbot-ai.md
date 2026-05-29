# Báo cáo kiến trúc hiện tại của Chatbot AI ZPath

Ngày lập báo cáo: 28/05/2026

## 1. Tóm tắt điều hành

Chatbot AI hiện tại của ZPath gồm hai luồng chính:

- **Advisor chuyên sâu tại `/survey` và `/advisor`**: tiếp nhận câu hỏi tuyển sinh/hướng nghiệp, phân loại intent, trích xuất dữ kiện, lấy dữ liệu nội bộ, bổ sung web search khi cần, gọi Gemini Vertex AI để sinh câu trả lời JSON có cấu trúc, sau đó render thành giao diện trực quan.
- **AI Mentor ngắn tại `/api/chat`**: nhận câu hỏi và hồ sơ học sinh, gọi chung Gemini Vertex client để trả lời ngắn gọn.

Kiến trúc đang đi theo hướng production-ready: backend ưu tiên dữ liệu nội bộ ZPath, dùng nguồn web đáng tin cậy khi cần thông tin cập nhật, ép Gemini trả JSON theo schema ổn định, có fallback an toàn khi AI lỗi, và có cơ chế lưu hội thoại/feedback vào Supabase.

Vấn đề triển khai đáng chú ý nhất hiện nay là **credential Google Cloud AI trên Vercel**. Local dùng file service account JSON, còn Vercel không có file này. Backend đã được bổ sung cơ chế đọc service account từ biến môi trường `GOOGLE_APPLICATION_CREDENTIALS_BASE64` hoặc `GOOGLE_APPLICATION_CREDENTIALS_JSON`.

## 2. Sơ đồ kiến trúc tổng quan

```text
Người dùng
   |
   v
Frontend Advisor UI
components/advisor/AdvisorPage.tsx
   |
   | POST /api/advisor/answer
   v
Next.js API Route
app/api/advisor/answer/route.ts
   |
   +--> Validate request
   |
   +--> Classify intent + extract entities
   |    lib/advisor/classifier.ts
   |
   +--> Internal retrieval
   |    lib/advisor/retrieval/internal.ts
   |    Supabase admission/school/major/tuition tables
   |
   +--> Web search decision + query building
   |    lib/advisor/retrieval/queryBuilder.ts
   |    lib/advisor/retrieval/webSearch.ts
   |
   +--> Prompt assembly
   |    lib/advisor/prompts.ts
   |
   +--> Gemini Vertex AI
   |    lib/advisor/gemini.ts
   |    src/lib/ai/geminiVertexClient.ts
   |
   +--> JSON validation + normalization
   |
   +--> Persistence
   |    lib/advisor/persistence.ts
   |    Supabase advisor_conversations / advisor_messages / advisor_feedback
   |
   v
AdvisorAnswer JSON
   |
   v
Frontend visual rendering
components/advisor/AdvisorAnswer.tsx
components/advisor/MarkdownContent.tsx
components/advisor/SourceList.tsx
```

## 3. Thành phần chính

| Lớp | File chính | Vai trò |
|---|---|---|
| Frontend container | `components/advisor/AdvisorPage.tsx` | Quản lý câu hỏi, trạng thái loading/error, hội thoại, auto-scroll xuống output, gửi request đến API. |
| API orchestration | `app/api/advisor/answer/route.ts` | Điều phối toàn bộ pipeline: validate, classify, retrieval, web search, Gemini, fallback, persistence. |
| Intent classifier | `lib/advisor/classifier.ts` | Phân loại câu hỏi thành intent và trích xuất trường/ngành/điểm/tổ hợp/khu vực/năm/sở thích. |
| Internal retrieval | `lib/advisor/retrieval/internal.ts` | Đọc dữ liệu Supabase về trường, ngành, điểm chuẩn, học phí, tuyển sinh. |
| Web retrieval | `lib/advisor/retrieval/webSearch.ts` | Tìm nguồn web qua Gemini grounding, Tavily hoặc Serper, sau đó rank nguồn. |
| Query builder | `lib/advisor/retrieval/queryBuilder.ts` | Sinh truy vấn web theo intent, ví dụ điểm chuẩn, học phí, đề án tuyển sinh. |
| Prompt builder | `lib/advisor/prompts.ts` | Định nghĩa system prompt, schema JSON, section bắt buộc theo từng intent. |
| Gemini adapter | `lib/advisor/gemini.ts` | Gọi Gemini, parse JSON, validate schema, tạo fallback an toàn khi lỗi. |
| Vertex client | `src/lib/ai/geminiVertexClient.ts` | Cấu hình Google GenAI SDK, Vertex AI, model, credential local/Vercel. |
| Persistence | `lib/advisor/persistence.ts` | Lưu conversation, message, metadata và feedback vào Supabase. |
| Answer renderer | `components/advisor/AdvisorAnswer.tsx` | Hiển thị confidence, data status, section cards, warning, source list, follow-up và feedback. |

## 4. Luồng xử lý `/api/advisor/answer`

### 4.1 Nhận và validate request

Request được validate bởi `parseAdvisorAnswerRequest` trong `lib/advisor/schemas.ts`.

API hỗ trợ hai mode:

- `free_text`: người dùng nhập câu hỏi tự do.
- `template`: người dùng chọn mẫu câu hỏi và điền fields.

`allowWebSearch` mặc định là `true` trừ khi frontend hoặc request gửi `false`.

### 4.2 Phân loại intent và trích xuất dữ kiện

Với câu hỏi tự do, `classifyAdvisorQuestion` dùng rule-based pattern để xác định intent:

- `SCORE_SUGGESTION`
- `REVIEW_MAJOR`
- `COMPARE_MAJORS`
- `COMPARE_SCHOOLS`
- `ADMISSION_CHANCE`
- `TUITION`
- `LATEST_ADMISSION_INFO`
- `CAREER_PATH`
- `PERSONAL_FIT`
- `STUDY_PLAN`
- `GENERAL_ADVICE` hoặc `UNKNOWN`

Classifier cũng trích xuất các dữ kiện quan trọng:

- tên trường hoặc mã trường
- tên ngành
- điểm số
- tổ hợp xét tuyển
- khu vực
- năm tuyển sinh
- sở thích và nhóm lĩnh vực quan tâm

### 4.3 Lấy dữ liệu nội bộ ZPath

`getInternalContextForAdvisor` chọn hàm retrieval theo intent:

- Review ngành/career/study plan: lấy major profile hoặc search majors.
- Compare majors: lấy profile từng ngành và benchmark nếu câu hỏi hỏi điểm chuẩn.
- Compare schools: lấy profile từng trường và major nếu có.
- Admission chance: lấy admission data và benchmark scores.
- Score suggestion: gợi ý ngành/trường theo điểm và tổ hợp.
- Tuition: lấy dữ liệu học phí.
- Latest admission info: lấy school profile và admission data.
- General/personal fit: search schools và majors.

Nếu Supabase lỗi hoặc thiếu schema, pipeline không dừng hẳn. Hệ thống trả về trạng thái `error`, `unavailable` hoặc `empty`, sau đó vẫn tiếp tục web search và Gemini.

### 4.4 Quyết định web search

`tryWebSearch` quyết định có tìm web không dựa trên:

- `allowWebSearch`
- intent
- câu hỏi có yêu cầu thông tin mới nhất không
- câu hỏi có hỏi điểm chuẩn không
- trạng thái dữ liệu nội bộ
- câu hỏi rộng như “nên chọn trường/ngành nào”

Các intent ưu tiên web search gồm:

- điểm chuẩn
- tư vấn theo điểm
- học phí
- tuyển sinh mới nhất
- so sánh trường
- so sánh ngành
- review ngành khi dữ liệu nội bộ hạn chế

Provider web search được auto-detect:

1. `gemini_grounding` nếu Vertex Gemini đã cấu hình.
2. `tavily` nếu có `TAVILY_API_KEY`.
3. `serper` nếu có `SERPER_API_KEY`.
4. `none` nếu không có provider.

Kết quả web được rank để ưu tiên:

- website tuyển sinh chính thức của trường
- nguồn chính phủ/Bộ GD&ĐT
- PDF chính thức
- báo giáo dục uy tín
- loại bỏ hoặc hạ điểm nguồn SEO kém tin cậy

### 4.5 Build prompt và gọi Gemini

`buildAdvisorGeminiPrompt` ghép:

- system prompt vai trò ZPath Advisor
- contract JSON bắt buộc
- hướng dẫn theo intent
- dữ liệu đã trích xuất
- internal context
- web search results
- danh sách allowed sources

Gemini bắt buộc trả JSON theo schema:

```json
{
  "title": "string",
  "summary": "string",
  "answerType": "string",
  "confidence": "high | medium | low",
  "dataStatus": "internal_data | web_augmented | limited_data | general_advice",
  "sections": [
    {
      "heading": "string",
      "content": "string"
    }
  ],
  "warnings": ["string"],
  "sources": [
    {
      "title": "string",
      "url": "string",
      "publisher": "string",
      "accessedAt": "string",
      "sourceType": "zpath_database | official_school_site | government_site | news | other"
    }
  ],
  "followUpQuestions": ["string"]
}
```

`generateAdvisorAnswerWithGemini` dùng:

- `responseMimeType: "application/json"`
- `temperature: 0.2`
- `maxOutputTokens: 8192`

Sau khi nhận response, `validateAdvisorAnswerJson` parse JSON, chuẩn hóa sections, warnings, sources và loại source không nằm trong `allowedSources`.

### 4.6 Fallback

Fallback chỉ dùng khi Gemini thật sự lỗi:

- lỗi credential
- lỗi network
- lỗi parse JSON
- lỗi model không trả section hợp lệ

Fallback hiện tại không còn là mock cũ, nhưng vẫn báo người dùng rằng AI chưa phân tích được. Trong production, fallback là dấu hiệu cần kiểm tra logs, đặc biệt dòng:

```text
Advisor Gemini fallback:
```

Nếu log có:

```text
Could not load the default credentials
```

thì nguyên nhân là Vercel chưa nạp được Google service account.

## 5. Kiến trúc Gemini Vertex AI

File `src/lib/ai/geminiVertexClient.ts` là client dùng chung cho Advisor và Chat.

Client hiện có các trách nhiệm:

- Đảm bảo chỉ chạy server-side.
- Chọn model từ `GEMINI_MODEL`, mặc định `gemini-3.5-flash`.
- Chọn location từ `GOOGLE_CLOUD_LOCATION` hoặc `VERTEX_AI_LOCATION`, mặc định `global`.
- Dùng Vertex AI qua `GOOGLE_GENAI_USE_VERTEXAI=true`.
- Xóa `GOOGLE_API_KEY` và `GEMINI_API_KEY` để tránh chạy nhầm API key path.
- Đọc credential theo thứ tự:
  1. `GOOGLE_APPLICATION_CREDENTIALS` nếu trỏ tới file có thật.
  2. `GOOGLE_APPLICATION_CREDENTIALS_BASE64`.
  3. `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
  4. File local `gen-lang-client-0447269763-8fc0688f2b27.json`.
- Với credential từ env, ghi file tạm vào `/tmp/zpath-google-credentials.json`.
- Tự lấy `project_id` từ env hoặc từ service account JSON.

Các biến production khuyến nghị trên Vercel:

```env
GOOGLE_APPLICATION_CREDENTIALS_BASE64=...
GOOGLE_CLOUD_PROJECT=gen-lang-client-0447269763
GOOGLE_CLOUD_LOCATION=global
GEMINI_MODEL=gemini-3.5-flash
```

Không được dùng prefix `NEXT_PUBLIC_` cho credential.

## 6. Frontend rendering

Frontend Advisor hiện có các đặc điểm:

- `AdvisorPage` giữ state câu hỏi, câu trả lời, lỗi, loading, conversation id và message id.
- Khi người dùng gửi câu hỏi, UI reset answer cũ, bật loading và tự scroll xuống vùng output.
- Trong development, nếu API trả debug metadata, frontend log ra console.
- `AdvisorAnswer` render:
  - confidence badge
  - data status badge
  - title và summary lớn
  - từng section dạng card
  - warning
  - source list
  - follow-up suggestions
  - feedback
- `MarkdownContent` hỗ trợ:
  - paragraph
  - bullet/numbered list
  - markdown table
  - inline bold
  - inline code

Thiết kế này giúp Gemini có thể trả nội dung dạng markdown table trong `section.content` mà frontend vẫn render trực quan thay vì hiển thị raw markdown.

## 7. Persistence và feedback

`persistAdvisorExchange` lưu:

- conversation
- user message
- assistant message
- metadata gồm `webSearchAllowed`, `webSearchUsed`, `sourceUrls`, `confidence`, `dataStatus`

Nếu người dùng đã đăng nhập, conversation gắn với `user_id`. Nếu chưa đăng nhập, frontend tạo `anonymousId` trong localStorage.

Feedback được lưu qua `advisor_feedback`, gồm:

- message id
- rating up/down
- comment tùy chọn

## 8. Các điểm mạnh hiện tại

- Pipeline có cấu trúc rõ: classify -> retrieve -> search -> generate -> validate -> persist.
- Schema câu trả lời ổn định, frontend không phụ thuộc raw text từ model.
- Prompt đã có section strategy riêng theo intent.
- Dữ liệu nội bộ được ưu tiên trước web.
- Web search mặc định bật cho các câu hỏi cần thông tin cập nhật.
- Sources được kiểm soát bằng `allowedSources`, hạn chế Gemini bịa URL.
- Có fallback an toàn thay vì crash UI.
- Có debug metadata trong development để xác minh Gemini, internal retrieval và web search.

## 9. Rủi ro và điểm cần cải thiện

### 9.1 Credential production

Rủi ro lớn nhất là deployment thiếu Google Cloud service account. Khi đó Gemini và Gemini grounding đều lỗi, Advisor rơi vào fallback.

Khuyến nghị:

- Bắt buộc set `GOOGLE_APPLICATION_CREDENTIALS_BASE64` trên Vercel.
- Không set `GOOGLE_APPLICATION_CREDENTIALS` bằng tên file nếu file không tồn tại trên Vercel.
- Sau khi đổi env phải redeploy.
- Service account cần quyền gọi Vertex AI, tối thiểu vai trò phù hợp như Vertex AI User.

### 9.2 Coupling giữa web search và Gemini credential

Nếu provider là `gemini_grounding`, web search cũng phụ thuộc Vertex credential. Khi credential lỗi, cả generation và search đều fail.

Khuyến nghị:

- Cấu hình thêm Tavily hoặc Serper làm provider dự phòng nếu cần độ ổn định cao.
- Log rõ provider đang dùng và số kết quả web.

### 9.3 Internal retrieval phụ thuộc Supabase schema

Nếu thiếu bảng hoặc env Supabase, retrieval trả `unavailable`. Pipeline vẫn chạy nhưng chất lượng câu trả lời giảm.

Khuyến nghị:

- Theo dõi `internalResultCount` trong debug development.
- Kiểm tra đầy đủ migration admission/school/major/benchmark/tuition trước deploy.

### 9.4 Fallback vẫn hiển thị “không thể kết nối AI”

Fallback hiện đúng về mặt an toàn, nhưng nếu xuất hiện ở production thì là tín hiệu vận hành, không phải trạng thái bình thường.

Khuyến nghị:

- Sau khi credential ổn định, production không nên thường xuyên rơi vào fallback.
- Có thể bổ sung alert log khi `Advisor Gemini fallback` xuất hiện nhiều lần.

## 10. Checklist vận hành production

Trước khi deploy:

- `npm run build` pass.
- Vercel có `GOOGLE_APPLICATION_CREDENTIALS_BASE64`.
- Vercel có `GOOGLE_CLOUD_PROJECT`.
- Vercel có `GOOGLE_CLOUD_LOCATION`.
- Vercel có `GEMINI_MODEL`.
- Supabase env đã set đúng.
- Nếu dùng web search ngoài Gemini, set `WEB_SEARCH_PROVIDER` và key tương ứng.

Sau khi deploy:

- Hỏi thử câu score suggestion: “26.9 điểm A00 nên chọn trường/ngành nào ở Miền Bắc nếu em thích Công nghệ?”
- Kiểm tra câu trả lời có section đúng intent.
- Kiểm tra sources có nguồn nội bộ hoặc web.
- Kiểm tra Vercel logs không còn `Could not load the default credentials`.
- Nếu có fallback, đọc dòng `Advisor Gemini fallback:` để xác định lỗi thật.

## 11. Kết luận

Kiến trúc chatbot AI hiện tại đã vượt qua mức mock đơn giản và có đầy đủ các lớp cần thiết cho một advisor production: hiểu intent, lấy dữ liệu nội bộ, dùng web search có kiểm soát, gọi Gemini Vertex AI, validate JSON, render trực quan, lưu hội thoại và nhận feedback.

Ưu tiên kỹ thuật tiếp theo nên là ổn định credential production trên Vercel, bổ sung quan sát lỗi Gemini/web search, và đảm bảo Supabase admission dataset đủ sâu để câu trả lời có nhiều dữ liệu cụ thể hơn.
