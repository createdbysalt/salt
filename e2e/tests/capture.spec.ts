import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Capture surface", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, "/capture");
  });

  test("shows queue tab and review controls", async ({ page }) => {
    await expect(
      page.getByRole("navigation", { name: "Capture sections" })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("heading", { name: /capture queue/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /confirm & route/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /add capture/i })).toBeVisible();
  });

  test("Capture tabs switch sections", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Capture sections" });
    await nav.getByRole("button", { name: "Stream" }).click();
    await expect(page.getByRole("heading", { name: /^stream$/i, level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/today's capture ledger/i)).toBeVisible();

    await page.getByRole("button", { name: "Queue" }).click();
    await expect(page.getByRole("heading", { name: /capture queue/i })).toBeVisible();
  });
});
