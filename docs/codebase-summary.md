# Tổng quan codebase ZPATH

Tài liệu này tóm tắt trạng thái codebase hiện tại để dev mới biết hệ thống đang có những phần nào, luồng dữ liệu chính đi qua đâu và nên sửa code ở lớp nào.

## 1. Stack và cách chạy

- Framework: Next.js 16 App Router, React 19, TypeScript strict mode.
- UI: Tailwind CSS, component nội bộ trong `components/`, icon từ `lucide-react`.
- Backend: Next.js Route Handlers trong `app/api/**` và `src/app/api/**`.
- Database/Auth/Data: Supabase, migration tại `supabase/migrations/`.
- AI: Gemini qua `@google/genai` / `@google/generative-ai`, prompt và schema nằm trong `src/lib/ai/`.
- Dev server: `npm run dev`, chạy Next.js bằng webpack trên `http://localhost:3001`.

Luồng Gitflow theo `README.md`: tạo branch `feature/...` từ `develop`, code và test, push branch rồi mở PR vào `develop`.

## 2. Cấu trúc thư mục chính

- `app/`: route/page chính của sản phẩm, layout global, API routes hiện đang phục vụ advisor, auth, profile, admission, chat.
- `src/app/`: các route thuộc luồng survey/processing/result và một số API webhook/evaluation.
- `components/`: component UI dùng chung. Nhóm `components/zpath/` chứa phần lớn UI sản phẩm; `components/ui/` chứa primitive như button/input/card.
- `hooks/`: logic client-side tái sử dụng cho dashboard, profile, role và form.
- `lib/`: domain logic và server/client helper cấp app, gồm auth, profile, advisor data, scoring, Supabase helpers.
- `src/lib/`: các module mới hơn cho AI evaluation, admission engine, admission data, form normalizer và Supabase server client.
- `data/`: dữ liệu JSON/TS fallback cho ngành, trường, tin tức và advisor majors.
- `supabase/`: cấu hình local Supabase, seed và migration lịch sử.
- `docs/`: tài liệu vận hành, hiện có quy trình database tại `docs/database-workflow.md`.
- `crawler/`, `data_crawl/`, `scripts/`: công cụ crawl/seed/test dữ liệu, không phải runtime chính của app.

Lưu ý hiện tại repo có cả `app/` và `src/app/`. Khi tìm route hoặc API, cần kiểm tra cả hai cây thư mục.

## 3. Luồng sản phẩm chính

### Landing và điều hướng

- `app/layout.tsx` bọc toàn app bằng `Providers`, `Navbar`, `Footer` và `AdminSaveWidget`.
- `app/page.tsx` là trang chủ hiện tại, dẫn người dùng vào luồng khảo sát.
- Các trang sản phẩm khác gồm advisor, majorly, unimap, news, profile, dashboard, login.

### Survey, Tally và AI evaluation

Luồng khảo sát hiện tại dùng Tally làm nguồn submission:

```text
Tally submission
-> src/app/api/webhooks/tally/route.ts
-> normalizeTallyPayload()
-> survey_responses
-> evaluateCareerWithGemini()
-> calculateRanking()
-> career_evaluations
-> /processing polling
-> /result/[id]
```

Các file chính:

- `src/lib/forms/tallyNormalizer.ts`: chuẩn hoá payload Tally thành hồ sơ khảo sát.
- `src/lib/forms/tallyHiddenFields.ts`: đọc hidden fields như `session_id` và `student_ref`.
- `src/lib/ai/evaluateCareerWithGemini.ts`: gọi Gemini bằng prompt/schema ZPATH.
- `src/lib/scoring/calculateCareerScore.ts`: tính tổng điểm, phần trăm phù hợp và ranking từ output AI.
- `src/app/processing/ProcessingClient.tsx`: polling kết quả theo `session_id`.
- `src/app/api/evaluation/by-session/route.ts`: kiểm tra trạng thái evaluation theo session.
- `src/app/api/evaluation/[id]/route.ts`: trả chi tiết kết quả để render trang result.

### Advisor recommendation

Advisor là luồng gợi ý ngành dựa trên điểm, môn tự chọn, sở thích, mục tiêu nghề nghiệp và personality:

```text
Advisor form
-> app/api/recommend/route.ts
-> getAdvisorMajorsForRecommendation()
-> recommendMajors()
-> top recommendations
```

