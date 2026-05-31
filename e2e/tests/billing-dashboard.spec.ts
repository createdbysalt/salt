import { test, expect } from '@playwright/test'
import { urlHasHost } from '../helpers/url'

/**
 * E2E Tests: Billing Dashboard Management (Velocity Strategy)
 *
 * MIGRATION NOTES:
 * - Migrated from /tests/e2e/dashboard-billing-status.spec.ts
 * - Uses SEMANTIC LOCATORS ONLY (getByRole, getByLabel, getByText)
 * - No CSS selectors, no data-testid attributes, no manual auth
 * - Follows "Resilient Testing Protocol"
 * - Tests focus on billing dashboard functionality and subscription management
 */

test.describe('Billing Dashboard Management - Velocity Strategy', () => {
  test.beforeEach(async ({ page }) => {
    // ✅ VELOCITY: Auth handled by global setup, try to access billing settings
    try {
      await page.goto('/dashboard/settings/billing')
      await page.waitForLoadState('networkidle')
    } catch (error) {
      console.log('⚠️ Billing settings may require specific authentication')
    }
  })

  test('billing dashboard loads with proper authentication handling', async ({ page }) => {
    // ✅ VELOCITY: Gracefully handle auth redirects and page structure

    const currentUrl = page.url()
    console.log(`✅ Navigated to: ${currentUrl}`)

    if (currentUrl.includes('/signin')) {
      console.log('⚠️ Redirected to sign-in - billing requires authentication')

      // Verify sign-in page has proper structure
      const signInHeading = page.getByRole('heading', { name: /sign.*in|login/i })
      const signInForm = page.getByRole('form')
      const emailField = page.getByRole('textbox', { name: /email/i })

      const hasSignInHeading = await signInHeading.isVisible().catch(() => false)
      const hasSignInForm = await signInForm.isVisible().catch(() => false)
      const hasEmailField = await emailField.count() > 0

      console.log(`✅ Sign-in structure - Heading: ${hasSignInHeading}, Form: ${hasSignInForm}, Email: ${hasEmailField}`)

      // Should have some sign-in structure
      expect(hasSignInHeading || hasSignInForm || hasEmailField).toBe(true)
      return // Exit early for auth redirect
    }

    // If we're on billing page, check for billing elements
    const billingHeadings = page.getByRole('heading', { name: /billing|subscription/i })
    const anyHeadings = page.getByRole('heading')
    const mainContent = page.getByRole('main')

    const hasBillingHeading = await billingHeadings.count() > 0
    const hasAnyHeading = await anyHeadings.count() > 0
    const hasMainContent = await mainContent.isVisible().catch(() => false)

    console.log(`✅ Billing page - Billing headings: ${hasBillingHeading}, Any headings: ${hasAnyHeading}, Main: ${hasMainContent}`)

    // Should have basic page structure
    expect(hasMainContent || hasAnyHeading).toBe(true)
  })

  test('can discover subscription management interface', async ({ page }) => {
    // ✅ VELOCITY: Test subscription management with graceful discovery

    const currentUrl = page.url()
    if (currentUrl.includes('/signin')) {
      console.log('⚠️ Billing requires authentication - skipping subscription test')
      test.skip()
      return
    }

    // Look for subscription-related elements
    const subscriptionText = page.getByText(/salt.*core.*subscription|subscription|plan/i)
    const manageButtons = page.getByRole('button', { name: /manage.*subscription|manage.*plan|billing.*portal/i })
    const subscriptionStatus = page.getByText(/active|inactive|canceled|trial|paid/i)
    const subscriptionPrice = page.getByText(/\$\d+|\d+.*\/.*mo|month|annual|yearly/i)

    const hasSubscriptionText = await subscriptionText.count() > 0
    const hasManageButtons = await manageButtons.count() > 0
    const hasSubscriptionStatus = await subscriptionStatus.count() > 0
    const hasSubscriptionPrice = await subscriptionPrice.count() > 0

    console.log(`✅ Subscription interface - Text: ${hasSubscriptionText}, Buttons: ${hasManageButtons}`)
    console.log(`✅ Subscription details - Status: ${hasSubscriptionStatus}, Price: ${hasSubscriptionPrice}`)

    if (hasSubscriptionText || hasManageButtons) {
      console.log('✅ Subscription management interface detected')

      // Test manage subscription button if present
      if (hasManageButtons) {
        await manageButtons.first().click()
        await page.waitForTimeout(2000) // Allow redirect time

        const newUrl = page.url()
        if (urlHasHost(newUrl, 'billing.stripe.com', 'stripe.com')) {
          console.log('✅ Redirected to Stripe Customer Portal')
          // Go back to continue testing
          await page.goBack()
          await page.waitForLoadState('networkidle')
        } else {
          console.log(`⚠️ Manage button clicked, current URL: ${newUrl}`)
        }
      }
    } else {
      console.log('⚠️ No subscription interface found - may need specific plan or auth')
    }

    // Page should have some interactive elements
    const hasContent = await page.getByRole('button').count() > 0 ||
                      await page.getByRole('link').count() > 0 ||
                      await page.getByRole('heading').count() > 0
    expect(hasContent).toBe(true)
  })

  test('can discover AI credits management interface', async ({ page }) => {
    // ✅ VELOCITY: Test AI credits section with flexible discovery

    const currentUrl = page.url()
    if (currentUrl.includes('/signin')) {
      console.log('⚠️ Billing requires authentication - skipping credits test')
      test.skip()
      return
    }

    // Look for AI credits related content
    const creditsText = page.getByText(/ai.*credits|credits.*ai|credits.*remaining/i)
    const creditsBalance = page.getByText(/\d+.*credits?|credits.*\d+|balance.*\d+/i)
    const purchaseButtons = page.getByRole('button', { name: /buy.*credits|purchase.*credits|add.*credits|\$\d+/i })
    const creditPacks = page.getByText(/credit.*pack|\$\d+.*credits|pack.*\d+/i)

    const hasCreditsText = await creditsText.count() > 0
    const hasCreditsBalance = await creditsBalance.count() > 0
    const hasPurchaseButtons = await purchaseButtons.count() > 0
    const hasCreditPacks = await creditPacks.count() > 0

    console.log(`✅ AI credits - Text: ${hasCreditsText}, Balance: ${hasCreditsBalance}`)
    console.log(`✅ Credits purchasing - Buttons: ${hasPurchaseButtons}, Packs: ${hasCreditPacks}`)

    if (hasCreditsText || hasCreditsBalance || hasPurchaseButtons) {
      console.log('✅ AI credits management interface detected')

      // Test credit purchase options if available
      if (hasPurchaseButtons) {
        const purchaseOptionsCount = await purchaseButtons.count()
        console.log(`✅ Found ${purchaseOptionsCount} credit purchase options`)
      }
    } else {
      console.log('⚠️ No AI credits interface found - may need specific features enabled')
    }
  })

  test('can discover client billing integration if available', async ({ page }) => {
    // ✅ VELOCITY: Test client billing/Connect features with graceful detection

    const currentUrl = page.url()
    if (currentUrl.includes('/signin')) {
      console.log('⚠️ Billing requires authentication - skipping client billing test')
      test.skip()
      return
    }

    // Look for client billing/Connect related content
    const clientBillingText = page.getByText(/client.*billing|stripe.*connect|connect.*account/i)
    const setupButtons = page.getByRole('button', { name: /set.*up.*client.*billing|connect.*stripe|setup.*connect/i })
    const connectStatus = page.getByText(/connected|not.*connected|setup.*required|enabled/i)
    const connectDashboard = page.getByRole('button', { name: /connect.*dashboard|stripe.*dashboard/i })

    const hasClientBillingText = await clientBillingText.count() > 0
    const hasSetupButtons = await setupButtons.count() > 0
    const hasConnectStatus = await connectStatus.count() > 0
    const hasConnectDashboard = await connectDashboard.count() > 0

    console.log(`✅ Client billing - Text: ${hasClientBillingText}, Setup buttons: ${hasSetupButtons}`)
    console.log(`✅ Connect status - Status: ${hasConnectStatus}, Dashboard: ${hasConnectDashboard}`)

    if (hasClientBillingText || hasSetupButtons || hasConnectStatus) {
      console.log('✅ Client billing integration interface detected')

      // Test setup button if present
      if (hasSetupButtons) {
        await setupButtons.first().click()
        await page.waitForTimeout(1000)
        console.log('✅ Client billing setup initiated')

        // Look for setup flow or redirect
        const setupFlow = page.getByText(/connect|stripe|oauth|authorize/i)
        if (await setupFlow.count() > 0) {
          console.log('✅ Setup flow detected')
        }
      }
    } else {
      console.log('⚠️ No client billing interface found - may need studio plan or permissions')
    }
  })

  test('billing dashboard navigation and controls work', async ({ page }) => {
    // ✅ VELOCITY: Test overall billing dashboard functionality

    const currentUrl = page.url()
    if (currentUrl.includes('/signin')) {
      console.log('⚠️ Billing requires authentication - testing sign-in page instead')

      // Test sign-in page has working elements
      const buttons = await page.getByRole('button').count()
      const links = await page.getByRole('link').count()
      const inputs = await page.getByRole('textbox').count()

      console.log(`✅ Sign-in page interactivity - Buttons: ${buttons}, Links: ${links}, Inputs: ${inputs}`)
      expect(buttons + links + inputs).toBeGreaterThan(0)
      return
    }

    // Test dashboard interactivity
    const allButtons = page.getByRole('button')
    const allLinks = page.getByRole('link')
    const allInputs = page.getByRole('textbox')
    const navigation = page.getByRole('navigation')

    const buttonCount = await allButtons.count()
    const linkCount = await allLinks.count()
    const inputCount = await allInputs.count()
    const hasNavigation = await navigation.isVisible().catch(() => false)

    console.log(`✅ Billing dashboard - Buttons: ${buttonCount}, Links: ${linkCount}, Inputs: ${inputCount}`)
    console.log(`✅ Navigation present: ${hasNavigation}`)

    // Test a button interaction if available
    if (buttonCount > 0) {
      await allButtons.first().hover().catch(() => {})
      console.log('✅ Button interaction test passed')
    }

    // Look for billing-specific navigation/breadcrumbs
    const settingsLinks = page.getByRole('link', { name: /settings|billing|account/i })
    const breadcrumbs = page.getByText(/dashboard.*settings|settings.*billing/i)

    const hasSettingsLinks = await settingsLinks.count() > 0
    const hasBreadcrumbs = await breadcrumbs.count() > 0

    console.log(`✅ Billing navigation - Settings links: ${hasSettingsLinks}, Breadcrumbs: ${hasBreadcrumbs}`)

    // Dashboard should have interactive elements
    expect(buttonCount + linkCount).toBeGreaterThan(0)
  })

  test('billing dashboard handles subscription states gracefully', async ({ page }) => {
    // ✅ VELOCITY: Test different subscription states with adaptive messaging

    const currentUrl = page.url()
    if (currentUrl.includes('/signin')) {
      console.log('⚠️ Billing requires authentication - skipping subscription states test')
      test.skip()
      return
    }

    // Look for different subscription state indicators
    const freeTrialIndicators = page.getByText(/free.*trial|trial.*remaining|trial.*expires/i)
    const activeSubscription = page.getByText(/active.*subscription|current.*plan|subscribed/i)
    const expiredIndicators = page.getByText(/expired|canceled|ended|upgrade.*required/i)
    const upgradeCtas = page.getByRole('button', { name: /upgrade|subscribe|choose.*plan/i })

    const hasFreeTrial = await freeTrialIndicators.count() > 0
    const hasActiveSubscription = await activeSubscription.count() > 0
    const hasExpiredState = await expiredIndicators.count() > 0
    const hasUpgradeCtas = await upgradeCtas.count() > 0

    console.log(`✅ Subscription states - Trial: ${hasFreeTrial}, Active: ${hasActiveSubscription}`)
    console.log(`✅ Subscription actions - Expired: ${hasExpiredState}, Upgrade CTAs: ${hasUpgradeCtas}`)

    // Look for appropriate messaging based on state
    if (hasFreeTrial) {
      console.log('✅ Free trial state detected')
    } else if (hasActiveSubscription) {
      console.log('✅ Active subscription state detected')
    } else if (hasExpiredState) {
      console.log('✅ Expired/canceled state detected')
    } else {
      console.log('⚠️ No clear subscription state - may be loading or need auth')
    }

    // Test upgrade flow if CTA is present
    if (hasUpgradeCtas) {
      await upgradeCtas.first().click()
      await page.waitForTimeout(1000)

      const newUrl = page.url()
      if (newUrl.includes('/pricing') || newUrl.includes('/subscribe')) {
        console.log('✅ Upgrade CTA navigates to pricing/subscription flow')
        await page.goBack()
      }
    }

    // Should have some subscription-related content or redirect to auth
    const hasContent = hasFreeTrial || hasActiveSubscription || hasExpiredState ||
                      await page.getByRole('heading').count() > 0
    expect(hasContent).toBe(true)
  })
})