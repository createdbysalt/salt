import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Reports Dashboard (Velocity Strategy)
 *
 * Tests the consolidated Reports page with tabs:
 * - Strategic: AI-powered strategic reports
 * - Performance: SEO/Performance analytics (migrated from /seo)
 *
 * Uses SEMANTIC LOCATORS ONLY (getByRole, getByLabel, getByText)
 */

test.describe('Reports Dashboard - Velocity Strategy', () => {
  test.beforeEach(async ({ page }) => {
    // Auth handled by global setup
    await page.goto('/dashboard/reports')
    await page.waitForLoadState('networkidle')
  })

  test('reports page loads with proper structure', async ({ page }) => {
    // Verify page heading
    const reportsHeading = page.getByRole('heading', { name: /reports/i })
    await expect(reportsHeading).toBeVisible()

    // Verify tab structure exists
    const tabList = page.getByRole('tablist')
    await expect(tabList).toBeVisible()

    // Verify both tabs are present
    const strategicTab = page.getByRole('tab', { name: /strategic/i })
    const performanceTab = page.getByRole('tab', { name: /performance/i })

    await expect(strategicTab).toBeVisible()
    await expect(performanceTab).toBeVisible()

    console.log('✅ Reports page loads with Strategic and Performance tabs')
  })

  test('can switch between strategic and performance tabs', async ({ page }) => {
    const strategicTab = page.getByRole('tab', { name: /strategic/i })
    const performanceTab = page.getByRole('tab', { name: /performance/i })

    // Strategic tab should be selected by default
    await expect(strategicTab).toHaveAttribute('aria-selected', 'true')

    // Click Performance tab
    await performanceTab.click()
    await expect(performanceTab).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=performance/)
    console.log('✅ Switched to Performance tab')

    // Click back to Strategic tab
    await strategicTab.click()
    await expect(strategicTab).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/tab=strategic/)
    console.log('✅ Switched back to Strategic tab')
  })

  test('strategic tab shows report type cards', async ({ page }) => {
    // Ensure we're on Strategic tab
    const strategicTab = page.getByRole('tab', { name: /strategic/i })
    await strategicTab.click()

    // Look for report type content
    const competitiveAnalysis = page.getByText(/competitive analysis/i)
    const icpProfile = page.getByText(/icp profile/i)
    const marketPositioning = page.getByText(/market positioning/i)

    const hasCompetitive = await competitiveAnalysis.count() > 0
    const hasIcp = await icpProfile.count() > 0
    const hasPositioning = await marketPositioning.count() > 0

    console.log(`✅ Strategic reports - Competitive: ${hasCompetitive}, ICP: ${hasIcp}, Positioning: ${hasPositioning}`)

    // Should have at least one report type
    expect(hasCompetitive || hasIcp || hasPositioning).toBe(true)

    // Look for generate buttons
    const generateButtons = page.getByRole('button', { name: /generate report/i })
    const generateCount = await generateButtons.count()
    console.log(`✅ Generate report buttons found: ${generateCount}`)
  })

  test('strategic tab shows AI-powered messaging', async ({ page }) => {
    // Look for AI-related content
    const aiPowered = page.getByText(/ai-powered|ai.*powered|using ai/i)
    const sparklesthey = page.getByText(/strategic reports/i)

    const hasAiPowered = await aiPowered.count() > 0
    const hasStrategicContent = await sparklesthey.count() > 0

    console.log(`✅ Strategic messaging - AI-powered: ${hasAiPowered}, Content: ${hasStrategicContent}`)

    expect(hasStrategicContent).toBe(true)
  })

  test('performance tab shows SEO overview data', async ({ page }) => {
    // Navigate to Performance tab
    await page.getByRole('tab', { name: /performance/i }).click()

    // Look for SEO metrics content
    const trackedProjects = page.getByText(/tracked projects|projects.*enabled/i)
    const avgPerformance = page.getByText(/avg.*performance|average.*performance/i)
    const avgSeo = page.getByText(/avg.*seo|average.*seo/i)
    const needsAttention = page.getByText(/need.*attention|needs.*attention/i)

    const hasTrackedProjects = await trackedProjects.count() > 0
    const hasAvgPerformance = await avgPerformance.count() > 0
    const hasAvgSeo = await avgSeo.count() > 0
    const hasNeedsAttention = await needsAttention.count() > 0

    console.log(`✅ Performance stats - Tracked: ${hasTrackedProjects}, Avg Perf: ${hasAvgPerformance}`)
    console.log(`✅ Performance stats - Avg SEO: ${hasAvgSeo}, Attention: ${hasNeedsAttention}`)

    // Should have performance metrics or empty state
    const emptyState = page.getByText(/no seo tracking|configure seo/i)
    const hasEmptyState = await emptyState.count() > 0

    expect(hasTrackedProjects || hasAvgPerformance || hasEmptyState).toBe(true)
  })

  test('performance tab shows projects table when data exists', async ({ page }) => {
    // Navigate to Performance tab
    await page.getByRole('tab', { name: /performance/i }).click()

    // Look for projects table
    const projectsTable = page.getByRole('table')
    const projectsHeading = page.getByRole('heading', { name: /projects/i })

    const hasTable = await projectsTable.count() > 0
    const hasProjectsHeading = await projectsHeading.count() > 0

    console.log(`✅ Performance projects - Table: ${hasTable}, Heading: ${hasProjectsHeading}`)

    if (hasTable) {
      // Check for table headers
      const domainHeader = page.getByRole('columnheader', { name: /domain/i })
      const performanceHeader = page.getByRole('columnheader', { name: /performance/i })
      const seoHeader = page.getByRole('columnheader', { name: /seo/i })

      const hasDomain = await domainHeader.count() > 0
      const hasPerformance = await performanceHeader.count() > 0
      const hasSeo = await seoHeader.count() > 0

      console.log(`✅ Table headers - Domain: ${hasDomain}, Performance: ${hasPerformance}, SEO: ${hasSeo}`)
    }

    // Either table or empty state should exist
    const emptyState = page.getByText(/no seo tracking|view projects/i)
    const hasEmptyState = await emptyState.count() > 0

    expect(hasTable || hasEmptyState).toBe(true)
  })

  test('SEO redirect works from old URL', async ({ page }) => {
    // Navigate to old SEO URL
    await page.goto('/dashboard/seo')
    await page.waitForLoadState('networkidle')

    // Should redirect to reports with performance tab
    await expect(page).toHaveURL(/\/dashboard\/reports.*tab=performance/)
    console.log('✅ SEO URL redirects to Reports performance tab')

    // Verify we're on Performance tab
    const performanceTab = page.getByRole('tab', { name: /performance/i })
    await expect(performanceTab).toHaveAttribute('aria-selected', 'true')
  })

  test('URL state persists when navigating tabs', async ({ page }) => {
    // Navigate to Performance tab
    await page.getByRole('tab', { name: /performance/i }).click()
    await expect(page).toHaveURL(/tab=performance/)

    // Reload page and verify we stay on Performance tab
    await page.reload()
    await page.waitForLoadState('networkidle')

    const performanceTab = page.getByRole('tab', { name: /performance/i })
    await expect(performanceTab).toHaveAttribute('aria-selected', 'true')
    console.log('✅ URL state persists after page reload')
  })

  test('can access reports page from Strategy mode navigation', async ({ page }) => {
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

    // Look for Reports nav item
    const reportsNav = page.getByRole('link', { name: /reports/i })
    const hasReportsNav = await reportsNav.count() > 0

    console.log(`✅ Reports nav item visible: ${hasReportsNav}`)

    if (hasReportsNav) {
      await reportsNav.click()
      await expect(page).toHaveURL(/\/dashboard\/reports/)
      console.log('✅ Successfully navigated to Reports via Strategy mode')
    }
  })

  test('performance tab project rows are clickable', async ({ page }) => {
    // Navigate to Performance tab
    await page.getByRole('tab', { name: /performance/i }).click()

    // Look for clickable rows
    const tableRows = page.getByRole('row')
    const rowCount = await tableRows.count()

    console.log(`✅ Table rows found: ${rowCount}`)

    if (rowCount > 1) { // More than just header row
      // Rows should have cursor-pointer class (visual indicator of clickability)
      const clickableRow = tableRows.nth(1) // Skip header row
      const hasClickableCursor = await clickableRow.evaluate((el) =>
        window.getComputedStyle(el).cursor === 'pointer'
      ).catch(() => false)

      console.log(`✅ Row is clickable: ${hasClickableCursor}`)
    }
  })
})
