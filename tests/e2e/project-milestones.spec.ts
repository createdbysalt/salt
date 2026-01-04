import { test, expect } from "@playwright/test";

test.describe("Project Milestones", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto("/signin");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should display project with milestones", async ({ page }) => {
    await page.goto("/dashboard/projects");
    
    // Click on first project
    await page.click('[data-project-card]:first-child');
    
    // Should see project detail page
    await expect(page).toHaveURL(/\/dashboard\/projects\//);
    
    // Should see milestones tab
    await expect(page.locator('text=Milestones')).toBeVisible();
  });

  test("should create a milestone", async ({ page }) => {
    // Navigate to a project
    await page.goto("/dashboard/projects");
    await page.click('[data-project-card]:first-child');
    
    // Click Milestones tab
    await page.click('button[role="tab"]:has-text("Milestones")');
    
    // Click Add Milestone
    await page.click('button:has-text("Add Milestone")');
    
    // Fill form
    await page.fill('input[placeholder="Milestone title"]', "Design Phase");
    await page.fill('textarea', "Complete initial designs");
    
    // Set due date
    const future = new Date();
    future.setDate(future.getDate() + 14);
    await page.fill('input[type="date"]', future.toISOString().split("T")[0]);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should see success
    await expect(page.locator('text=Milestone created')).toBeVisible();
  });

  test("should mark milestone as complete", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.click('[data-project-card]:first-child');
    await page.click('button[role="tab"]:has-text("Milestones")');
    
    // Complete first milestone
    await page.click('[data-milestone-item]:first-child button:has-text("Complete")');
    
    // Should see completed badge
    await expect(page.locator('[data-milestone-item]:first-child text=Complete')).toBeVisible();
  });

  test("should filter projects by type", async ({ page }) => {
    await page.goto("/dashboard/projects");
    
    // Filter to retainers only
    await page.click('button[value="retainer"]');
    
    // All visible projects should be retainers
    const projects = page.locator('[data-project-card]');
    const count = await projects.count();
    
    for (let i = 0; i < count; i++) {
      const project = projects.nth(i);
      await expect(project.locator('text=Hours Utilization')).toBeVisible();
    }
  });
});

