import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

test.describe("Memory Map surface", () => {
  test("shows Memory Map heading and graph", async ({ page }) => {
    await gotoAppRoute(page, "/memory");

    await expect(page.getByRole("heading", { name: /^memory map$/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/everything salt remembers/i)).toBeVisible();
    await expect(page.getByText(/nodes · .* links/i)).toBeVisible({ timeout: 15000 });
  });

  test("legacy /connections redirects to /memory", async ({ page }) => {
    await gotoAppRoute(page, "/connections");

    await expect(page).toHaveURL(/\/memory$/);
    await expect(page.getByRole("heading", { name: /^memory map$/i })).toBeVisible({
      timeout: 15000,
    });
  });
});

test.describe("Memory surface tabs", () => {
  test("shows Map / Activity / Rules tab bar", async ({ page }) => {
    await gotoAppRoute(page, "/memory");

    const sections = page.getByRole("navigation", { name: "Memory sections" });
    await expect(sections).toBeVisible({ timeout: 15000 });
    await expect(sections.getByRole("link", { name: "Map" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "Activity" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "Rules" })).toBeVisible();
  });

  test("Activity tab shows Watching / Handled pill (P11: Kept out moved to Sources)", async ({
    page,
  }) => {
    await gotoAppRoute(page, "/memory?tab=activity");

    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const views = page.getByRole("tablist", { name: "Activity views" });
    await expect(views).toBeVisible();
    await expect(views.getByRole("tab", { name: /Watching/i })).toBeVisible();
    await expect(views.getByRole("tab", { name: /Handled/i })).toBeVisible();
  });

  test("Rules tab shows care capabilities and admission policy", async ({ page }) => {
    await gotoAppRoute(page, "/memory?tab=rules");

    await expect(
      page.getByRole("heading", { name: /^rules$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("tab links navigate between sections", async ({ page }) => {
    await gotoAppRoute(page, "/memory");

    const sections = page.getByRole("navigation", { name: "Memory sections" });
    await expect(sections).toBeVisible({ timeout: 15000 });

    await sections.getByRole("link", { name: "Activity" }).click();
    await expect(page).toHaveURL(/\/memory\?tab=activity/);
    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    await sections.getByRole("link", { name: "Rules" }).click();
    await expect(page).toHaveURL(/\/memory\?tab=rules/);
    await expect(
      page.getByRole("heading", { name: /^rules$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    await sections.getByRole("link", { name: "Map" }).click();
    await expect(page).toHaveURL(/\/memory$/);
    await expect(page.getByRole("heading", { name: /^memory map$/i })).toBeVisible({
      timeout: 15000,
    });
  });
});
