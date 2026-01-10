import { test, expect } from "@playwright/test";

// These tests assume a test client user is set up in the database
// Update these values based on your test environment
const TEST_CLIENT_EMAIL = "client@example.com";
const TEST_CLIENT_PASSWORD = "testpassword123";

test.describe("Bridge Client Portal - Widget System", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Bridge login
    await page.goto("/bridge/login");
  });

  test("should display Bridge Overview with default widgets", async ({
    page,
  }) => {
    // Navigate to Bridge
    await page.goto("/bridge");
    await page.waitForLoadState("networkidle");

    // Verify welcome message widget
    await expect(page.locator("h1")).toContainText(
      /Good (Morning|Afternoon|Evening)/
    );

    // Verify Quick Actions widget exists
    await expect(page.getByText("Quick Actions")).toBeVisible();

    // Verify at least one quick action button
    await expect(
      page.getByRole("link", { name: /New Request/i })
    ).toBeVisible();

    // Verify Project Status widget (or empty state)
    await expect(
      page.getByText(/Your Projects|No projects yet/i)
    ).toBeVisible();

    // Verify Recent Activity widget
    await expect(page.getByText("Recent Activity")).toBeVisible();

    // Verify Knowledge Base widget
    await expect(page.getByText("Knowledge Base")).toBeVisible();
  });

  test("should navigate from Overview to Requests via Quick Actions", async ({
    page,
  }) => {
    await page.goto("/bridge");
    await page.waitForLoadState("networkidle");

    // Click Quick Actions New Request button
    await page.getByRole("link", { name: /New Request/i }).click();

    // Should navigate to requests page
    await expect(page).toHaveURL(/\/bridge\/requests/);
  });

  test("should navigate from Overview to Files via Quick Actions", async ({
    page,
  }) => {
    await page.goto("/bridge");
    await page.waitForLoadState("networkidle");

    // Click Quick Actions Knowledge Base button
    await page.getByRole("link", { name: /Knowledge Base/i }).click();

    // Should navigate to files page
    await expect(page).toHaveURL(/\/bridge\/files/);
  });

  test("should display project cards if projects exist", async ({ page }) => {
    await page.goto("/bridge");
    await page.waitForLoadState("networkidle");

    // Check if projects section exists
    const projectsSection = page.getByText("Your Projects");
    await expect(projectsSection).toBeVisible();

    // If projects exist, verify at least one project card
    const projectCard = page.locator('[href*="/bridge/projects/"]').first();
    const hasProjects = await projectCard.isVisible().catch(() => false);

    if (hasProjects) {
      // Verify project card has required elements
      await expect(projectCard).toBeVisible();
    } else {
      // Verify empty state
      await expect(page.getByText("No projects yet")).toBeVisible();
    }
  });

  test("should display Needs Attention widget appropriately", async ({
    page,
  }) => {
    await page.goto("/bridge");
    await page.waitForLoadState("networkidle");

    // Needs Attention widget should exist (either with alerts or "All caught up")
    const needsAttention = page.getByText(
      /Needs Your Attention|All caught up/i
    );
    await expect(needsAttention).toBeVisible();
  });

  test("should load Overview page within reasonable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/bridge");
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // Overview should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("should allow client login and see projects", async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', TEST_CLIENT_EMAIL);
    await page.fill('input[type="password"]', TEST_CLIENT_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to Bridge home
    await page.waitForURL("/bridge");

    // Should see navigation
    await expect(page.locator("text=Overview")).toBeVisible();
    await expect(page.locator("text=Requests")).toBeVisible();
    await expect(page.locator("text=Knowledge Base")).toBeVisible();
    await expect(page.locator("text=Settings")).toBeVisible();

    // Should see projects section
    await expect(page.locator("text=Your Projects")).toBeVisible();
  });

  test("should submit a new request", async ({ page }) => {
    // Navigate to requests page
    await page.goto("/bridge/requests");

    // Click new request button
    await page.click("text=New Request");

    // Fill out form
    await page.fill(
      'input[placeholder*="Brief description"]',
      "Test request title"
    );
    await page.fill(
      'textarea[placeholder*="Provide more details"]',
      "Test request description"
    );

    // Submit
    await page.click('button:has-text("Submit Request")');

    // Should see success message
    await expect(
      page.locator("text=Request submitted successfully")
    ).toBeVisible({
      timeout: 5000,
    });

    // Should see the request in the list
    await expect(page.locator("text=Test request title")).toBeVisible();
  });

  test("should upload a file", async ({ page }) => {
    await page.goto("/bridge/files");

    // Click upload button
    await page.click("text=Upload File");

    // Select file (create a test file buffer)
    const fileContent = "Test file content";
    await page.setInputFiles('input[type="file"]', {
      name: "test-file.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(fileContent),
    });

    // Select category
    await page.click('role=combobox[name="Category"]');
    await page.click("text=Brand Asset");

    // Submit
    await page.click('button:has-text("Upload")');

    // Should see success message
    await expect(
      page.locator("text=File uploaded successfully")
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("should view project details", async ({ page }) => {
    await page.goto("/bridge");

    // Click on a project (if available)
    const projectLinks = page.locator('a[href^="/bridge/projects/"]');
    const projectCount = await projectLinks.count();

    if (projectCount > 0) {
      await projectLinks.first().click();

      // Should be on project detail page
      await expect(page).toHaveURL(/\/bridge\/projects\/.+/);

      // Should see project info
      await expect(page.locator("text=Back to Projects")).toBeVisible();
    }
  });
});
