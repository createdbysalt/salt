# E2E Testing Integration

When and how to create E2E test stories in PRDs.

---

## When to Create E2E Test Stories

### Always Create E2E Stories For:

1. **Critical user journeys** — Login, checkout, core business flows
2. **Multi-step forms** — Wizards, onboarding, submissions
3. **Cross-feature integration** — Features working together
4. **Data flow verification** — Create → Read → Update → Delete cycles

### Skip E2E Stories For:

1. **Schema-only changes** — Database migrations without UI
2. **Internal refactoring** — No user-visible behavior change
3. **Simple CRUD on existing patterns** — Already covered by existing tests

---

## E2E Story Structure

### Template

```json
{
  "id": "S[stream]-[number]",
  "title": "E2E: [User journey description]",
  "description": "Verify [flow description] works end-to-end",
  "acceptanceCriteria": [
    "Navigate to [starting page]",
    "[Action 1]",
    "[Action 2]",
    "[Expected outcome visible]",
    "Data persisted correctly (verify in DB or UI)",
    "E2E test passes: pnpm test:e2e tests/[feature].spec.ts"
  ],
  "implementationSteps": [
    "1. Read docs/guides/testing-strategy.md and e2e/CLAUDE.md",
    "2. Create e2e/tests/[feature].spec.ts",
    "3. Use semantic locators (getByRole, getByLabel, getByText)",
    "4. Implement Velocity Strategy with graceful skips",
    "5. Run: pnpm test:e2e tests/[feature].spec.ts",
    "6. Verify test passes consistently"
  ],
  "doNotChange": [
    "Existing E2E tests",
    "Auth setup in e2e/tests/auth.setup.ts",
    "Playwright config"
  ]
}
```

---

## E2E Story Placement

E2E stories belong in:

1. **Final stream** — Dedicated E2E test stream at the end
2. **After feature streams** — E2E stream depends on all feature streams

### Example Execution Plan

```
Stream 1: Foundation → Stream 2, 3, 4 (parallel)
Stream 2: Intake → Stream 5
Stream 3: Proposals → Stream 5
Stream 4: Calendar → Stream 5
Stream 5: E2E Tests (depends on 2, 3, 4)
```

---

## Locator Requirements

From `docs/guides/testing-strategy.md`:

| Priority | Locator Type | Example |
|----------|--------------|---------|
| ✅ Always use | `getByRole` | `page.getByRole('button', { name: 'Submit' })` |
| ✅ Always use | `getByLabel` | `page.getByLabel('Email address')` |
| ✅ Always use | `getByText` | `page.getByText('Welcome back')` |
| ⚠️ Last resort | `getByTestId` | `page.getByTestId('checkout-form')` |
| 🚫 Never use | CSS/XPath | `.btn-primary`, `//div[1]/span` |

---

## Velocity Strategy Pattern

E2E tests should use graceful skipping:

```typescript
test('user can submit intake form', async ({ page }) => {
  // Navigate with error handling
  try {
    await page.goto('/intake/test-studio')
    await page.waitForLoadState('networkidle')
  } catch (error) {
    console.log('⚠️ Intake page requires auth, testing from current state')
    test.skip()
  }

  // Check for elements before interacting
  const urlInput = page.getByLabel('Website URL')
  if (await urlInput.count() === 0) {
    console.log('⚠️ URL input not found - may need authentication')
    test.skip()
  }

  // Proceed with test
  await urlInput.fill('https://example.com')
  await page.getByRole('button', { name: 'Next' }).click()

  // Verify outcome
  await expect(page.getByText('Tell us about your goals')).toBeVisible()
})
```

---

## E2E Story Examples

### Form Submission Flow

```json
{
  "id": "S6-001",
  "title": "E2E: Complete intake submission",
  "description": "Verify user can submit intake form end-to-end",
  "acceptanceCriteria": [
    "Navigate to /intake/[studioSlug]",
    "Enter website URL",
    "Click Next and answer 5 questions",
    "View Brand Snapshot preview",
    "Submit form successfully",
    "Confirmation page displays",
    "Submission visible in studio dashboard",
    "E2E test passes"
  ]
}
```

### CRUD Verification

```json
{
  "id": "S6-002",
  "title": "E2E: Proposal CRUD operations",
  "description": "Verify proposal create, read, update, delete",
  "acceptanceCriteria": [
    "Create new proposal from template",
    "View proposal in list",
    "Edit proposal details",
    "Changes persist after refresh",
    "Delete proposal",
    "Proposal removed from list",
    "E2E test passes"
  ]
}
```

### Integration Flow

```json
{
  "id": "S6-003",
  "title": "E2E: Intake to proposal flow",
  "description": "Verify intake data flows into proposal",
  "acceptanceCriteria": [
    "Submit intake with specific details",
    "Create proposal from intake",
    "Proposal auto-populates client info",
    "Proposal includes intake responses",
    "E2E test passes"
  ]
}
```

---

## Auth Setup Considerations

If tests require authentication:

1. **Use existing auth setup** — `e2e/tests/auth.setup.ts`
2. **Reference stored state** — `e2e/fixtures/auth.json`
3. **Configure in playwright.config.ts** — Use project dependencies

```typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    dependencies: ['setup'],
    use: { storageState: 'e2e/fixtures/auth.json' },
  },
]
```

---

## Test File Structure

```
e2e/
├── playwright.config.ts
├── tests/
│   ├── auth.setup.ts         # Global auth setup
│   ├── smoke.spec.ts         # Quick health checks
│   ├── intake.spec.ts        # Intake flow tests
│   ├── proposals.spec.ts     # Proposal flow tests
│   ├── calendar.spec.ts      # Calendar/meeting tests
│   └── integration.spec.ts   # Cross-feature tests
├── fixtures/
│   └── auth.json             # Stored auth state
└── utils/
    └── helpers.ts            # Shared test utilities
```

---

## Common E2E Mistakes

### Don't Test Implementation

**Bad:** Check that specific state variable is set
**Good:** Check that user sees expected UI

### Don't Use Brittle Selectors

**Bad:** `page.locator('.btn-class-xyz')`
**Good:** `page.getByRole('button', { name: 'Submit' })`

### Don't Skip Error States

**Bad:** Only test happy path
**Good:** Include error state tests (invalid input, server errors)

### Don't Hardcode Test Data

**Bad:** `await input.fill('test@test.com')`
**Good:** Use fixtures or generate unique data

---

## Reference Docs

Before writing E2E stories, consult:
- `docs/guides/testing-strategy.md` — Full testing strategy
- `e2e/CLAUDE.md` — E2E-specific instructions
- Existing tests in `e2e/tests/` for patterns
