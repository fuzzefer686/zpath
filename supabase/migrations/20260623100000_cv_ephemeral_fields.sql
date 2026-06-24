-- =============================================================================
-- ZPath CV Builder — T11: ephemeral fields on generated_cvs (plan §13.8)
--
-- Adds the 30-minute ephemeral mechanism columns:
--   * served_at : when the rendered file was issued to the user.
--   * purge_at  : hard-delete deadline. The T12 purge job removes the row AND
--                 the Storage object when purge_at <= now().
--
-- Defaults guarantee the ephemeral invariant even if an insert path forgets to
-- set them (defense-in-depth) — the /api/cv/render route also sets them
-- explicitly. Index on purge_at lets the purge job scan due rows cheaply.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
-- =============================================================================

alter table public.generated_cvs
  add column if not exists served_at timestamptz not null default now();

alter table public.generated_cvs
  add column if not exists purge_at timestamptz not null
    default (now() + interval '30 minutes');

comment on column public.generated_cvs.served_at is
  'When the rendered CV file was issued (ephemeral mechanism, §13.8).';
comment on column public.generated_cvs.purge_at is
  'Hard-delete deadline. T12 purge job removes row + Storage object when due.';

-- Purge job scans WHERE purge_at <= now(); index keeps that scan cheap.
create index if not exists idx_generated_cvs_purge
  on public.generated_cvs(purge_at);
