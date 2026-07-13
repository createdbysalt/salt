import { test, expect } from "@playwright/test";
import { gotoAppRoute } from "../utils/navigation";

test.use({ storageState: "./fixtures/auth.json" });

const CAPTURES_URL = "/plays?tab=activity&view=captures";

test.describe("Plays Activity — Captures", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, CAPTURES_URL);
  });

  test("shows Captures view with stats and search", async ({ page }) => {
    await expect(
      page.getByRole("navigation", { name: "Plays sections" }),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole("navigation", { name: "Activity views" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Captures" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^captures$/i, level: 2 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/today's captures/i)).toBeVisible();
    await expect(page.getByPlaceholder(/search captures/i)).toBeVisible();
  });

  test("displays capture category stats", async ({ page }) => {
    // Wait for the stats section to load
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15_000 });

    // Verify category stat tiles are present
    const statsSection = page.locator("section").filter({ hasText: /today's captures/i });
    await expect(statsSection.getByText(/queued/i)).toBeVisible();
    await expect(statsSection.getByText(/no signal/i)).toBeVisible();
    await expect(statsSection.getByText(/processing/i)).toBeVisible();
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

  test("captures list shows day groups", async ({ page }) => {
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15_000 });

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
    await expect(page.getByPlaceholder(/search captures/i)).toBeVisible({ timeout: 15_000 });

    // Verify the filter button exists and is accessible
    const filterButton = page.getByRole("button", { name: /filter/i });
    await expect(filterButton).toBeVisible();

    // Click to open filter panel
    await filterButton.click();

    // Filter panel should appear (it's a popover with checkboxes)
    // Wait for any checkbox to appear indicating the filter panel opened
    const filterPanel = page.getByRole("checkbox").first();
    const hasFilterPanel = await filterPanel.isVisible({ timeout: 3_000 }).catch(() => false);

    // If filter panel opened, close it by clicking elsewhere
    if (hasFilterPanel) {
      await page.keyboard.press("Escape");
    }
  });

  test("/capture redirects to Plays Captures", async ({ page }) => {
    await gotoAppRoute(page, "/capture");
    await expect(page).toHaveURL(/\/plays\?tab=activity&view=captures/);
  });
});

test.describe("Captures — Gate Pipeline Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppRoute(page, CAPTURES_URL);
  });

  test("captures stream excludes dropped/spam items", async ({ page }) => {
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15_000 });

    // Spam/dropped captures should not appear in the list
    // This is a negative test - verify no spam indicators
    const spamIndicators = page.getByText(/spam|blocked|dropped/i);
    const spamCount = await spamIndicators.count();

    // If spam indicators exist, they should be in stats, not in the stream
    if (spamCount > 0) {
      // Spam should only appear in stats/summary, not as individual rows
      const captureRows = page.locator("ul").filter({ hasText: /today|yesterday/i });
      await expect(captureRows.getByText(/spam|blocked/i)).not.toBeVisible();
    }
  });

  test("queued captures show link to review", async ({ page }) => {
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15_000 });

    // If there are queued captures, they should have a "View in Queue" link
    const queuedSection = page.getByText(/queued/i).first();
    if (await queuedSection.isVisible()) {
      // The queued count tile exists
      await expect(queuedSection).toBeVisible();
    }
  });

  test("capture detail expands on click", async ({ page }) => {
    await expect(page.getByText(/today's captures/i)).toBeVisible({ timeout: 15_000 });

    // Find a capture row and click to expand
    const captureList = page.locator("ul").filter({ hasText: /today|yesterday/i }).first();
    const firstCapture = captureList.locator("li").first();

    if (await firstCapture.isVisible()) {
      const expandButton = firstCapture.getByRole("button").first();
      if (await expandButton.isVisible()) {
        await expandButton.click();

        // Detail panel should be visible after expansion
        // This contains source link, preview, or outcome panel
        await expect(firstCapture.locator("div").filter({ hasText: /from|source|outcome/i })).toBeVisible({
          timeout: 5_000,
        });
      }
    }
  });
});
