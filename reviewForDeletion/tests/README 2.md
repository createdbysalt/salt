# Test Coverage Summary

## Relationship Intelligence Implementation Tests

This directory contains comprehensive test coverage for the relationship intelligence features implemented across Clients, Projects, and Meetings.

### Unit Tests

#### Health Score Calculation (`tests/unit/health-score.test.ts`)
- ✓ Score bounds validation (0-100)
- ✓ Factors array structure
- ✓ Factor properties (factor, impact, reason)
- ✓ Last contact penalty logic

### End-to-End Tests

#### Meetings CRUD (`tests/e2e/meetings-crud.spec.ts`)
- ✓ Display meetings page
- ✓ Open create meeting dialog
- ✓ Create new meeting with all fields
- ✓ Filter meetings by status
- ✓ Search meetings by title/client

#### Project Milestones (`tests/e2e/project-milestones.spec.ts`)
- ✓ Display project with milestones
- ✓ Create milestone with title, description, due date
- ✓ Mark milestone as complete
- ✓ Filter projects by type (one-time vs retainer)
- ✓ Retainer hours utilization display

#### Bridge Client Requests (`tests/e2e/bridge-requests.spec.ts`)
- ✓ Client submits request via Bridge
- ✓ Request appears as task in studio dashboard
- ✓ Client requests meeting reschedule
- ✓ Request creates task with source='client_request'

#### Client Intelligence (`tests/e2e/client-intelligence.spec.ts`)
- ✓ Display health score badges (Excellent/Good/Fair/At Risk)
- ✓ This Week's Meetings widget on clients page
- ✓ Filter clients by status (active/inactive)
- ✓ Filter clients by tags
- ✓ Toggle between grid and list views
- ✓ Display client metrics (projects, MRR, LTV)
- ✓ Show next meeting for each client

## Running Tests

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run specific suite
npx playwright test tests/e2e/meetings-crud.spec.ts

# Run with UI mode
npx playwright test --ui
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Database Setup

Tests use a separate Supabase test project to avoid affecting production data:

1. Create a test project in Supabase
2. Run migrations: `npm run db:test:migrate`
3. Seed test data: `npm run db:test:seed`

## CI/CD Integration

Tests run automatically on:
- Pull requests to main
- Commits to main branch
- Nightly builds for regression testing

## Mocking Strategy

- **Unit tests**: Mock Supabase client and external dependencies
- **Integration tests**: Use test database with isolated transactions
- **E2E tests**: Use full test environment with real database

## Coverage Goals

- **Unit tests**: >80% coverage for business logic
- **Integration tests**: All server actions
- **E2E tests**: Critical user flows

## Future Tests

As new features are added, maintain this test coverage structure:
- Add unit tests for new calculation logic
- Add integration tests for new server actions
- Add E2E tests for new user flows

