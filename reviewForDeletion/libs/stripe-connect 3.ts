/**
 * Stripe Connect Utilities
 * Handles Express account creation and client billing (studio owners → their clients)
 */

import Stripe from "stripe";
import { getStripeClient } from "./stripe-client";

export interface CreateConnectAccountParams {
  email: string;
  country?: string;
  businessType?: "individual" | "company";
  metadata?: Record<string, string>;
}

export interface CreateAccountLinkParams {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
  type?: "account_onboarding" | "account_update";
}

export interface CreateBridgeCheckoutParams {
  connectedAccountId: string;
  amount: number;
  currency?: string;
  description: string;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CreateBridgeSubscriptionParams {
  connectedAccountId: string;
  customerEmail: string;
  amount: number;
  currency?: string;
  interval: "day" | "week" | "month" | "year";
  intervalCount?: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Create Stripe Connect Express account for studio owner
 * This allows them to charge their clients through The Bridge
 */
export async function createConnectAccount(
  params: CreateConnectAccountParams
): Promise<Stripe.Account> {
  const stripe = getStripeClient();

  const account = await stripe.accounts.create({
    type: "express",
    country: params.country || "US",
    email: params.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: params.businessType || "individual",
    metadata: params.metadata || {},
  });

  return account;
}

/**
 * Create account link for Connect onboarding
 * User clicks this to complete Stripe verification
 */
export async function createAccountLink(
  params: CreateAccountLinkParams
): Promise<{ url: string }> {
  const stripe = getStripeClient();

  const accountLink = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: params.type || "account_onboarding",
  });

  return { url: accountLink.url };
}

/**
 * Retrieve Connect account details
 */
export async function getConnectAccount(
  accountId: string
): Promise<Stripe.Account> {
  const stripe = getStripeClient();
  return stripe.accounts.retrieve(accountId);
}

/**
 * Create Stripe Checkout session on connected account for invoice payment
 * Money goes directly to studio owner's account (0% platform fee)
 */
export async function createBridgeInvoiceCheckout(
  params: CreateBridgeCheckoutParams
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: params.customerEmail,
      line_items: [
        {
          price_data: {
            currency: params.currency || "usd",
            product_data: {
              name: "Invoice Payment",
              description: params.description,
            },
            unit_amount: params.amount, // Already in cents
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: 0, // 0% platform fee
        metadata: params.metadata || {},
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata || {},
    },
    {
      stripeAccount: params.connectedAccountId,
    }
  );

  if (!session.url) {
    throw new Error("Failed to create Bridge invoice checkout: no URL returned");
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

/**
 * Create Stripe Checkout session for subscription (retainer) on connected account
 * Creates a recurring subscription directly on studio owner's Connect account
 */
export async function createBridgeSubscriptionCheckout(
  params: CreateBridgeSubscriptionParams
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripeClient();

  // First, create a price on the connected account
  const price = await stripe.prices.create(
    {
      currency: params.currency || "usd",
      unit_amount: params.amount,
      recurring: {
        interval: params.interval,
        interval_count: params.intervalCount || 1,
      },
      product_data: {
        name: "Client Retainer",
        description: params.description,
      },
      metadata: params.metadata || {},
    },
    {
      stripeAccount: params.connectedAccountId,
    }
  );

  // Create checkout session for subscription
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer_email: params.customerEmail,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      subscription_data: {
        application_fee_percent: 0, // 0% platform fee
        metadata: params.metadata || {},
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata || {},
    },
    {
      stripeAccount: params.connectedAccountId,
    }
  );

  if (!session.url) {
    throw new Error("Failed to create Bridge subscription checkout: no URL returned");
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

/**
 * Create login link for Express Dashboard
 * Allows studio owners to view their Connect dashboard
 */
export async function createDashboardLink(
  accountId: string
): Promise<{ url: string }> {
  const stripe = getStripeClient();

  const link = await stripe.accounts.createLoginLink(accountId);

  return { url: link.url };
}

/**
 * Cancel subscription on connected account
 */
export async function cancelBridgeSubscription(
  subscriptionId: string,
  connectedAccountId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  if (immediately) {
    return stripe.subscriptions.cancel(
      subscriptionId,
      {},
      {
        stripeAccount: connectedAccountId,
      }
    );
  } else {
    return stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      },
      {
        stripeAccount: connectedAccountId,
      }
    );
  }
}

/**
 * Retrieve subscription from connected account
 */
export async function getBridgeSubscription(
  subscriptionId: string,
  connectedAccountId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  return stripe.subscriptions.retrieve(
    subscriptionId,
    {
      expand: ["latest_invoice", "customer"],
    },
    {
      stripeAccount: connectedAccountId,
    }
  );
}

/**
 * Update Connect account to enable custom statement descriptor
 * Shows studio name on client's credit card statement
 */
export async function updateStatementDescriptor(
  accountId: string,
  descriptor: string
): Promise<Stripe.Account> {
  const stripe = getStripeClient();

  // Descriptor must be 22 characters or less
  const truncated = descriptor.substring(0, 22);

  return stripe.accounts.update(accountId, {
    settings: {
      payments: {
        statement_descriptor: truncated,
      },
    },
  });
}



