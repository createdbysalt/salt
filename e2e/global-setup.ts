import { chromium, type FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  const resolvedBaseURL =
    config.projects[0].use.baseURL ?? 'http://localhost:3000'

  console.log('🚀 Starting global setup for E2E tests...')

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(`${resolvedBaseURL}/signin`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    console.log('✅ Application is reachable')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  console.log('✅ Global setup completed')
}

export default globalSetup