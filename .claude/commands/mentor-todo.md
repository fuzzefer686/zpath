---
description: Backlog còn lại của feature /mentor (Phase 9–10) — gọi để tiếp tục build
---

Tiếp tục hoàn thiện feature `/mentor` (chat tư vấn). Đọc memory `mentor-feature-architecture` trước để nắm kiến trúc (custom auth, RLS service-role, RPC SECURITY DEFINER, realtime Broadcast, harness chặn DB push nên user tự `supabase db push`).

**Đã xong:** Phase 0–8 đầy đủ + rate limiting (30/p user, 100/p mentor) + spam guard (flag → ẩn khỏi học sinh & pool).

**Backlog còn lại — chọn mục `$ARGUMENTS` nếu có, không thì hỏi user ưu tiên mục nào:**

Phase 9 (notifications & polish):
1. **Email notify** khi mentor reply mà user offline > 5 phút — cần Resend/Supabase Edge Function + cron. (Hạ tầng ngoài, hỏi user về Resend API key.)
2. **Web push** cho mentor khi có tin mới ở pool (Notification API).
3. **Typing indicator** qua Supabase Realtime Presence (tái dùng lib/supabase/realtime.ts, không cần DB).
4. **Empty states** đẹp hơn + **mobile polish** (kiểm tra input không bị keyboard che).

Phase 10 (testing & edge cases):
5. **E2E tests** (Playwright): user flow gửi→nhận reply; mentor flow anonymous/named/claim; upload file.
6. **Edge: mentor bị deactivate** (is_active=false) — named threads của họ thành read-only cho user + banner; tin mới route về pool.
7. **Edge: user xoá account** — soft-delete/anonymize, giữ messages cho mentor.
8. **Pagination** khi thread > 1000 tin (load older on scroll).
9. **Tối ưu signed URL**: hiện `listMessages` tạo signed URL mỗi lần fetch cho mọi attachment — cache hoặc giảm tần suất khi thread dài.
10. **Auto-close** conversation sau 30 ngày không hoạt động (status='closed', cron/Edge Function).
11. **Audit log identity** (table `mentor_identity_changes`) — Phase 8.4 đã hoãn.

Với mục cần migration: viết file trong supabase/migrations/ rồi nhắc user chạy `npx supabase db push` (harness chặn agent push). Sau mỗi mục: tsc + eslint sạch, smoke test, cập nhật memory.
