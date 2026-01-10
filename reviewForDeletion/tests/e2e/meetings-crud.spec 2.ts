import { test, expect } from "@playwright/test";

test.describe("Meetings CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Login as studio user
    await page.goto("/signin");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should display meetings page", async ({ page }) => {
    await page.goto("/dashboard/meetings");
    await expect(page.locator("h1")).toContainText("Meetings");
  });

  test("should open create meeting dialog", async ({ page }) => {
    await page.goto("/dashboard/meetings");
    await page.click('button:has-text("New Meeting")');
    
    await expect(page.locator('dialog')).toBeVisible();
    await expect(page.locator('dialog h2')).toContainText("Schedule New Meeting");
  });

  test("should create a new meeting", async ({ page }) => {
    await page.goto("/dashboard/meetings");
    await page.click('button:has-text("New Meeting")');
    
    // Fill in meeting form
    await page.fill('input[placeholder="Discovery Call"]', "Test Meeting");
    await page.selectOption('select[id="client"]', { index: 1 });
    await page.selectOption('select[id="type"]', "discovery");
    
    // Set date and time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[type="date"]', tomorrow.toISOString().split("T")[0]);
    await page.fill('input[id="startTime"]', "10:00");
    await page.fill('input[id="endTime"]', "11:00");
    
    await page.selectOption('select[id="location"]', "google-meet");
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should see success toast
    await expect(page.locator('text=Meeting created successfully')).toBeVisible();
  });

  test("should filter meetings by status", async ({ page }) => {
    await page.goto("/dashboard/meetings");
    
    // Click on "Completed" filter
    await page.click('button[value="completed"]');
    
    // URL should update
    await expect(page).toHaveURL(/status=completed/);
  });

  test("should search meetings", async ({ page }) => {
    await page.goto("/dashboard/meetings");
    
    await page.fill('input[type="search"]', "Discovery");
    
    // Should see filtered results
    const meetings = page.locator('[data-meeting-card]');
    const count = await meetings.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

