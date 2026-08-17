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

  test("Activity tab shows Auto-handled / Watching pill (P11: Kept out moved to Sources)", async ({
    page,
  }) => {
    await gotoAppRoute(page, "/memory?tab=activity");

    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const views = page.getByRole("tablist", { name: "Activity views" });
    await expect(views).toBeVisible();
    await expect(
      views.getByRole("tab", { name: /Auto-handled/i }),
    ).toBeVisible();
    await expect(views.getByRole("tab", { name: /Watching/i })).toBeVisible();

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

  test("Auto-handled lane renders the applied-writes feed (or its honest empty state)", async ({
    page,
  }) => {
    await gotoAppRoute(page, "/memory?tab=activity");

    const views = page.getByRole("tablist", { name: "Activity views" });
    await views.getByRole("tab", { name: /Auto-handled/i }).click();

    // Either real salt_learnings rows or the empty state — never a crash.
    const empty = page.getByText(/nothing handled yet/i);
    const rows = page.getByRole("list");
    await expect(empty.or(rows.first())).toBeVisible({ timeout: 15000 });
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
      page.getByRole("heading", { name: /^people records$/i, level: 2 }),
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
      page.getByText("Customize what Salt remembers"),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /^people records$/i, level: 2 }),
    ).toBeVisible();
  });

  test("record-type switcher changes docs and deep-links via ?type=", async ({
    page,
  }) => {
    await gotoAppRoute(page, "/memory?tab=customize");

    await expect(
      page.getByRole("heading", { name: /^people records$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const switcher = page.getByRole("combobox", { name: "Record type" });
    await expect(switcher).toBeVisible();
    await switcher.click();
    await page.getByRole("option", { name: "Work" }).click();
    await expect(page).toHaveURL(/\/memory\?tab=customize&type=work/);
    await expect(
      page.getByRole("heading", { name: /^work records$/i, level: 2 }),
    ).toBeVisible();

    // Deep link lands on the same doc directly.
    await gotoAppRoute(page, "/memory?tab=customize&type=meeting");
    await expect(
      page.getByRole("heading", { name: /^meeting records$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("the read-only logic zone renders beside the writable doc", async ({
    page,
  }) => {
    await gotoAppRoute(page, "/memory?tab=customize");

    await expect(
      page.getByRole("heading", { name: /the logic i run on/i }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /what i'll remember/i }),
    ).toBeVisible();
  });

  test("add and revert a customization entry", async ({ page }) => {
    await gotoAppRoute(page, "/memory?tab=customize&type=work");

    await expect(
      page.getByRole("heading", { name: /^work records$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    const box = page.getByRole("textbox", { name: /tell salt what to remember/i });
    await expect(box).toBeVisible();

    const probe = `e2e probe: prefer morning meetings ${Date.now()}`;
    await box.fill(probe);
    await page.getByRole("button", { name: /remember this/i }).click();

    // The line lands attributed — "You wrote this".
    const row = page.locator("li").filter({ hasText: probe });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.getByText(/you wrote this/i)).toBeVisible();

    await row.getByRole("button", { name: /remove this line/i }).click();
    await expect(page.getByText(probe)).toHaveCount(0, { timeout: 10_000 });
  });

  test("Me is a full Customize scope with suggestion-tier fields", async ({
    page,
  }) => {
    await gotoAppRoute(page, "/memory?tab=customize&type=me");

    await expect(
      page.getByRole("heading", { name: /^me record$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });

    // Zone 1 renders Me fields live from the registry: suggestable fields
    // are "I suggest", legal/tax stays "Yours".
    const logic = page.getByRole("complementary");
    await expect(
      logic.getByRole("heading", { name: /the logic i run on/i }),
    ).toBeVisible();
    await expect(
      logic.getByRole("button", { name: /timezone i suggest/i }),
    ).toBeVisible();
    await expect(
      logic.getByRole("button", { name: /tax id type yours/i }),
    ).toBeVisible();

    // Tell Salt + revert round-trip on the Me scope.
    const box = page.getByRole("textbox", { name: /tell salt what to remember/i });
    const probe = `e2e probe: my tagline stays on proposals ${Date.now()}`;
    await box.fill(probe);
    await page.getByRole("button", { name: /remember this/i }).click();

    const row = page.locator("li").filter({ hasText: probe });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.getByText(/you wrote this/i)).toBeVisible();

    await row.getByRole("button", { name: /remove this line/i }).click();
    await expect(page.getByText(probe)).toHaveCount(0, { timeout: 10_000 });
  });
});
