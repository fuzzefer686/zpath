alter table public.exam_images
  add column if not exists exam_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exam_images_exam_code_check'
      and conrelid = 'public.exam_images'::regclass
  ) then
    alter table public.exam_images
      add constraint exam_images_exam_code_check
      check (
        exam_code is null
        or exam_code in (
          '101', '102', '103', '104', '105', '106',
          '107', '108', '109', '110', '111', '112',
          '113', '114', '115', '116', '117', '118',
          '119', '120', '121', '122', '123', '124'
        )
      );
  end if;
end $$;

create index if not exists idx_exam_images_lookup_exam_code
  on public.exam_images(route_slug, subject, document_type, exam_code, created_at desc);
