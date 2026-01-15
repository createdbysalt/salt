import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use

  console.log('🚀 Starting global setup for E2E tests...')

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Navigate to the application
    await page.goto(baseURL || 'http://localhost:3000')
    console.log('✅ Application is reachable')

    // For now, just verify the app loads
    // TODO: Add actual authentication setup when we migrate real tests
    await page.waitForLoadState('networkidle')

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  console.log('✅ Global setup completed')
}

export default globalSetup