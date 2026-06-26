/**
 * Stripe SaaS Billing Utilities
 * Handles Salt subscription management (studio owners → Salt)
 */

import Stripe from "stripe";
import { getStripeClient } from "./stripe-client";

export interface CreateSaasCheckoutParams {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
  clientReferenceId?: string;
  metadata?: Record<string, string>;
}

export interface CreateCreditPackCheckoutParams {
  customerId: string;
  packSize: 500 | 1000 | 2000;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId?: string;
}

/**
 * Create Stripe Checkout session for SaaS subscription
 * Supports trial periods for Professional tier
 */
export async function createSaasSubscriptionCheckout(
  params: CreateSaasCheckoutParams
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripeClient();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    tax_id_collection: { enabled: true },
  };

  // Add customer or email
  if (params.customerId) {
    sessionParams.customer = params.customerId;
  } else if (params.customerEmail) {
    sessionParams.customer_email = params.customerEmail;
  }

  // Add trial period if specified (Professional tier: 14 days)
  if (params.trialPeriodDays) {
    sessionParams.subscription_data = {
      trial_period_days: params.trialPeriodDays,
      metadata: params.metadata,
    };
  }

  // Add client reference ID for webhook processing
  if (params.clientReferenceId) {
    sessionParams.client_reference_id = params.clientReferenceId;
  }

  // Add metadata
  if (params.metadata) {
    sessionParams.metadata = params.metadata;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Failed to create Stripe Checkout session: no URL returned");
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

/**
 * Create Stripe Checkout session for one-time credit pack purchase
 * Packs: $25 (500 credits), $40 (1000 credits), $50 (2000 credits)
 * Uses lookup keys to reference Stripe prices (credit_pack_500, credit_pack_1000, credit_pack_2000)
 */
export async function createCreditPackCheckout(
  params: CreateCreditPackCheckoutParams
): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripeClient();

  // Map pack size to lookup key
  const lookupKey = `credit_pack_${params.packSize}`;

  // Retrieve price by lookup key
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });

  if (!prices.data[0]) {
    throw new Error(`Credit pack price not found for lookup key: ${lookupKey}. Run npm run stripe:setup-products first.`);
  }

  const priceId = prices.data[0].id;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: params.customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.clientReferenceId,
    metadata: {
      type: "credit_pack",
      pack_size: params.packSize.toString(),
    },
  });

  if (!session.url) {
    throw new Error("Failed to create credit pack checkout: no URL returned");
  }

  return {
    url: session.url,
    sessionId: session.id,
  };
}

/**
 * Create Stripe Customer Portal session
 * Allows users to manage billing, update payment methods, view invoices
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/**
 * Update subscription to new tier/price
 * Handles proration automatically
 */
export async function updateSubscriptionPrice(
  subscriptionId: string,
  newPriceId: string,
  prorationBehavior: "create_prorations" | "none" = "create_prorations"
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Update to new price
  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: prorationBehavior,
  });

  return updated;
}

/**
 * Cancel subscription at end of period
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  const updated = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return updated;
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  const updated = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return updated;
}

/**
 * Get upcoming invoice preview (for proration calculations)
 */
export async function getUpcomingInvoice(
  customerId: string,
  subscriptionId: string,
  newPriceId?: string
): Promise<Stripe.UpcomingInvoice> {
  const stripe = getStripeClient();

  const params: any = {
    customer: customerId,
    subscription: subscriptionId,
  };

  if (newPriceId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    params.subscription_items = [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ];
  }

  return (stripe.invoices as any).retrieveUpcoming(params);
}

/**
 * Retrieve checkout session by ID
 */
export async function findCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"],
    });
    return session;
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    return null;
  }
}

