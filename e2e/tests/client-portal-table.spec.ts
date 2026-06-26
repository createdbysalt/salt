import { test, expect } from '@playwright/test'

test.use({ storageState: './fixtures/auth.json' })

/**
 * E2E: legacy /spaces URLs redirect to Work
 */
test.describe('Spaces legacy redirects - Velocity Strategy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spaces')
    await page.waitForLoadState('networkidle')
  })

  test('spaces URL redirects to work for authenticated studio user', async ({ page }) => {
    const url = page.url()

    if (url.includes('/signin') || url.includes('/login')) {
      test.skip(true, 'Auth required — run auth.setup first')
    }

    await expect(page).toHaveURL(/\/work\/?$/)
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('shows work heading or empty state', async ({ page }) => {
    const url = page.url()
    if (url.includes('/signin') || url.includes('/login')) {
      test.skip(true, 'Auth required')
    }

    const workHeading = page.getByRole('heading', { name: /^work$/i })
    const hasHeading = (await workHeading.count()) > 0

    if (hasHeading) {
      await expect(workHeading.first()).toBeVisible()
    } else {
      await expect(page.getByRole('main')).toBeVisible()
    }
  })
})
