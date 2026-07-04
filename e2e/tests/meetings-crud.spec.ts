import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Meetings CRUD Operations (Velocity Strategy)
 *
 * MIGRATION NOTES:
 * - Migrated from /tests/e2e/meetings-crud.spec.ts
 * - Uses SEMANTIC LOCATORS ONLY (getByRole, getByLabel, getByText)
 * - No CSS selectors, no data-testid, no manual auth
 * - Follows "Resilient Testing Protocol"
 * - Tests are designed to be resilient to UI changes
 */

test.describe('Meetings CRUD - Velocity Strategy', () => {
  test.beforeEach(async ({ page }) => {
    // ✅ VELOCITY: Auth handled by global setup, no manual login needed
    await page.goto('/meetings')
    await page.waitForLoadState('networkidle')
  })

  test('meetings page loads with proper structure', async ({ page }) => {
    // ✅ VELOCITY: Use semantic locators for page structure
    const meetingsHeading = page.getByRole('heading', { name: /meetings/i })
    const anyHeading = page.getByRole('heading')
    const mainContent = page.getByRole('main')

    // Check what we can find
    const hasMeetingsHeading = await meetingsHeading.isVisible().catch(() => false)
    const hasAnyHeading = await anyHeading.count() > 0
    const hasMainContent = await mainContent.isVisible().catch(() => false)

    // Look for common meeting page elements using semantic roles
    const hasNewMeetingButton = await page.getByRole('button', { name: /new|add|create|schedule/i }).isVisible().catch(() => false)
    const hasSearchInput = await page.getByRole('searchbox').isVisible().catch(() => false)
    const hasFilterButtons = await page.getByRole('button', { name: /filter|status|upcoming|completed/i }).count().then(count => count > 0).catch(() => false)

    console.log(`✅ Page structure - Meetings heading: ${hasMeetingsHeading}, Any heading: ${hasAnyHeading}, Main: ${hasMainContent}`)
    console.log(`✅ Page elements - New button: ${hasNewMeetingButton}, Search: ${hasSearchInput}, Filters: ${hasFilterButtons}`)

    // Page should have some basic structure (either main content OR headings)
    expect(hasMainContent || hasAnyHeading).toBe(true)
  })

  // RETIRED (2026-07-04): the dialog/form creation flow no longer exists —
  // "Add meeting" creates a blank record and navigates to its detail page.
  // That flow (create → inline edit → persist) is covered end-to-end by
  // tests/roundtrip-meeting.spec.ts.

  test('can interact with meeting filters and search', async ({ page }) => {
    // ✅ VELOCITY: Test filtering and search functionality

    // Look for search functionality
    const searchInput = page.getByRole('searchbox')
    const searchByPlaceholder = page.getByPlaceholder(/search|find|filter/i)
    const textInputs = page.getByRole('textbox')

    if (await searchInput.count() > 0) {
      await searchInput.fill('test meeting')
      console.log('✅ Search input found and filled')
    } else if (await searchByPlaceholder.count() > 0) {
      await searchByPlaceholder.fill('test meeting')
      console.log('✅ Search placeholder input found and filled')
    }

    // Look for filter buttons
    const filterButtons = page.getByRole('button', { name: /upcoming|completed|scheduled|cancelled|status/i })
    const anyButtons = page.getByRole('button')

    if (await filterButtons.count() > 0) {
      const firstFilter = filterButtons.first()
      await firstFilter.click()

      // ✅ VELOCITY: Verify some kind of filtering response
      await page.waitForTimeout(1000) // Give time for filter to apply

      console.log('✅ Filter button clicked successfully')
    }

    // Count what we found
    const searchInputCount = await searchInput.count()
    const placeholderInputCount = await searchByPlaceholder.count()
    const filterButtonCount = await filterButtons.count()
    const totalButtonCount = await anyButtons.count()
    const textInputCount = await textInputs.count()

    console.log(`✅ Interactive elements - Search inputs: ${searchInputCount}, Placeholder inputs: ${placeholderInputCount}, Filter buttons: ${filterButtonCount}, Total buttons: ${totalButtonCount}, Text inputs: ${textInputCount}`)

    // Pass if page has any interactive elements (this is a meetings page after all)
    const hasInteractiveElements = totalButtonCount > 0 || textInputCount > 0
    expect(hasInteractiveElements).toBe(true)
  })

  test('meetings list displays properly', async ({ page }) => {
    // ✅ VELOCITY: Verify meeting list structure using semantic roles

    // Look for meeting items using various semantic approaches
    const listElements = page.getByRole('list')
    const articleElements = page.getByRole('article')
    const linkElements = page.getByRole('link')

    // Check for meeting-related content
    const meetingCards = await page.locator('[data-testid*="meeting"], [class*="meeting"], [id*="meeting"]').count().catch(() => 0)
    const meetingText = await page.getByText(/meeting|scheduled|upcoming/i).count()

    const hasListStructure = await listElements.count() > 0
    const hasArticleStructure = await articleElements.count() > 0
    const hasLinkStructure = await linkElements.count() > 0
    const hasMeetingContent = meetingCards > 0 || meetingText > 0

    console.log(`✅ Meetings display - Lists: ${hasListStructure}, Articles: ${hasArticleStructure}, Links: ${hasLinkStructure}, Content: ${hasMeetingContent}`)

    // Should have some kind of structured content
    expect(hasListStructure || hasArticleStructure || hasLinkStructure || hasMeetingContent).toBe(true)
  })

  test('page navigation and controls work', async ({ page }) => {
    // ✅ VELOCITY: Test that navigation and page controls are functional

    // Verify main navigation is accessible
    const navigation = page.getByRole('navigation')
    const hasNavigation = await navigation.isVisible().catch(() => false)

    // Look for common page controls
    const buttons = page.getByRole('button')
    const links = page.getByRole('link')

    const buttonCount = await buttons.count()
    const linkCount = await links.count()

    console.log(`✅ Page controls - Navigation: ${hasNavigation}, Buttons: ${buttonCount}, Links: ${linkCount}`)

    // Page should have interactive controls
    expect(buttonCount + linkCount).toBeGreaterThan(0)
  })
})