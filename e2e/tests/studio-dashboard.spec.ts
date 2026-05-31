import { test, expect } from "@playwright/test";

// Use auth state from the setup
test.use({ storageState: "./fixtures/auth.json" });

test.describe("Studio Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to studio (auth state is already loaded)
    await page.goto("/hq");
    await page.waitForLoadState("networkidle");
  });

  test("displays the four metric cards", async ({ page }) => {
    // Wait for the dashboard to load
    await page.waitForSelector('[data-slot="card"]', { timeout: 15000 });

    // Check card titles are present
    await expect(page.getByText("Revenue This Month")).toBeVisible();
    await expect(page.getByText("Active Clients")).toBeVisible();
    await expect(page.getByText("Projects In Flight")).toBeVisible();
    await expect(page.getByText("Pipeline Value")).toBeVisible();
  });

  test("displays the revenue chart with time toggles", async ({ page }) => {
    // Wait for chart to load
    await page.waitForSelector('[data-slot="card"]', { timeout: 15000 });

    // Check chart title
    await expect(page.getByText("Revenue Trend")).toBeVisible();

    // Check time range toggles exist (they're toggle items, not radios)
    const toggleGroup = page.locator('[data-slot="toggle-group"]');
    await expect(toggleGroup.getByText("Last 3 months")).toBeVisible();
    await expect(toggleGroup.getByText("Last 30 days")).toBeVisible();
    await expect(toggleGroup.getByText("Last 7 days")).toBeVisible();
  });

  test("time range toggles change the chart description", async ({ page }) => {
    // Wait for chart to load
    await page.waitForSelector('[data-slot="card"]', { timeout: 15000 });

    // Find the Revenue Trend card specifically
    const chartCard = page.locator('[data-slot="card"]').filter({ hasText: "Revenue Trend" });
    const toggleGroup = chartCard.locator('[data-slot="toggle-group"]');

    // Click "Last 30 days" toggle
    await toggleGroup.getByRole("radio", { name: "Last 30 days" }).click();

    // Description text should contain "last 30 days" (in the card description, not toggle)
    await expect(chartCard.getByText(/total for the last 30 days/i)).toBeVisible();

    // Click "Last 7 days" toggle
    await toggleGroup.getByRole("radio", { name: "Last 7 days" }).click();

    // Description should update
    await expect(chartCard.getByText(/total for the last 7 days/i)).toBeVisible();

    // Click back to "Last 3 months"
    await toggleGroup.getByRole("radio", { name: "Last 3 months" }).click();

    // Description should update
    await expect(chartCard.getByText(/total for the last 3 months/i)).toBeVisible();
  });

  test("displays recent wins section", async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-slot="card"]', { timeout: 15000 });

    // Check Recent Wins section exists
    await expect(page.getByText("Recent Wins")).toBeVisible();
  });
});
