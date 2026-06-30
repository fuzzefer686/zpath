import { test, expect } from "./fixtures";

/**
 * Flagship compliance E2E (§13): a public share link must show the CV but
 * REDACT direct-contact PII, and revoking must kill the link immediately.
 *
 * Self-cleaning: the share created here is revoked at the end (and auto-expires
 * in 30 min regardless). Requires the seeded E2E user to be 16+ with a CV.
 */
test.describe("Public share link", () => {
  test("creates a share, redacts contact PII, then revokes", async ({ authedContext, browser, baseURL }) => {
    const api = authedContext.request;

    // Pull the owner's real contact PII (export-to-self is NOT redacted) so we
    // can assert those exact values never appear on the public page.
    const exportRes = await api.get("/api/cv/export");
    test.skip(exportRes.status() === 400, "Seed E2E user has no CV data to export/share.");
    expect(exportRes.ok()).toBeTruthy();
    const doc = await exportRes.json();
    const realPhone = doc?.basic?.phone as string | null;
    const realEmail = doc?.basic?.email as string | null;
    const realName = doc?.basic?.fullName as string | null;

    // Create the share (explicit consent).
    const createRes = await api.post("/api/cv/share", { data: { piiAcknowledged: true } });
    test.skip(
      createRes.status() === 403,
      "Seed E2E user is under-16 (or no DOB) — share is correctly blocked; use a 16+ user to test redaction.",
    );
    expect(createRes.ok()).toBeTruthy();
    const { token } = await createRes.json();
    expect(token).toBeTruthy();

    try {
      // Open the public link with NO auth cookie (a clean context).
      const publicCtx = await browser.newContext();
      const page = await publicCtx.newPage();
      await page.goto(`${baseURL}/share/${token}`);

      // Name (when present) survives; the watermark is shown.
      if (realName) await expect(page.locator("body")).toContainText(realName);
      await expect(page.locator("body")).toContainText("ZPath");

      // Contact PII must NOT leak.
      if (realPhone) await expect(page.locator("body")).not.toContainText(realPhone);
      if (realEmail) await expect(page.locator("body")).not.toContainText(realEmail);

      await publicCtx.close();
    } finally {
      // Revoke (cleanup) and verify the link is dead.
      const revokeRes = await api.delete("/api/cv/share");
      expect(revokeRes.ok()).toBeTruthy();
    }

    // After revoke, the public link shows the expired/unavailable notice.
    const deadCtx = await browser.newContext();
    const deadPage = await deadCtx.newPage();
    await deadPage.goto(`${baseURL}/share/${token}`);
    await expect(deadPage.locator("body")).toContainText("Liên kết không khả dụng");
    await deadCtx.close();
  });

  test("an unknown token shows the unavailable notice", async ({ browser, baseURL, env }) => {
    test.skip(!env, "Set E2E_USER_ID + secret to run E2E.");
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // 64 hex chars that do not match any issued token.
    await page.goto(`${baseURL}/share/${"a".repeat(64)}`);
    await expect(page.locator("body")).toContainText("Liên kết không khả dụng");
    await ctx.close();
  });
});
