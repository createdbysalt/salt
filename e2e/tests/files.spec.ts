import { test, expect } from "@playwright/test";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Resources surface", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/resources");
  });

  test("shows resources directory header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^resources$/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: /add resource/i }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/search resources, links, people, orgs/i),
    ).toBeVisible();
  });

  test("opens and closes preview modal from URL state", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    const rowCount = await firstRow.count();
    test.skip(rowCount === 0, "No workspace resources available in this environment");

    await firstRow.click();
    await expect(page).toHaveURL(/preview=/);
    const previewAskSalt = page
      .getByRole("dialog")
      .getByRole("button", { name: /^ask salt$/i });
    await expect(previewAskSalt).toBeVisible();

    await page.getByRole("button", { name: /close preview/i }).click();
    await expect(page).toHaveURL(/\/resources(?:\?.*)?$/);
    await expect(previewAskSalt).toHaveCount(0);
  });

  test("legacy /files redirects to /resources", async ({ page }) => {
    await page.goto("/files");
    await expect(page).toHaveURL(/\/resources(?:\?.*)?$/);
  });
});
