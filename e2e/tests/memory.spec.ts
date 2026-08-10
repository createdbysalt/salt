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
  test("shows Map / Activity / Customize tab bar", async ({ page }) => {
    await gotoAppRoute(page, "/memory");

    const sections = page.getByRole("navigation", { name: "Memory sections" });
    await expect(sections).toBeVisible({ timeout: 15000 });
    await expect(sections.getByRole("link", { name: "Map" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "Activity" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "Customize" })).toBeVisible();
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

    // Sources-style toolbar: search + one combined filter popover.
    await expect(
      page.getByLabel(/search what salt is watching/i),
    ).toBeVisible();
    const filterButton = page.getByRole("button", { name: /^filter$/i });
    await expect(filterButton).toBeVisible();

    // The popover groups all facets: item type, record type, date range.
    await filterButton.click();
    await expect(
      page.getByRole("button", { name: "This week" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
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

    await sections.getByRole("link", { name: "Customize" }).click();
    await expect(page).toHaveURL(/\/memory\?tab=customize/);
    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    await sections.getByRole("link", { name: "Map" }).click();
    await expect(page).toHaveURL(/\/memory$/);
    await expect(page.getByRole("heading", { name: /^memory map$/i })).toBeVisible({
      timeout: 15000,
    });
  });
});

test.describe("Memory — Customize tab", () => {
  test("?tab=rules legacy alias resolves to Customize", async ({ page }) => {
    await gotoAppRoute(page, "/memory?tab=rules");

    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("record-type pills switch docs and deep-link via ?type=", async ({ page }) => {
    await gotoAppRoute(page, "/memory?tab=customize");

    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const pills = page.getByRole("group", { name: "Record type" });
    await expect(pills.getByRole("link", { name: "People" })).toBeVisible();

    await pills.getByRole("link", { name: "Work" }).click();
    await expect(page).toHaveURL(/\/memory\?tab=customize&type=work/);

    // Deep link lands on the same doc directly.
    await gotoAppRoute(page, "/memory?tab=customize&type=meeting");
    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("the read-only defaults zone renders above the writable doc", async ({ page }) => {
    await gotoAppRoute(page, "/memory?tab=customize");

    await expect(
      page.getByRole("heading", { name: /what i look for/i }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /your customizations/i }),
    ).toBeVisible();
  });

  test("add and revert a customization entry", async ({ page }) => {
    await gotoAppRoute(page, "/memory?tab=customize&type=work");

    await expect(
      page.getByRole("heading", { name: /^customize$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const box = page.getByRole("textbox", { name: /tell salt what to look for/i });
    await expect(box).toBeVisible();

    const probe = `e2e probe: prefer morning meetings ${Date.now()}`;
    await box.fill(probe);
    await page.getByRole("button", { name: /remember this/i }).click();

    // The line lands attributed — "You added this" — with its honesty note.
    const row = page.locator("li").filter({ hasText: probe });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.getByText(/you added this/i)).toBeVisible();

    await row
      .getByRole("button", { name: /revert this customization/i })
      .click();
    await expect(page.getByText(probe)).toHaveCount(0, { timeout: 10_000 });
  });
});
