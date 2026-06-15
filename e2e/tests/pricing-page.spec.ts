import { test, expect } from '@playwright/test'

/**
 * /pricing is retired on production marketing — redirects to waitlist.
 */

test.describe('Pricing route redirect', () => {
  test('redirects /pricing to waitlist with source=pricing', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page).toHaveURL(/\/waitlist(\?.*source=pricing|$)/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
