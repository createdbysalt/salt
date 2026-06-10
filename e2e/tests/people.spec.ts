import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("People surface", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, "/people");
  });

  test("shows People heading and directory", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^people$/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/every relationship in one place/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /new person/i })).toBeVisible();
    await expect(page.getByText("Maya Chen")).toBeVisible();
  });

  test("navigates to person detail", async ({ page }) => {
    await gotoAppRoute(page, "/people/maya-chen");
    await expect(page.getByRole("heading", { name: /maya chen/i, level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible();
  });
});
