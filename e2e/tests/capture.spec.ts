import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

const CAPTURES_URL = "/plays?tab=activity&view=captures";

test.describe("Plays Activity — Captures", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, CAPTURES_URL);
  });

  test("shows Captures view with ledger and search", async ({ page }) => {
    await expect(
      page.getByRole("navigation", { name: "Plays sections" }),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("navigation", { name: "Activity views" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Captures" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^captures$/i, level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/today's capture ledger/i)).toBeVisible();
    await expect(page.getByPlaceholder(/search captures/i)).toBeVisible();
  });

  test("Activity views switch between Actions and Captures", async ({ page }) => {
    const views = page.getByRole("navigation", { name: "Activity views" });
    await views.getByRole("button", { name: "Actions" }).click();
    await expect(page.getByRole("heading", { name: /^activity$/i, level: 2 })).toBeVisible({
      timeout: 15_000,
    });

    await views.getByRole("button", { name: "Captures" }).click();
    await expect(page.getByRole("heading", { name: /^captures$/i, level: 2 })).toBeVisible();
  });

  test("/capture redirects to Plays Captures", async ({ page }) => {
    await gotoAppRoute(page, "/capture");
    await expect(page).toHaveURL(/\/plays\?tab=activity&view=captures/);
  });
});
