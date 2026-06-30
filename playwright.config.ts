import { defineConfig, devices } from "@playwright/test";

/**
 * ZPath CV Builder — T23 E2E (plan §11 T22/T23).
 *
 * Assumes a dev/preview server is already running at E2E_BASE_URL
 * (default http://localhost:3001 — `npm run dev`). Auth is injected per-test by
 * minting the zpath_auth cookie (see tests/e2e/fixtures.ts); specs SKIP cleanly
 * when E2E_USER_ID + a signing secret are not configured, so the suite never
 * hard-fails in an unconfigured environment.
 *
 * Prereqs to actually run (see tests/e2e/README.md):
 *   - A seeded user in zpath_users with a cv_profiles row (full_name + DOB 16+).
 *   - env: E2E_USER_ID, and AUTH_JWT_SECRET (or SUPABASE_SERVICE_ROLE_KEY).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
