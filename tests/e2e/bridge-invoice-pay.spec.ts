import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Bridge Invoice Payment Flow
 * 
 * Tests tokenized invoice links and payment redirect.
 * Requires test invoice tokens and Stripe test mode.
 */

test.describe("Bridge Invoice Payment", () => {
  // These tests require a valid test invoice token
  // In a real scenario, you'd generate this via API or fixture
  const TEST_TOKEN = "test_token_placeholder";
  
  test("expired token shows expired page", async ({ page }) => {
    // Navigate directly to expired page
    await page.goto(`/invoices/${TEST_TOKEN}/expired`);
    
    // Check for expired message
    await expect(page.locator("text=Link Expired")).toBeVisible();
    await expect(page.locator("text=payment link has expired")).toBeVisible();
    
    // Check for help text
    await expect(page.locator("text=Contact the studio")).toBeVisible();
  });
  
  test("success page renders correctly", async ({ page }) => {
    // Navigate to success page (simulating return from Stripe)
    await page.goto(`/invoices/${TEST_TOKEN}/success?session_id=test_session_123`);
    
    // Check for success indicators (if page loads without redirect)
    // Note: actual page might redirect if token is invalid
    await page.waitForLoadState("domcontentloaded");
    
    const url = page.url();
    console.log("Success page URL:", url);
    
    // If we're still on the success page, verify content
    if (url.includes("/success")) {
      // Look for success indicators
      const successIndicators = [
        "Payment Successful",
        "Payment Processing",
        "Thank you",
      ];
      
      let foundIndicator = false;
      for (const indicator of successIndicators) {
        const locator = page.locator(`text=${indicator}`);
        if (await locator.isVisible().catch(() => false)) {
          foundIndicator = true;
          break;
        }
      }
      
      // At least one success indicator should be present
      expect(foundIndicator).toBe(true);
    }
  });
  
  test.skip("valid invoice token shows payment form", async ({ page }) => {
    // This test requires a real test invoice with valid token
    // Skip unless test infrastructure provides fixtures
    
    // Navigate to invoice page with valid token
    await page.goto(`/invoices/${TEST_TOKEN}`);
    
    // Check for invoice details
    await expect(page.locator("text=Amount Due")).toBeVisible();
    
    // Check for Pay Now button
    const payButton = page.locator('button:has-text("Pay Now")');
    await expect(payButton).toBeVisible();
    
    // Click pay button
    await payButton.click();
    
    // Should redirect to Stripe Checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 });
    
    const url = page.url();
    expect(url).toContain("checkout.stripe.com");
    console.log("Redirected to Stripe Checkout:", url);
  });
  
  test.skip("paid invoice shows read-only state", async ({ page }) => {
    // This test requires an invoice that's already paid
    // Skip unless test infrastructure provides paid invoice fixture
    
    await page.goto(`/invoices/${TEST_TOKEN}`);
    
    // Check for paid badge
    await expect(page.locator("text=Paid")).toBeVisible();
    
    // Pay button should not be present or be disabled
    const payButton = page.locator('button:has-text("Pay Now")');
    await expect(payButton).not.toBeVisible();
  });
});

/**
 * Test with DB fixtures (requires test database setup)
 */
test.describe("Bridge Invoice with Fixtures", () => {
  test.skip("invoice page with fixture data", async ({ page }) => {
    // TODO: Implement when test fixtures are available
    // 1. Create test invoice in DB
    // 2. Generate valid token
    // 3. Test full flow including payment redirect
    // 4. Clean up test data
  });
});




