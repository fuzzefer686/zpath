-- ---------------------------------------------------------------------------
-- 1) Create personality_questions table
-- ---------------------------------------------------------------------------
create table public.personality_questions (
  id uuid primary key default gen_random_uuid(),
  test_slug text not null,        -- 'mbti' | 'holland' ...
  question_text text not null,
  axis text not null,             -- 'EI' | 'SN' | 'TF' | 'JP' for MBTI
  option_a text not null,
  option_b text not null,
  value_a text not null,          -- 'E', 'S', 'T', 'J'
  value_b text not null,          -- 'I', 'N', 'F', 'P'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) Enable RLS & set policies
-- ---------------------------------------------------------------------------
alter table public.personality_questions enable row level security;

drop policy if exists "public read active personality_questions" on public.personality_questions;
create policy "public read active personality_questions"
  on public.personality_questions for select
  to anon, authenticated
  using (true);

-- write: only service_role
grant select on table public.personality_questions to anon, authenticated;
grant all on table public.personality_questions to service_role;

-- ---------------------------------------------------------------------------
-- 3) Seed sample questions (MBTI 4-question test)
-- ---------------------------------------------------------------------------
insert into public.personality_questions (test_slug, question_text, axis, option_a, option_b, value_a, value_b, sort_order)
values
  ('mbti', 'Cuối tuần lý tưởng của bạn là gì?', 'EI', 'Đi chơi với hội bạn, gặp gỡ mọi người', 'Ở nhà thư giãn một mình, đọc sách hoặc xem phim', 'E', 'I', 1),
  ('mbti', 'Khi học tập hoặc làm việc, bạn thiên về điều gì hơn?', 'SN', 'Thực tế, chi tiết cụ thể và các bước thực hiện rõ ràng', 'Ý tưởng lớn, bức tranh tổng thể và các khả năng tương lai', 'S', 'N', 2),
  ('mbti', 'Khi đứng trước một quyết định quan trọng, bạn sẽ dựa vào?', 'TF', 'Logic, phân tích lý tính và sự khách quan', 'Cảm xúc cá nhân, giá trị đạo đức và sự hài hòa giữa mọi người', 'T', 'F', 3),
  ('mbti', 'Cách bạn quản lý thời gian và công việc hàng ngày?', 'JP', 'Lên kế hoạch rõ ràng, chi tiết và cố gắng bám sát nó', 'Linh hoạt, thích ứng tùy hứng và mở rộng với các thay đổi', 'J', 'P', 4)
on conflict do nothing;
