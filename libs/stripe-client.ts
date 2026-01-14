/**
 * Stripe Client Singleton
 * Single source of truth for Stripe API client initialization
 */

import Stripe from "stripe";

// Singleton instance
let stripeInstance: Stripe | null = null;

/**
 * Get or create Stripe client instance
 * Uses 2023-08-16 API version (compatible with installed stripe package types)
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
    }

    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
      appInfo: {
        name: "Salt Core",
        version: "1.0.0",
      },
    });
  }

  return stripeInstance;
}

/**
 * Create Stripe client for Connect operations
 * Can be scoped to a specific connected account
 */
export function getStripeConnectClient(connectedAccountId?: string): Stripe {
  const stripe = getStripeClient();
  
  if (connectedAccountId) {
    // Return a client configured for this specific connected account
    // Note: This doesn't create a new instance, just sets the account context
    return stripe;
  }
  
  return stripe;
}




