/**
 * LEGACY STRIPE UTILITIES
 * 
 * This file is maintained for backward compatibility with existing code.
 * New code should use the modular utilities:
 * - libs/stripe-client.ts - Stripe client singleton
 * - libs/stripe-saas.ts - SaaS subscription utilities
 */

import Stripe from "stripe";
import { getStripeClient } from "./stripe-client";
import { 
  findCheckoutSession as findCheckoutSessionNew,
  createCustomerPortalSession,
} from "./stripe-saas";

interface CreateCheckoutParams {
  priceId: string;
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  couponId?: string | null;
  clientReferenceId?: string;
  user?: {
    customerId?: string;
    email?: string;
  };
}

interface CreateCustomerPortalParams {
  customerId: string;
  returnUrl: string;
}

/**
 * @deprecated Use createSaasSubscriptionCheckout from libs/stripe-saas.ts instead
 * Legacy wrapper for backward compatibility
 */
export const createCheckout = async ({
  user,
  mode,
  clientReferenceId,
  successUrl,
  cancelUrl,
  priceId,
  couponId,
}: CreateCheckoutParams): Promise<string | null> => {
  try {
    const stripe = getStripeClient();

    const extraParams: {
      customer?: string;
      customer_creation?: "always";
      customer_email?: string;
      invoice_creation?: { enabled: boolean };
      payment_intent_data?: { setup_future_usage: "on_session" };
      tax_id_collection?: { enabled: boolean };
    } = {};

    if (user?.customerId) {
      extraParams.customer = user.customerId;
    } else {
      if (mode === "payment") {
        extraParams.customer_creation = "always";
        extraParams.payment_intent_data = { setup_future_usage: "on_session" };
      }
      if (user?.email) {
        extraParams.customer_email = user.email;
      }
      extraParams.tax_id_collection = { enabled: true };
    }

    const stripeSession = await stripe.checkout.sessions.create({
      mode,
      allow_promotion_codes: true,
      client_reference_id: clientReferenceId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts: couponId
        ? [
            {
              coupon: couponId,
            },
          ]
        : [],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...extraParams,
    });

    return stripeSession.url;
  } catch (e) {
    console.error(e);
    return null;
  }
};

/**
 * @deprecated Use createCustomerPortalSession from libs/stripe-saas.ts instead
 * Legacy wrapper for backward compatibility
 */
export const createCustomerPortal = async ({
  customerId,
  returnUrl,
}: CreateCustomerPortalParams): Promise<string> => {
  const { url } = await createCustomerPortalSession(customerId, returnUrl);
  return url;
};

/**
 * @deprecated Use findCheckoutSession from libs/stripe-saas.ts instead
 * Legacy wrapper for backward compatibility
 */
export const findCheckoutSession = async (sessionId: string) => {
  return findCheckoutSessionNew(sessionId);
};
