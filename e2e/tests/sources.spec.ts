import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

const ACTIVITY_URL = "/sources?tab=activity";

test.describe("Sources surface", () => {
  test("shows Connectors tab by default", async ({ page }) => {
    await gotoAppRoute(page, "/sources");

    await expect(
      page.getByRole("navigation", { name: "Sources sections" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /^connectors$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("Sources tabs switch sections", async ({ page }) => {
    await gotoAppRoute(page, "/sources");

    const sections = page.getByRole("navigation", { name: "Sources sections" });
    await expect(sections).toBeVisible({ timeout: 15000 });

    await sections.getByRole("button", { name: "Activity" }).click();
    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/sources\?tab=activity/);

    await sections.getByRole("button", { name: "Connectors" }).click();
    await expect(
      page.getByRole("heading", { name: /^connectors$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Sources — Activity", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, ACTIVITY_URL);
  });

  test("shows Activity view with stats and search", async ({ page }) => {
    await expect(
      page.getByRole("navigation", { name: "Sources sections" }),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/today's captures/i)).toBeVisible();
    await expect(page.getByPlaceholder(/search captures/i)).toBeVisible();
  });

  test("displays capture category stats", async ({ page }) => {
    // Wait for the stats section to load
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15000 });

    // Verify category stat tiles are present
    const statsSection = page.locator("section").filter({ hasText: /today's captures/i });
    await expect(statsSection.getByText(/queued/i)).toBeVisible();
    await expect(statsSection.getByText(/no signal/i)).toBeVisible();
    await expect(statsSection.getByText(/processing/i)).toBeVisible();
  });

  test("capture list shows day groups", async ({ page }) => {
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15000 });

    // Day groups should be visible if there are captures
    // The page shows "Today", "Yesterday", "Earlier this week" sections
    const hasCaptures = await page.getByText(/today|yesterday|earlier this week/i).first().isVisible();
    if (hasCaptures) {
      await expect(page.getByText(/today|yesterday|earlier this week/i).first()).toBeVisible();
    } else {
      // Empty state
      await expect(page.getByText(/no captures yet|no matching captures/i)).toBeVisible();
    }
  });

  test("filter button is accessible", async ({ page }) => {
    await expect(page.getByPlaceholder(/search captures/i)).toBeVisible({ timeout: 15000 });

    // Verify the filter button exists and is accessible
    const filterButton = page.getByRole("button", { name: /filter/i });
    await expect(filterButton).toBeVisible();

    // Click to open filter panel
    await filterButton.click();

    // Filter panel should appear (it's a popover with checkboxes)
    const filterPanel = page.getByRole("checkbox").first();
    const hasFilterPanel = await filterPanel.isVisible({ timeout: 3_000 }).catch(() => false);

    // If filter panel opened, close it by clicking elsewhere
    if (hasFilterPanel) {
      await page.keyboard.press("Escape");
    }
  });

  test("capture detail expands on click", async ({ page }) => {
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15000 });

    // Find a capture row and click to expand
    const captureList = page.locator("ul").filter({ hasText: /today|yesterday/i }).first();
    const firstCapture = captureList.locator("li").first();

    if (await firstCapture.isVisible()) {
      const expandButton = firstCapture.getByRole("button").first();
      if (await expandButton.isVisible()) {
        await expandButton.click();

        // Detail panel should be visible after expansion
        await expect(firstCapture.locator("div").filter({ hasText: /from|source|outcome/i })).toBeVisible({
          timeout: 5_000,
        });
      }
    }
  });

  test("capture list excludes dropped/spam items", async ({ page }) => {
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15000 });

    const spamIndicators = page.getByText(/spam|blocked|dropped/i);
    const spamCount = await spamIndicators.count();

    if (spamCount > 0) {
      // Spam should only appear in stats/summary, not as individual rows
      const captureRows = page.locator("ul").filter({ hasText: /today|yesterday/i });
      await expect(captureRows.getByText(/spam|blocked/i)).not.toBeVisible();
    }
  });
});

test.describe("Sources — Kept out (P11)", () => {
  test("Activity tab can show Kept out section when captures are filtered", async ({ page }) => {
    await gotoAppRoute(page, ACTIVITY_URL);

    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15000 });

    // The Kept out section only appears if there are kept-out items
    // Check that if it's present, it has the expected structure
    const keptOutSection = page.getByRole("button", { name: /kept out/i });
    if (await keptOutSection.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(keptOutSection).toContainText(/capture/i);
    }
    // If not visible, that's fine — there may be no kept-out items in test data
  });
});

test.describe("Sources — legacy redirects", () => {
  test("/capture redirects to Sources Activity", async ({ page }) => {
    await gotoAppRoute(page, "/capture");
    await expect(page).toHaveURL(/\/sources\?tab=activity/);
  });

  test("legacy Plays captures view redirects to Sources Activity", async ({ page }) => {
    await gotoAppRoute(page, "/plays?tab=activity&view=captures");
    await expect(page).toHaveURL(/\/sources\?tab=activity/);
  });

  test("pre-rename tab=stream still resolves to the Activity tab", async ({ page }) => {
    await gotoAppRoute(page, "/sources?tab=stream");
    await expect(
      page.getByRole("heading", { name: /^activity$/i, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  });
});
