import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // Run setup before all tests
  globalSetup: require.resolve('./global-setup.ts'),

  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
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
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      ...process.env,
      ENABLE_DEV_LOGIN: 'true',
    },
  },
})