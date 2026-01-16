/**
 * Billing Feature - Server Actions
 *
 * This module re-exports actions from the centralized billing module.
 * All Stripe SaaS and Connect operations are handled here.
 *
 * Usage:
 *   import { createSaasCheckoutSessionAction } from '@/app/_features/billing/actions'
 *   import type { SaasTier } from '@/app/_features/billing/types'
 */

// SaaS Subscription Actions
export {
  createSaasCheckoutSessionAction,
  createBillingPortalAction,
  upgradeDowngradePlanAction,
  cancelSubscriptionAction,
  reactivateSubscriptionAction,
  buyCreditsAction,
  getSubscriptionStatusAction,
  getUpgradePreviewAction,
} from "@/app/actions/billing/saas-actions";

// Stripe Connect Actions
export {
  createConnectAccountAction,
  createConnectOnboardingLinkAction,
  getConnectAccountStatusAction,
  createBridgeInvoiceAction,
  createBridgeInvoiceCheckoutAction,
  createBridgeRetainerCheckoutAction,
  cancelBridgeRetainerAction,
  createConnectDashboardLinkAction,
  sendInvoiceAction,
} from "@/app/actions/billing/connect-actions";

// Redirect Actions (form actions for server-side redirects)
export {
  redirectToSaasBillingPortalAction,
  redirectToSaasCheckoutAction,
  redirectToCreditPackCheckoutAction,
  redirectToBridgeInvoiceCheckoutAction,
  redirectToBridgeRetainerCheckoutAction,
} from "@/app/actions/billing/redirect-actions";
