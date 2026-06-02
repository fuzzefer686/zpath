ALTER TABLE public.zpath_users
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_normalized text,
  ADD COLUMN IF NOT EXISTS auth_provider text NOT NULL DEFAULT 'password',
  ADD COLUMN IF NOT EXISTS google_sub text,
  ADD COLUMN IF NOT EXISTS google_email text,
  ADD COLUMN IF NOT EXISTS google_avatar_url text;

ALTER TABLE public.zpath_users
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zpath_users_phone_normalized
  ON public.zpath_users (phone_normalized)
  WHERE phone_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS zpath_users_google_sub_key
  ON public.zpath_users (google_sub)
  WHERE google_sub IS NOT NULL;

ALTER TABLE public.zpath_users
  DROP CONSTRAINT IF EXISTS zpath_users_auth_provider_check;

ALTER TABLE public.zpath_users
  ADD CONSTRAINT zpath_users_auth_provider_check
  CHECK (auth_provider IN ('password', 'google'));
