import { createHmac } from "crypto";
import fs from "fs";
import path from "path";

import { test as base, type BrowserContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Minimal .env.local loader (Playwright does not auto-load it). Only fills vars
// that are not already set in the process environment.
// ---------------------------------------------------------------------------
function loadDotEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2] ?? "";
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnvLocal();

// ---------------------------------------------------------------------------
// Resolve the cookie-signing secret exactly like lib/zpath-auth.getJwtSecret():
// prefer AUTH_JWT_SECRET (>=32 chars), else fall back to the service-role key.
// ---------------------------------------------------------------------------
function resolveSecret(): string | null {
  const explicit = process.env.AUTH_JWT_SECRET?.trim();
  if (explicit && explicit.length >= 32) return explicit;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback && fallback.length >= 32) return fallback;
  return null;
}

export interface E2EEnv {
  userId: string;
  secret: string;
  username: string;
  email: string;
}

/** Returns the E2E config, or null when prerequisites are missing (→ skip). */
export function e2eEnv(): E2EEnv | null {
  const userId = process.env.E2E_USER_ID?.trim();
  const secret = resolveSecret();
  if (!userId || !secret) return null;
  return {
    userId,
    secret,
    username: process.env.E2E_USERNAME?.trim() || "e2e_user",
    email: process.env.E2E_EMAIL?.trim() || "e2e@zpath.vn",
  };
}

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

/** Mint a valid zpath_auth JWT (header.payload.HMAC) — mirrors createAuthToken. */
export function mintAuthToken(env: E2EEnv): string {
  const header = b64url({ alg: "HS256", typ: "JWT" });
  const payload = b64url({
    sub: env.userId,
    username: env.username,
    role: "user",
    email: env.email,
    phone: "",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  });
  const body = `${header}.${payload}`;
  const sig = createHmac("sha256", env.secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

// ---------------------------------------------------------------------------
// Fixtures: `env` (or null) and `authedContext` — a browser context carrying a
// freshly-minted zpath_auth cookie for the seeded E2E user.
// ---------------------------------------------------------------------------
type Fixtures = {
  env: E2EEnv | null;
  authedContext: BrowserContext;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  env: async ({}, use) => {
    await use(e2eEnv());
  },
  authedContext: async ({ browser, baseURL }, use) => {
    const env = e2eEnv();
    test.skip(!env, "Set E2E_USER_ID + AUTH_JWT_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to run authed E2E.");
    const url = new URL(baseURL ?? "http://localhost:3001");
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "zpath_auth",
        value: mintAuthToken(env!),
        domain: url.hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        secure: url.protocol === "https:",
      },
    ]);
    await use(context);
    await context.close();
  },
});

export const expect = test.expect;
