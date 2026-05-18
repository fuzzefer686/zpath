# 🚀 ZPATH - Nền tảng Định hướng Nghề nghiệp AI

ZPATH là ứng dụng EdTech giúp học sinh THPT khám phá bản thân và tìm kiếm lộ trình đại học phù hợp thông qua sức mạnh của AI.

## 🛠 Quy trình thiết lập (Setup) cho Dev mới
1. **Docker:** Đảm bảo đã cài và bật **Docker Desktop**.
2. **Cài đặt:** `npm install`
3. **Môi trường:** Tạo file `.env.local` (Lấy nội dung từ Tech Lead).
4. **Database:** `npx supabase start` để khởi động DB ảo.
5. **Chạy app:** `npm run dev` mở Next.js bằng webpack dev compiler ở `http://localhost:3001`.

> Lưu ý local: tránh dùng `curl http://localhost:3000` hoặc `curl http://127.0.0.1:3000` trên máy dev này. Dev server mặc định đã chuyển sang port `3001`; dev compiler dùng webpack vì Turbopack đang có dấu hiệu kẹt ở `Compiling / ...`, và các request Supabase có timeout để không giữ màn hình tải vô hạn khi DB/API chậm.

## 🔐 Cấu hình Auth khi deploy
- Set `NEXT_PUBLIC_SITE_URL` trên Vercel bằng domain production, ví dụ `https://zpath.vercel.app`.
- Trong Supabase Auth URL Configuration, thêm production domain vào **Site URL** và **Redirect URLs** để Google OAuth không quay về localhost.

## 📝 Cấu hình Tally MVP
- Redirect URL production trong Tally: `https://zpath.vercel.app/processing?session_id={session_id}`.
- Khi test local, nếu Tally vẫn redirect về production thì production phải được deploy bản có route `/processing`; nếu chưa deploy sẽ thấy 404 trên `zpath.vercel.app`.
- Để test hoàn toàn local, đổi Redirect URL trong Tally sang `http://localhost:3001/processing?session_id={session_id}` rồi đổi lại production trước khi release.

## 🌿 Quy trình Gitflow (Bắt buộc)
- **main:** Code sạch, ổn định (Deploy Vercel).
- **develop:** Nhánh tích hợp chính của team.
- **feature/[ten-tinh-nang]:** Nhánh làm việc cá nhân (Tách ra từ `develop`).

**Luồng làm việc:**
1. `git checkout develop` -> `git pull origin develop`.
2. `git checkout -b feature/tinh-nang-moi`.
3. Code & Test -> `git push origin feature/tinh-nang-moi`.
4. Tạo **Pull Request** gộp vào `develop`.

## 🏗 Kiến trúc dự án (Clean Architecture)
- `/components`: Chứa các mảnh ghép giao diện (UI) dùng chung.
- `/hooks`: Chứa logic xử lý dữ liệu và gọi API (Brain).
- `/app`: Chỉ dùng để lắp ráp giao diện và định tuyến trang (Assembly).
- `/supabase/migrations`: Chứa các file lịch sử thay đổi Database.

## 🗄️ Quản lý Database
Mọi thay đổi cấu trúc bảng (thêm cột, tạo bảng mới) phải được thực hiện qua lệnh:
`npx supabase db diff -f ten_mo_ta_thay_doi`
Sau đó commit file .sql sinh ra cùng với code.
