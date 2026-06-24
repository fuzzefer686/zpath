# ZPath E2E (Playwright) — T23

End-to-end tests for the CV Builder share/export flow (plan §11, §13).

## What is covered

| Spec | Flow |
|---|---|
| `public-share.spec.ts` | Create share → open public link with **no auth** → assert name shown, **contact PII (phone/email/address) redacted**, watermark present → **revoke** → link shows "Liên kết không khả dụng". Unknown token → unavailable. |
| `cv-share-panel.spec.ts` | Consent gate: "Tạo liên kết chia sẻ" stays **disabled until consent is checked**. Export-to-self downloads a `.json` file. |

The suite is **self-cleaning** (every share it creates is revoked; shares also auto-expire in 30 min). It **skips cleanly** when prerequisites are missing — it never hard-fails an unconfigured environment.

## Prerequisites

1. **A running app** at `E2E_BASE_URL` (default `http://localhost:3001`):
   ```bash
   npm run dev
   ```
   > Note: the dev server talks to whatever `SUPABASE_URL` points at. Prefer a **local or staging** Supabase (`supabase start`) over production for E2E.

2. **A seeded test user** in `zpath_users` that has a `cv_profiles` row with `full_name`, a 16+ `date_of_birth`, and contact fields (`phone`/`email`/`address`) set — so redaction is observable.

3. **Environment variables** (read from `.env.local` or the shell):
   - `E2E_USER_ID` — the seeded user's UUID (required).
   - `AUTH_JWT_SECRET` (≥32 chars) **or** `SUPABASE_SERVICE_ROLE_KEY` — the cookie-signing secret (must match the server's).
   - Optional: `E2E_USERNAME`, `E2E_EMAIL`, `E2E_BASE_URL`.

Auth is injected by **minting the `zpath_auth` cookie** directly (see `fixtures.ts`) — no login UI needed.

## Run

```bash
npx playwright install chromium   # one-time: download the browser
npm run test:e2e                  # headless
npm run test:e2e:ui               # interactive UI mode
```

If `E2E_USER_ID` / secret are not set, authed specs are reported as **skipped** (with the reason), not failed.
