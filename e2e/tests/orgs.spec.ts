import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Orgs surface", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, "/orgs");
  });

  test("shows Organizations heading and directory", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^organizations$/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/every company and account/i)).toBeVisible();
    await expect(page.getByText("Northwind Studio")).toBeVisible();
  });

  test("navigates to org detail", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/orgs/northwind", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page.getByRole("heading", { name: /northwind studio/i, level: 1 })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible();
  });
});
