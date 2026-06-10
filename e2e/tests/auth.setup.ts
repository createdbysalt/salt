import { test as setup, expect } from '@playwright/test'
import { devLoginWithRetry } from '../utils/dev-login'
import { gotoAppRoute } from '../utils/navigation'

const authFile = './fixtures/auth.json'
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

/**
 * Authenticates via the dev-login API for E2E testing.
 * Uses the test studio owner account.
 */
setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...')

  // Navigate to homepage first to verify app is running
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await expect(page).toHaveTitle(/Salt/i)

  await devLoginWithRetry(page.request, baseURL)

  // Verify auth worked by navigating to HQ (first compile can be slow on cold start)
  await gotoAppRoute(page, '/hq')
  await expect(page).not.toHaveURL(/\/signin|\/login/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 90_000 })

  console.log('✅ Authenticated as test-studio@saltcore.dev')

  // Save storage state (cookies) for other tests
  await page.context().storageState({ path: authFile })

  console.log('✅ Auth setup completed')
})