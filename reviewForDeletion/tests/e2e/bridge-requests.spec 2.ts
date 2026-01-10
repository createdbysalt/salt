import { test, expect } from "@playwright/test";

test.describe("Client Requests via Bridge", () => {
  test.beforeEach(async ({ page }) => {
    // Login as client user
    await page.goto("/bridge/login");
    await page.fill('input[type="email"]', "client@example.com");
    await page.fill('input[type="password"]', "clientpass");
    await page.click('button[type="submit"]');
    await page.waitForURL("/bridge");
  });

  test("should submit a client request", async ({ page }) => {
    await page.goto("/bridge/requests");
    
    // Click New Request
    await page.click('button:has-text("New Request")');
    
    // Fill form
    await page.fill('input[placeholder="Request title"]', "Need logo update");
    await page.fill('textarea', "Please update our logo to match the new brand colors");
    await page.selectOption('select[id="priority"]', "high");
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should see success
    await expect(page.locator('text=Request submitted')).toBeVisible();
  });

  test("studio should see client request as task", async ({ page }) => {
    // First submit request as client
    await page.goto("/bridge/requests");
    await page.click('button:has-text("New Request")');
    await page.fill('input[placeholder="Request title"]', "Test Request");
    await page.fill('textarea', "Test description");
    await page.click('button[type="submit"]');
    
    // Logout and login as studio
    await page.goto("/signout");
    await page.goto("/signin");
    await page.fill('input[type="email"]', "studio@example.com");
    await page.fill('input[type="password"]', "studiopass");
    await page.click('button[type="submit"]');
    
    // Go to tasks
    await page.goto("/dashboard/tasks");
    
    // Should see client request
    await expect(page.locator('text=Test Request')).toBeVisible();
    await expect(page.locator('text=Client Request')).toBeVisible();
  });

  test("should request meeting reschedule", async ({ page }) => {
    await page.goto("/bridge");
    
    // Find upcoming meeting
    await page.click('[data-meeting-card]:first-child');
    
    // Click reschedule
    await page.click('button:has-text("Request Reschedule")');
    
    // Fill reason
    await page.fill('textarea', "Conflict with another meeting");
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should see success
    await expect(page.locator('text=Request submitted')).toBeVisible();
  });
});