Các file chính:

- `components/zpath/AdvisorForm.tsx`, `components/zpath/AdvisorResults.tsx`: UI nhập liệu và hiển thị kết quả.
- `app/api/recommend/route.ts`: validate request và gọi scoring.
- `lib/advisor-data.ts`: lấy weights từ Supabase nếu có, fallback về `data/advisor-majors.json`.
- `lib/scoring.ts`: scoring engine advisor. Công thức tổng: academic fit, interest fit, career goal fit, personality fit.
- `lib/advisor-weight-schema.ts`: định nghĩa weight fields, default weights và clamp logic.

### Admission calculator

Admission engine tính điểm xét tuyển theo trường/phương thức:

```text
POST /api/admission/calculate
-> calculateAdmissionScore()
-> registry chọn school module
-> module tính điểm
-> evaluateAdmissionChance() nếu có benchmark
```

Các file chính:

- `app/api/admission/calculate/route.ts`: parse/validate request.
- `src/lib/admission-engine/core/types.ts`: type `SchoolCode`, `AdmissionMethod`, `AdmissionInput`, `AdmissionScoreResult`.
- `src/lib/admission-engine/core/registry.ts`: registry module trường.
- `src/lib/admission-engine/modules/hust/`: module tính điểm HUST, hiện cũng được dùng làm base cho một số school code khác.
- `src/components/admission/`: UI các section tuyển sinh.

### Auth, profile và quyền admin

- `components/zpath/AuthProvider.tsx`: context auth phía client. Hiện có cờ `AUTH_FEATURE_ENABLED = false`, nên prompt đăng nhập client đang tắt.
- `lib/zpath-auth.ts`: auth server-side bằng cookie `zpath_auth`, JWT HMAC và password hash `scrypt`.
- `app/api/auth/**`: route login, register, logout, me, role.
- `app/api/profile/survey/**`: đọc/cập nhật survey profile của user đã đăng nhập.
- `hooks/useUserRole.ts`, `app/api/auth/role/route.ts`: hỗ trợ xác định role.
- `components/zpath/AdminSaveWidget.tsx` và các component inline edit/admin apply changes hỗ trợ luồng chỉnh dữ liệu khi có quyền.

## 4. Database và dữ liệu

- Supabase local chạy theo hướng dẫn trong `README.md`.
- Migration nằm trong `supabase/migrations/`; không sửa migration đã merge, tạo migration mới để fix forward.
- `supabase/seed.sql` chứa seed local/dev.
- Nếu thay đổi schema hoặc dữ liệu persist vào Supabase, tạo migration bằng:

```bash
npx supabase db diff -f ten_mo_ta_thay_doi
```

Các nhóm bảng đang được code tham chiếu gồm:

- `survey_responses`, `career_evaluations`, `user_survey_profiles`: survey và AI evaluation.
- `zpath_users`: custom auth user.
- Advisor weights/contributions: phục vụ gợi ý ngành và đóng góp chỉnh weight.
- Admission/unimap tables: dữ liệu tuyển sinh, trường, benchmark.
- `profiles`: profile cũ dùng trong một số hook/helper legacy.

## 5. Quy ước phát triển tiếp

- Khi tạo tính năng UI mới, kiểm tra có nên tách component vào `components/` hoặc `components/zpath/` không.
- Khi thêm logic client-side có trạng thái hoặc gọi API, cân nhắc hook mới trong `hooks/`.
- Khi thêm domain logic thuần hoặc helper server/client, ưu tiên `lib/` hoặc `src/lib/` theo module đang chỉnh.
- Trước khi import thư viện mới, kiểm tra `package.json` để chắc dependency đã có.
- Không xoá hoặc ghi đè file cấu hình quan trọng như `.env.local`, `next.config.ts`, `tsconfig.json`.
- Với thay đổi DB, nhớ tạo migration và tham chiếu thêm `docs/database-workflow.md`.

## 6. Kiểm tra nhanh trước PR

- Docs-only: kiểm tra Markdown render rõ, path được nhắc còn tồn tại.
- Code/UI change: chạy tối thiểu `npm run lint` hoặc flow thủ công liên quan.
- Build/release-sensitive change: chạy `npm run build`.
- DB change: chạy Supabase local và tạo migration bằng `npx supabase db diff`.
