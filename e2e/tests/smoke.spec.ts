import { test, expect } from '@playwright/test'

test.describe('Velocity E2E Workspace - Smoke Test', () => {
  test('app loads successfully', async ({ page }) => {
    await page.goto('/')

    // Use semantic locator pattern (velocity strategy)
    await expect(page).toHaveTitle(/SALT/i)

    // Verify page loads without errors
    await page.waitForLoadState('networkidle')

    console.log('✅ New E2E workspace is working!')
  })

  test('demonstrates semantic locator pattern', async ({ page }) => {
    await page.goto('/')

    // This is how we'll write all tests in the velocity strategy:
    // ✅ Use getByRole, getByLabel, getByText (semantic locators)
    // ❌ Don't use CSS selectors or XPath

    // Look for common navigation elements using semantic locators
    // (These will fail until we migrate real tests, which is expected)
    const hasNavigation = await page.getByRole('navigation').isVisible().catch(() => false)
    const hasMainContent = await page.getByRole('main').isVisible().catch(() => false)

    console.log(`Navigation found: ${hasNavigation}`)
    console.log(`Main content found: ${hasMainContent}`)

    // Just verify the page doesn't crash
    expect(await page.title()).toBeTruthy()
  })
})