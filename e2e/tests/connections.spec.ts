import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Connections surface", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, "/connections");
  });

  test("shows Connections heading and stats strip", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^connections$/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/every record across memory/i)).toBeVisible();
    await expect(page.getByRole("navigation", { name: /connections sections/i })).toBeVisible();
  });

  test("switches between Graph, Insights, and Paths tabs", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: /connections sections/i });

    await nav.getByRole("button", { name: /^graph$/i }).click();
    await expect(page.getByText(/nodes · .* links/i)).toBeVisible({ timeout: 15000 });

    await nav.getByRole("button", { name: /^insights$/i }).click();
    await expect(page.getByText(/patterns salt sees across your relationship graph/i)).toBeVisible({
      timeout: 15_000,
    });

    await nav.getByRole("button", { name: /^paths$/i }).click();
    await expect(page.getByText(/warm intro paths/i)).toBeVisible({ timeout: 15000 });
  });
});
