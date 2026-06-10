import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      'server-only': resolve(__dirname, 'vitest/mocks/server-only.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**',
      'packages/**', // Packages have their own configs
    ],
    // Vitest 4 workspace configuration via projects
    projects: [
      // Root app tests
      {
        resolve: {
          alias: {
            '@': resolve(__dirname, '.'),
            'server-only': resolve(__dirname, 'vitest/mocks/server-only.ts'),
          },
        },
        test: {
          name: 'app',
          root: '.',
          include: ['app/**/*.test.{ts,tsx}'],
          exclude: ['**/node_modules/**', 'packages/**'],
        },
      },
      // Package tests - each package has its own vitest.config.ts
      'packages/utils/vitest.config.ts',
      'packages/ui/vitest.config.ts',
      'packages/logger/vitest.config.ts',
      'packages/patterns/vitest.config.ts',
      'packages/shared-types/vitest.config.ts',
      'packages/security/vitest.config.ts',
      'packages/theme/vitest.config.ts',
    ],
  },
})
