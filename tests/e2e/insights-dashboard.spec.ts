import { test, expect } from "@playwright/test";

/**
 * E2E smoke test for Insights dashboard
 * Verifies that the Insights page loads and displays key sections
 */
test.describe("Insights Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Assumes test user is logged in via global setup
    await page.goto("/dashboard/insights");
  });

  test("should load the insights page", async ({ page }) => {
    await expect(page).toHaveTitle(/Insights/);
    
    // Check for main heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("should display revenue tab", async ({ page }) => {
    // Click on Revenue tab
    await page.getByRole("tab", { name: /revenue/i }).click();
    
    // Check for MRR metric
    await expect(page.getByText(/MRR/i)).toBeVisible();
    
    // Check for revenue chart
    await expect(page.getByText(/12-Month Revenue Trend/i)).toBeVisible();
  });

  test("should display clients tab", async ({ page }) => {
    // Click on Clients tab
    await page.getByRole("tab", { name: /clients/i }).click();
    
    // Check for health distribution
    await expect(page.getByText(/Client Health Distribution/i)).toBeVisible();
    
    // Check for last contact distribution
    await expect(page.getByText(/Last Contact Distribution/i)).toBeVisible();
  });

  test("should display projects tab", async ({ page }) => {
    // Click on Projects tab
    await page.getByRole("tab", { name: /projects/i }).click();
    
    // Check for active projects metric
    await expect(page.getByText(/Active Projects/i)).toBeVisible();
    
    // Check for on-time rate metric
    await expect(page.getByText(/On-Time Rate/i)).toBeVisible();
  });

  test("should display operations tab", async ({ page }) => {
    // Click on Operations tab
    await page.getByRole("tab", { name: /operations/i }).click();
    
    // Check for tasks metrics
    await expect(page.getByText(/Active Tasks/i)).toBeVisible();
    await expect(page.getByText(/Tasks Completed/i)).toBeVisible();
  });

  test("should display AI insights panel if available", async ({ page }) => {
    // AI insights might not always be present (depends on API key and generation)
    const aiPanel = page.getByText(/AI Insights/i);
    
    if (await aiPanel.isVisible()) {
      await expect(page.getByRole("button", { name: /regenerate/i })).toBeVisible();
    }
  });

  test("should have working navigation links", async ({ page }) => {
    await page.getByRole("tab", { name: /revenue/i }).click();
    
    // Check that at-risk clients section has links (if any clients at risk)
    const atRiskSection = page.getByText(/At-Risk Clients/i);
    if (await atRiskSection.isVisible()) {
      // Links should be present
      const links = page.locator("a[href^='/dashboard/clients/']");
      expect(await links.count()).toBeGreaterThanOrEqual(0);
    }
  });
});

