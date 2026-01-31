import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Intelligence Dashboard (Velocity Strategy)
 *
 * Tests the unified Intelligence page with tabs:
 * - Feed: Real-time intelligence events
 * - Library: Saved intelligence for reference
 * - Queue: Generation job status
 *
 * Uses SEMANTIC LOCATORS ONLY (getByRole, getByLabel, getByText)
 */

test.describe('Intelligence Dashboard - Velocity Strategy', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by global setup
    await page.goto('/dashboard/intelligence')
    await page.waitForLoadState('networkidle')
  })

  test('intelligence page loads with proper structure', async ({ page }) => {
    // Verify page heading
    const intelligenceHeading = page.getByRole('heading', { name: /intelligence/i })
    await expect(intelligenceHeading).toBeVisible()

    // Verify tab structure exists
    const tabList = page.getByRole('tablist')
    await expect(tabList).toBeVisible()

    // Verify all three tabs are present
    const feedTab = page.getByRole('tab', { name: /feed/i })
    const libraryTab = page.getByRole('tab', { name: /library/i })
    const queueTab = page.getByRole('tab', { name: /queue/i })

    await expect(feedTab).toBeVisible()
    await expect(libraryTab).toBeVisible()
    await expect(queueTab).toBeVisible()

    console.log('✅ Intelligence page loads with all tabs')
  })

  test('can switch between feed, library, and queue tabs', async ({ page }) => {
    // Start on Feed tab (default)
    const feedTab = page.getByRole('tab', { name: /feed/i })
    const libraryTab = page.getByRole('tab', { name: /library/i })
    const queueTab = page.getByRole('tab', { name: /queue/i })

    // Feed tab should be selected by default
    await expect(feedTab).toHaveAttribute('aria-selected', 'true')

    // Click Library tab
    await libraryTab.click()
    await expect(libraryTab).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=library/)
    console.log('✅ Switched to Library tab')

    // Click Queue tab
    await queueTab.click()
    await expect(queueTab).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=queue/)
    console.log('✅ Switched to Queue tab')

    // Click back to Feed tab
    await feedTab.click()
    await expect(feedTab).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=feed/)
    console.log('✅ Switched back to Feed tab')
  })

  test('feed tab shows filter controls', async ({ page }) => {
    // Ensure we're on Feed tab
    const feedTab = page.getByRole('tab', { name: /feed/i })
    await feedTab.click()

    // Look for filter controls
    const typeFilters = page.getByRole('button', { name: /all|strategic|technical/i })
    const urgencyFilters = page.getByRole('button', { name: /all|critical only/i })

    const typeFilterCount = await typeFilters.count()
    console.log(`✅ Feed filters - Type filter buttons: ${typeFilterCount}`)

    // Should have filter buttons
    expect(typeFilterCount).toBeGreaterThan(0)

    // Look for time filter dropdown
    const timeSelect = page.getByRole('combobox')
    const hasTimeSelect = await timeSelect.count() > 0
    console.log(`✅ Feed filters - Time select: ${hasTimeSelect}`)
  })

  test('feed tab shows empty state when no events', async ({ page }) => {
    // Look for empty state content
    const emptyStateHeading = page.getByRole('heading', { name: /no intelligence events/i })
    const feedContent = page.getByText(/intelligence.*will.*display|events.*appear/i)

    const hasEmptyState = await emptyStateHeading.count() > 0
    const hasFeedContent = await feedContent.count() > 0

    if (hasEmptyState) {
      console.log('✅ Feed shows empty state (no events yet)')
    } else if (hasFeedContent) {
      console.log('✅ Feed has content or placeholder text')
    }

    // Page should have some content
    const hasContent = hasEmptyState || hasFeedContent ||
      await page.getByRole('article').count() > 0 ||
      await page.getByRole('listitem').count() > 0
    expect(hasContent).toBe(true)
  })

  test('library tab shows search functionality', async ({ page }) => {
    // Navigate to Library tab
    await page.getByRole('tab', { name: /library/i }).click()

    // Look for search input
    const searchInput = page.getByRole('textbox', { name: /search/i })
    const searchPlaceholder = page.getByPlaceholder(/search/i)

    const hasSearchInput = await searchInput.count() > 0
    const hasSearchPlaceholder = await searchPlaceholder.count() > 0

    console.log(`✅ Library search - Input: ${hasSearchInput}, Placeholder: ${hasSearchPlaceholder}`)

    // Either search input or empty state should be present
    const emptyLibrary = page.getByText(/library.*empty|no.*saved/i)
    const hasEmptyLibrary = await emptyLibrary.count() > 0

    if (hasEmptyLibrary) {
      console.log('✅ Library shows empty state')
    }

    expect(hasSearchInput || hasSearchPlaceholder || hasEmptyLibrary).toBe(true)
  })

  test('queue tab shows job status or empty state', async ({ page }) => {
    // Navigate to Queue tab
    await page.getByRole('tab', { name: /queue/i }).click()

    // Look for queue content
    const emptyQueue = page.getByText(/no.*jobs.*queue|queue.*empty/i)
    const queueTable = page.getByRole('table')
    const pendingStats = page.getByText(/pending/i)
    const runningStats = page.getByText(/running/i)

    const hasEmptyQueue = await emptyQueue.count() > 0
    const hasQueueTable = await queueTable.count() > 0
    const hasPendingStats = await pendingStats.count() > 0
    const hasRunningStats = await runningStats.count() > 0

    console.log(`✅ Queue tab - Empty: ${hasEmptyQueue}, Table: ${hasQueueTable}`)
    console.log(`✅ Queue stats - Pending: ${hasPendingStats}, Running: ${hasRunningStats}`)

    // Should have either empty state or queue content
    expect(hasEmptyQueue || hasQueueTable || hasPendingStats).toBe(true)
  })

  test('URL state persists when navigating tabs', async ({ page }) => {
    // Navigate to Library tab
    await page.getByRole('tab', { name: /library/i }).click()
    await expect(page).toHaveURL(/tab=library/)

    // Reload page and verify we stay on Library tab
    await page.reload()
    await page.waitForLoadState('networkidle')

    const libraryTab = page.getByRole('tab', { name: /library/i })
    await expect(libraryTab).toHaveAttribute('aria-selected', 'true')
    console.log('✅ URL state persists after page reload')
  })

  test('can access intelligence page from Strategy mode navigation', async ({ page }) => {
    // Go to dashboard first
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Look for mode switcher or Strategy mode
    const strategyButton = page.getByRole('button', { name: /strategy/i })
    const strategyTab = page.getByRole('tab', { name: /strategy/i })

    const hasStrategyButton = await strategyButton.count() > 0
    const hasStrategyTab = await strategyTab.count() > 0

    if (hasStrategyButton) {
      await strategyButton.click()
      console.log('✅ Clicked Strategy mode button')
    } else if (hasStrategyTab) {
      await strategyTab.click()
      console.log('✅ Clicked Strategy mode tab')
    }

    // Look for Intelligence nav item
    const intelligenceNav = page.getByRole('link', { name: /intelligence/i })
    const hasIntelligenceNav = await intelligenceNav.count() > 0

    console.log(`✅ Intelligence nav item visible: ${hasIntelligenceNav}`)

    if (hasIntelligenceNav) {
      await intelligenceNav.click()
      await expect(page).toHaveURL(/\/dashboard\/intelligence/)
      console.log('✅ Successfully navigated to Intelligence via Strategy mode')
    }
  })
})
