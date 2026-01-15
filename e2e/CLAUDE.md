# 🧪 E2E Automation Memory

**Context:** You are working in the e2e workspace.
**Role:** SDET (Software Development Engineer in Test).
**Goal:** Validate "User-Visible Behavior" across the entire system.

## 1. 🗺️ System Map (Black Box)

You are testing these running services. Do NOT import their source code directly.

| Service | Local URL | CI URL |
|---------|-----------|--------|
| Frontend | `http://localhost:3000` | `https://preview-frontend.vercel.app` |
| Backend | `http://localhost:4000` | `https://api-staging.railway.app` |
| Database | `localhost:5432` | (Use Seeding Scripts) |

## 2. 🛡️ The "Resilient Testing" Protocol

Violating these rules creates flaky tests. Strict adherence is required.

1. **Semantic Locators ONLY:**
   * ✅ GOOD: `page.getByRole('button', { name: 'Save' })`
   * ✅ GOOD: `page.getByLabel('Email Address')`
   * ❌ BAD: `page.locator('.btn-primary')` (CSS classes change)
   * ❌ BAD: `page.locator('div > div:nth-child(2)')` (Structure changes)

2. **No Manual Waits:**
   * NEVER use `page.waitForTimeout(5000)`.
   * Use Web-First assertions: `await expect(locator).toBeVisible()`. These auto-retry.

3. **Authentication State:**
   * Do NOT log in via the UI for every test.
   * Use the `global-setup.ts` pattern to save storage state to `playwright/.auth/user.json`.
   * Inject state via `test.use({ storageState: '...' })`.

4. **Isolation:**
   * Every test must be runnable in isolation.
   * Do not rely on the database state from a previous test.
   * Use `beforeAll` to seed data if necessary (via direct DB calls or API, not UI).

## 3. 🏗️ Code Structure

* **Specs:** `src/specs/[feature]/[scenario].spec.ts`
* **Page Objects:** `src/pages/[PageName].ts` (Encapsulate complex selectors here)
* **Fixtures:** `src/fixtures/` (Custom test extensions)
* **Utils:** `src/utils/` (DB seeding helpers, API clients)

## 4. ⚡️ Common Commands

* **Run All:** `pnpm test` (Headless)
* **UI Mode:** `pnpm test --ui` (Interactive debugger - Use this to fix flakes)
* **Specific Spec:** `pnpm test -g "login flow"`
* **Debug:** `pnpm test --debug`
* **Update Snapshots:** `pnpm test --update-snapshots`

## 5. 🤖 AI Workflow (The "Healer" Loop)

If you are fixing a broken test:

1. **Analyze Trace:** Look at the error message. Is it a Timeout (element missing) or Assertion (wrong value)?
2. **Check DOM:** If the selector failed, ask: "Did the implementation change from `button` to `a` tag?"
3. **Update Locator:** Switch to a more robust locator (`getByRole`).
4. **Verify:** Run only that specific test file to confirm the fix.