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
} from "./saas-actions";

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
