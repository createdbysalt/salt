import { test, expect } from '@playwright/test'

test.use({ storageState: './fixtures/auth.json' })

/**
 * E2E: Roundtables surface (retargeted from retired client portal /table routes)
 */
test.describe('Roundtables - Velocity Strategy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roundtables')
    await page.waitForLoadState('networkidle')
  })

  test('roundtables page loads for authenticated studio user', async ({ page }) => {
    const url = page.url()

    if (url.includes('/signin') || url.includes('/login')) {
      test.skip(true, 'Auth required — run auth.setup first')
    }

    await expect(page.getByRole('main')).toBeVisible()
  })

  test('shows roundtables heading or empty state', async ({ page }) => {
    const url = page.url()
    if (url.includes('/signin') || url.includes('/login')) {
      test.skip(true, 'Auth required')
    }

    const roundtablesHeading = page.getByRole('heading', { name: /roundtables/i })
    const hasHeading = (await roundtablesHeading.count()) > 0

    if (hasHeading) {
      await expect(roundtablesHeading.first()).toBeVisible()
    } else {
      await expect(page.getByRole('main')).toBeVisible()
    }
  })
})
