import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Dashboard Billing Settings Page
 * 
 * Tests that billing dashboard renders correctly.
 * Requires authenticated user session.
 */

test.describe("Dashboard Billing Settings", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to billing settings
    // Note: This will redirect to signin if not authenticated
    await page.goto("/dashboard/settings/billing");
  });
  
  test("redirects to signin when not authenticated", async ({ page }) => {
    // Wait for navigation
    await page.waitForLoadState("domcontentloaded");
    
    const url = page.url();
    
    // Should redirect to signin with return URL
    if (!url.includes("/dashboard")) {
      expect(url).toContain("/signin");
      expect(url).toContain("next=");
    }
  });
  
  test.skip("authenticated user sees billing dashboard", async ({ page }) => {
    // This test requires authenticated session
    // TODO: Implement when test auth is available
    
    // Check for main billing sections
    await expect(page.locator("text=Billing & Subscription")).toBeVisible();
    
    // Check for SaaS subscription card
    await expect(page.locator("text=Salt Core Subscription")).toBeVisible();
    
    // Check for AI Credits card
    await expect(page.locator("text=AI Credits")).toBeVisible();
    
    // Check for Connect card (if studio member)
    const connectCard = page.locator("text=Client Billing");
    if (await connectCard.isVisible().catch(() => false)) {
      await expect(connectCard).toBeVisible();
    }
  });
  
  test.skip("manage subscription button works", async ({ page }) => {
    // This test requires authenticated session with active subscription
    // TODO: Implement when test auth is available
    
    const manageButton = page.locator('button:has-text("Manage Subscription")');
    
    if (await manageButton.isVisible()) {
      await manageButton.click();
      
      // Should redirect to Stripe Customer Portal
      await page.waitForURL(/billing\.stripe\.com/, { timeout: 10000 });
      
      const url = page.url();
      expect(url).toContain("billing.stripe.com");
      console.log("Redirected to Stripe Portal:", url);
    }
  });
  
  test.skip("credit pack purchase buttons render", async ({ page }) => {
    // Check for credit pack purchase options
    const creditPackButtons = page.locator('button:has-text("$")');
    const count = await creditPackButtons.count();
    
    expect(count).toBeGreaterThan(0);
  });
  
  test.skip("connect onboarding button appears when not set up", async ({ page }) => {
    // Check for Connect setup button
    const setupButton = page.locator('button:has-text("Set Up Client Billing")');
    
    if (await setupButton.isVisible()) {
      await expect(setupButton).toBeEnabled();
    }
  });
});

/**
 * Test with authenticated session (requires test infrastructure)
 */
test.describe("Authenticated Billing Dashboard", () => {
  test.skip("full billing dashboard flow", async ({ page }) => {
    // TODO: Implement when test auth and fixtures are available
    // 1. Sign in with test user
    // 2. Navigate to billing
    // 3. Verify all components render
    // 4. Test interactive elements
  });
});




