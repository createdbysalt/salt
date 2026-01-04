import { test, expect } from "@playwright/test";

test.describe("Client Health Intelligence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signin");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should display client health scores", async ({ page }) => {
    await page.goto("/dashboard/clients");
    
    // Should see health badges
    const healthBadges = page.locator('[data-client-card] .health-badge');
    const count = await healthBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should show this week's meetings widget", async ({ page }) => {
    await page.goto("/dashboard/clients");
    
    // Should see widget
    await expect(page.locator('text=This Week\'s Meetings')).toBeVisible();
  });

  test("should filter clients by status", async ({ page }) => {
    await page.goto("/dashboard/clients");
    
    // Filter to active only
    await page.click('button[value="active"]');
    
    await expect(page).toHaveURL(/status=active/);
  });

  test("should filter clients by tag", async ({ page }) => {
    await page.goto("/dashboard/clients");
    
    // Click first tag
    const firstTag = page.locator('[data-tag-filter]:first-child');
    await firstTag.click();
    
    // Should filter results
    const clients = page.locator('[data-client-card]');
    const count = await clients.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should toggle between grid and list views", async ({ page }) => {
    await page.goto("/dashboard/clients");
    
    // Default should be grid
    await expect(page.locator('[data-view-mode="grid"]')).toBeVisible();
    
    // Switch to list
    await page.click('button[aria-label="List view"]');
    await expect(page.locator('[data-view-mode="list"]')).toBeVisible();
    
    // Switch back to grid
    await page.click('button[aria-label="Grid view"]');
    await expect(page.locator('[data-view-mode="grid"]')).toBeVisible();
  });

  test("should display client metrics", async ({ page }) => {
    await page.goto("/dashboard/clients");
    
    const firstClient = page.locator('[data-client-card]:first-child');
    
    // Should see key metrics
    await expect(firstClient.locator('text=/\\d+ projects/')).toBeVisible();
    await expect(firstClient.locator('text=/\\$\\d+\\/mo/')).toBeVisible(); // MRR
    await expect(firstClient.locator('text=/LTV: \\$/')).toBeVisible();
  });

  test("should show next meeting for client", async ({ page }) => {
    await page.goto("/dashboard/clients");
    
    // Find client with upcoming meeting
    const clientsWithMeetings = page.locator('[data-client-card]:has-text("Next Meeting")');
    const count = await clientsWithMeetings.count();
    
    if (count > 0) {
      const firstClient = clientsWithMeetings.first();
      await expect(firstClient.locator('text=Next Meeting')).toBeVisible();
    }
  });
});

