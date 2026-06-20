/**
 * Stripe Infrastructure Module
 *
 * Stripe client utilities for Salt SaaS billing (the user paying Salt).
 * The user's own Stripe account connects via the Composio Stripe connector
 * (app/_lib/composio) — Stripe Connect was retired 2026-06-11.
 *
 * Usage:
 *   import { getStripeClient, createSaasSubscriptionCheckout } from '@/app/_lib/stripe'
 */

// Stripe client instances
export { getStripeClient } from "@/app/_lib/stripe/stripe-client";

// SaaS subscription utilities
export {
  createSaasSubscriptionCheckout,
  createCreditPackCheckout,
  createCustomerPortalSession,
  updateSubscriptionPrice,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  getUpcomingInvoice,
  findCheckoutSession,
} from "@/app/_lib/stripe/stripe-saas";

export type {
  CreateSaasCheckoutParams,
  CreateCreditPackCheckoutParams,
} from "@/app/_lib/stripe/stripe-saas";
