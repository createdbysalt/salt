import { test, expect } from '@playwright/test'

test.use({ storageState: './fixtures/auth.json' })

/**
 * E2E: Work requests (legacy /spaces entry redirects to /work)
 */
test.describe('Work requests - Velocity Strategy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spaces')
    await page.waitForLoadState('networkidle')
  })

  test('authenticated user can access work after spaces redirect', async ({ page }) => {
    const url = page.url()
    if (url.includes('/signin') || url.includes('/login')) {
      test.skip(true, 'Auth required — run auth.setup first')
    }

    await expect(page).toHaveURL(/\/work\/?$/)
    await expect(page.getByRole('main')).toBeVisible()
  })

  test('request-related UI is discoverable when present', async ({ page }) => {
    const url = page.url()
    if (url.includes('/signin') || url.includes('/login')) {
      test.skip(true, 'Auth required')
    }

    const newRequestButtons = page.getByRole('button', {
      name: /new request|create request|submit request/i,
    })
    const count = await newRequestButtons.count()

    if (count === 0) {
      test.skip(true, 'No request UI on current Work view')
    }

    await expect(newRequestButtons.first()).toBeVisible()
  })
})
