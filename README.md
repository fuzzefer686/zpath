# 🚀 ZPATH - Nền tảng Định hướng Nghề nghiệp AI

ZPATH là ứng dụng EdTech giúp học sinh THPT khám phá bản thân và tìm kiếm lộ trình đại học phù hợp thông qua sức mạnh của AI.

## 🛠 Quy trình thiết lập (Setup) cho Dev mới
1. **Docker:** Đảm bảo đã cài và bật **Docker Desktop**.
2. **Cài đặt:** `npm install`
3. **Môi trường:** Tạo file `.env.local` (Lấy nội dung từ Tech Lead).
4. **Database:** `npx supabase start` để khởi động DB ảo.

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
