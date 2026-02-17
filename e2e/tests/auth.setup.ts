import { test as setup, expect } from '@playwright/test'

const authFile = './fixtures/auth.json'

/**
 * Authenticates via the dev-login API for E2E testing.
 * Uses the test studio owner account.
 */
setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...')

  // Navigate to homepage first to verify app is running
  await page.goto('/')
  await expect(page).toHaveTitle(/Salt Core/i)

  // Use dev-login API to authenticate
  const response = await page.request.post('/api/auth/dev-login', {
    data: {
      email: 'test-studio@saltcore.dev',
      password: 'teststudio123',
    },
  })

  if (!response.ok()) {
    const error = await response.text()
    console.error('❌ Dev login failed:', error)
    console.log('💡 Make sure ENABLE_DEV_LOGIN=true is set and test users are seeded')
    console.log('   Run: pnpm dlx tsx scripts/seed-test-users.ts')
    throw new Error(`Dev login failed: ${error}`)
  }

  // Verify auth worked by navigating to studio
  await page.goto('/studio/overview')
  await page.waitForLoadState('networkidle')

  // Check if we're on the studio (not redirected to signin)
  const url = page.url()
  if (url.includes('/signin') || url.includes('/login')) {
    throw new Error('Auth failed - redirected to signin page')
  }

  console.log('✅ Authenticated as test-studio@saltcore.dev')

  // Save storage state (cookies) for other tests
  await page.context().storageState({ path: authFile })

  console.log('✅ Auth setup completed')
})