import path from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const repoRoot = path.join(__dirname, '..')

/** Local E2E needs Supabase secrets — plain `pnpm dev` 500s without .env.local keys. */
const devServerCommand = process.env.CI
  ? 'pnpm dev'
  : 'pnpm dev:op'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60 * 1000,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    navigationTimeout: 60 * 1000,
  },

  // Run setup before all tests
  globalSetup: require.resolve('./global-setup.ts'),

  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      timeout: 300 * 1000,
    },

    // Public / unauthenticated flows (no auth setup dependency)
    {
      name: 'public',
      testMatch: /product-auth-gate\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Authenticated tests
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './fixtures/auth.json',
      },
      dependencies: ['setup'],
    },

    // Future: Firefox and Safari
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     storageState: './fixtures/auth.json',
    //   },
    //   dependencies: ['setup'],
    // },
  ],

  webServer: {
    command: devServerCommand,
    cwd: repoRoot,
    url: 'http://localhost:3000/signin',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    env: {
      ...process.env,
      ENABLE_DEV_LOGIN: 'true',
    },
  },
})