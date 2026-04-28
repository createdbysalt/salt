# Tests Documentation

**Context:** Test structure and organization for SALT.

> **Note:** E2E tests have been migrated to `/e2e/` directory using the Velocity Strategy. See [`archive/legacy-e2e-tests-20260114/README.md`](../archive/legacy-e2e-tests-20260114/README.md) for migration details.

## Testing Strategy

Following the **Testing Strategy Document** at [`docs/guides/testing-strategy.md`](../docs/guides/testing-strategy.md):

### Unit Tests (Co-located)
Unit tests are **co-located** next to their source files according to our testing strategy:

```
app/actions/clients/
├── calculate-health-score.ts
└── calculate-health-score.test.ts       ← Co-located

app/actions/insights/
├── get-client-analytics.ts
└── get-client-analytics.test.ts         ← Co-located
```

### E2E Tests (Isolated)
E2E tests use the **Velocity Strategy** in the dedicated `/e2e/` directory:

```
e2e/tests/
├── auth.setup.ts         ← Global auth setup
├── smoke.spec.ts         ← Workspace validation
├── pricing-page.spec.ts  ← Velocity strategy tests
├── meetings-crud.spec.ts
├── client-intelligence.spec.ts
├── project-milestones.spec.ts
└── bridge-requests.spec.ts
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests (co-located)
pnpm test

# Watch mode (development)
pnpm test:watch

# With coverage
pnpm test:coverage
```

### E2E Tests (Velocity Strategy)
```bash
# Run all E2E tests (33 tests using velocity strategy)
pnpm test:e2e

# Run with UI mode (debugging)
pnpm test:e2e --ui

# Run specific test file
pnpm test:e2e tests/bridge-requests.spec.ts
```

## Test Philosophy

Following the **Testing Trophy** model:
- **Unit Tests**: Complex business logic only (co-located)
- **E2E Tests**: Critical user journeys with semantic locators (isolated)
- **Velocity Strategy**: Graceful skipping + rich logging for resilient testing

## Coverage Goals

- **Unit tests**: >80% coverage for business logic
- **E2E tests**: Critical user workflows with graceful auth handling

## Adding New Tests

### Unit Tests (Co-located)
Create test files next to the source code they test:
```typescript
// app/actions/feature/my-action.test.ts
import { describe, it, expect } from 'vitest'
import { myAction } from './my-action'

describe('myAction', () => {
  it('should handle business logic correctly', () => {
    // Test implementation
  })
})
```

### E2E Tests (Velocity Strategy)
Add to `/e2e/tests/[workflow-name].spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test('workflow description', async ({ page }) => {
  // Use semantic locators and graceful skipping
  const button = page.getByRole('button', { name: /action/i })
  if (await button.count() > 0) {
    await button.click()
    console.log('✅ Action successful')
  } else {
    console.log('⚠️ Action not available - may need auth')
    test.skip()
  }
})
```

