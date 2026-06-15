# Cấp tài khoản Mentor

Mentor là một tài khoản ZPath bình thường (`public.zpath_users`) được gắn thêm một dòng trong `public.mentor_profiles`. Năng lực mentor nằm ở `mentor_profiles`, **độc lập** với `zpath_users.role` (admin/user).

> Bảo mật: `mentor_profiles` bị khoá RLS service-role-only. Mọi thao tác cấp quyền phải chạy bằng `SUPABASE_SERVICE_ROLE_KEY` (script/server), **không** sửa trực tiếp trên UI Supabase Cloud.

## Cách 1 — Seed mentor test (local/dev)

```bash
npx tsx scripts/seed-mentors.ts
```

Tạo sẵn 2 mentor test: `mentor_lead` (role `lead_mentor`) và `mentor_one` (role `mentor`), mật khẩu `Mentor@12345`.

## Cách 2 — Cấp mentor cho một tài khoản đã tồn tại

Lead/admin chạy SQL sau (qua migration hoặc psql với service role). Thay `<username>`, `<display_name>`, `<role>`:

```sql
insert into public.mentor_profiles (user_id, display_name, role, show_identity_default, is_active)
select id, '<display_name>', '<role>', false, true
from public.zpath_users
where username_normalized = lower('<username>')
on conflict (user_id) do update
set display_name = excluded.display_name,
    role = excluded.role,
    is_active = true;
```

`role` hợp lệ: `mentor`, `lead_mentor`, `admin`.

## Vô hiệu hoá mentor

```sql
update public.mentor_profiles set is_active = false
where user_id = (select id from public.zpath_users where username_normalized = lower('<username>'));
```

Khi `is_active = false`, [getMentorContext](../lib/auth/requireMentor.ts) trả null → mentor mất quyền vào `/mentor/dashboard` và mọi API mentor.

## Mentor tự chỉnh hồ sơ

Sau khi được cấp quyền, mentor đăng nhập và vào `/mentor/dashboard/settings` để sửa `display_name`, `avatar_url`, `bio`, và `show_identity_default` (qua `PUT /api/mentor/profile`).
