# ZPATH Project Rules for Claude/Cursor

## Tech Stack
- Framework: Next.js 16+ (App Router, Turbopack).
- Styling: Tailwind CSS (Utility-first).
- Icons: Lucide-React.
- Animations: Framer Motion.
- Database/Auth: Supabase.

## Coding Standards
- Luôn sử dụng TypeScript với định nghĩa Type/Interface rõ ràng.
- Sử dụng Functional Components và Arrow Functions.
- Ưu tiên tối đa việc tách Logic ra Custom Hooks trong thư mục `/hooks`.
- Giao diện phải tương thích Mobile-first.

## Database & Migrations
- Không được hướng dẫn người dùng sửa DB trực tiếp trên UI của Supabase Cloud.
- Luôn ưu tiên sử dụng Supabase CLI và tạo file migration khi có thay đổi Schema.

## Tone & Language
- Phản hồi và giải thích code bằng tiếng Việt.
- Comment trong code bằng tiếng Anh theo chuẩn ngành.

# ZPath — Context cho coding agent

## Đọc trước
- Spec đầy đủ: `zpath-cv-profile-feature-plan.md`. Luôn đọc đúng section (§) được nêu trong task.

## Engineering philosophy (BẮT BUỘC)
- Correctness over speed. Configuration over hardcoding. Normalized schema. RLS-first.
- Reuse dữ liệu sẵn có: catalog chứng chỉ, transcript, UniMap — KHÔNG nhân bản.
- AI explainability: mọi recommendation có `rationale`. AI KHÔNG bịa credential.
- Render CV bằng engine deterministic (react-pdf default). KHÔNG dùng Vertex AI để render. KHÔNG bật External renderer.

## Bảo mật & pháp lý (BẮT BUỘC — Luật 91/2025 + NĐ 356/2025)
- Mặc định CV private. Mọi "công bố" (share) là opt-in có cảnh báo.
- User <16: chặn share; hạn chế/không gửi PII cross-border (§13.7 lớp 6).
- Trước MỌI call AI: đi qua sanitizer de-identify (§13.7 lớp 1) + gateway server-side (lớp 2).
- Artifact PII nặng (file render, snapshot share, payload cross-border) luôn ephemeral ≤ 30 phút (§13.8).

## Quy tắc làm việc
- Mỗi task: làm đúng phạm vi, KHÔNG tự mở rộng. Xong thì DỪNG, báo cáo file đã đổi + cách test, CHỜ confirm.
- Viết test kèm cho task có logic. Không commit secret/API key.