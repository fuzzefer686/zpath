import { test, expect } from "./fixtures";

/**
 * CV "Chia sẻ & xuất CV" panel (T21/T22 UI). Verifies the consent gate (no link
 * without explicit consent) and the export-to-self JSON download.
 */
test.describe("CV share panel", () => {
  test.beforeEach(async ({ authedContext }) => {
    // Ensure the consent gate is shown (not the active-link view).
    await authedContext.request.delete("/api/cv/share");
  });

  test("consent gate: create button is disabled until consent is checked", async ({ authedContext }) => {
    const page = await authedContext.newPage();
    await page.goto("/profile");

    const heading = page.getByText("Chia sẻ & xuất CV", { exact: false });
    await expect(heading).toBeVisible({ timeout: 20_000 });

    const createBtn = page.getByRole("button", { name: /Tạo liên kết chia sẻ/ });
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeDisabled();

    // Consent → button becomes enabled.
    await page.getByRole("checkbox").first().check();
    await expect(createBtn).toBeEnabled();

    await page.close();
  });

  test("export-to-self downloads a JSON file", async ({ authedContext }) => {
    const page = await authedContext.newPage();
    await page.goto("/profile");

    const exportBtn = page.getByRole("button", { name: /Tải CV dạng JSON/ });
    await expect(exportBtn).toBeVisible({ timeout: 20_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportBtn.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    await page.close();
  });
});
