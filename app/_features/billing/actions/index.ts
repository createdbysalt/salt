/**
 * Billing Actions Index
 * Central export point for all billing-related Server Actions
 *
 * Salt SaaS billing only (the user paying Salt). The user's own Stripe
 * account connects via the Composio Stripe connector — see
 * app/_features/connectors and app/_lib/composio.
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
} from "./saas-actions";

// Redirect Actions (form actions for server-side redirects)
export {
  redirectToSaasBillingPortalAction,
  redirectToSaasCheckoutAction,
  redirectToCreditPackCheckoutAction,
  redirectToOneTimeCheckoutAction,
} from "./redirect-actions";

// Client billing data (project retainers / invoices for a person)
export { getClientBilling, type ClientBillingData } from "./get-client-billing";

// Billing Memory intake (workspace-scoped billing_records)
export {
  BillingRecordDraftSchema,
  type BillingRecordDraft,
  type CreateBillingRecordResult,
} from "./billing-record-draft";
export { createBillingRecordAction } from "./create-billing-record";
export { extractBillingRecordFromDocumentAction } from "./extract-billing-record-from-document";
export {
  markBillingRecordPaidAction,
  type MarkBillingRecordPaidResult,
} from "./mark-billing-record-paid";

// Types & Schemas
export type {
  SaasTier,
  BillingInterval,
  CreateSaasCheckoutInput,
  UpgradePlanInput,
  CreditPackSize,
  BuyCreditPackInput,
  DeductCreditsInput,
  Currency,
  SubscriptionInterval,
  SuccessResponse,
  ErrorResponse,
  ActionResponse,
} from "./schemas";

export {
  SaasTierSchema,
  BillingIntervalSchema,
  CreateSaasCheckoutSchema,
  UpgradePlanSchema,
  CreditPackSizeSchema,
  BuyCreditPackSchema,
  DeductCreditsSchema,
  CurrencySchema,
  SubscriptionIntervalSchema,
  success,
  error,
  mapStripeError,
  safeParse,
} from "./schemas";
