/**
 * Stripe Infrastructure Module
 *
 * Stripe client utilities for SaaS subscriptions and Connect payments.
 *
 * Usage:
 *   import { getStripeClient, createSaasSubscriptionCheckout } from '@/app/_lib/stripe'
 */

// Stripe client instances
export { getStripeClient, getStripeConnectClient } from "@/app/_lib/stripe/stripe-client";

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

// Stripe Connect utilities (for client billing)
export {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  createBridgeInvoiceCheckout,
  createBridgeSubscriptionCheckout,
  createDashboardLink,
  cancelBridgeSubscription,
  getBridgeSubscription,
  updateStatementDescriptor,
} from "@/app/_lib/stripe/stripe-connect";

export type {
  CreateConnectAccountParams,
  CreateAccountLinkParams,
  CreateBridgeCheckoutParams,
  CreateBridgeSubscriptionParams,
} from "@/app/_lib/stripe/stripe-connect";
