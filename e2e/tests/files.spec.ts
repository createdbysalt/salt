import { test, expect } from "@playwright/test";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Files surface", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/files");
  });

  test("shows files directory header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^files$/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: /ask salt to add/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/search files, links, people, orgs/i)).toBeVisible();
  });

  test("opens and closes preview modal from URL state", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    const rowCount = await firstRow.count();
    test.skip(rowCount === 0, "No workspace files available in this environment");

    await firstRow.click();
    await expect(page).toHaveURL(/preview=/);
    await expect(page.getByRole("button", { name: /ask salt about/i })).toBeVisible();

    await page.getByRole("button", { name: /close preview/i }).click();
    await expect(page).toHaveURL(/\/files(?:\?.*)?$/);
    await expect(page.getByRole("button", { name: /ask salt about/i })).toHaveCount(0);
  });
});
