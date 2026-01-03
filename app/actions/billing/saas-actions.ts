/**
 * SaaS Billing Server Actions
 * Studio owners managing their Salt Core subscriptions
 */

"use server";

import { createClient } from "@/libs/supabase/server";
import {
  createSaasSubscriptionCheckout,
  createCreditPackCheckout,
  createCustomerPortalSession,
  updateSubscriptionPrice,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  getUpcomingInvoice,
} from "@/libs/stripe-saas";
import {
  CreateSaasCheckoutSchema,
  BuyCreditPackSchema,
  UpgradePlanSchema,
  safeParse,
  success,
  error,
  mapStripeError,
  type ActionResponse,
} from "./schemas";

// Price IDs per tier/interval (from config or env)
const PRICE_IDS = {
  solo_monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || "price_solo_month",
  solo_annual: process.env.STRIPE_PRICE_SOLO_ANNUAL || "price_solo_year",
  professional_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_month",
  professional_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "price_pro_year",
  studio_monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY || "price_studio_month",
  studio_annual: process.env.STRIPE_PRICE_STUDIO_ANNUAL || "price_studio_year",
} as const;

/**
 * Create Stripe Checkout session for SaaS subscription
 * Professional tier gets 14-day trial
 */
export async function createSaasCheckoutSessionAction(
  input: unknown
): Promise<ActionResponse<{ url: string; sessionId: string }>> {
  try {
    // Validate input
    const parseResult = safeParse(CreateSaasCheckoutSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const { tier, interval, successUrl, cancelUrl } = parseResult.data;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return error("UNAUTHORIZED", "You must be logged in to subscribe");
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id, email, saas_subscription_status")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return error("PROFILE_NOT_FOUND", "User profile not found");
    }

    // Check if already subscribed
    if (
      profile.saas_subscription_status &&
      profile.saas_subscription_status !== "none" &&
      profile.saas_subscription_status !== "canceled"
    ) {
      return error("ALREADY_SUBSCRIBED", "You already have an active subscription");
    }

    // Get price ID
    const priceKey = `${tier}_${interval}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];

    // Determine trial period (Professional tier only)
    const trialDays = tier === "professional" && interval === "month" ? 14 : undefined;

    // Create checkout session
    const { url, sessionId } = await createSaasSubscriptionCheckout({
      customerId: profile.customer_id || undefined,
      customerEmail: profile.email || user.email,
      priceId,
      successUrl,
      cancelUrl,
      trialPeriodDays: trialDays,
      clientReferenceId: user.id,
      metadata: {
        user_id: user.id,
        tier,
        interval,
      },
    });

    return success({ url, sessionId });
  } catch (err: any) {
    console.error("Create SaaS checkout error:", err);
    return mapStripeError(err);
  }
}

/**
 * Create billing portal session (manage subscription, payment methods)
 */
export async function createBillingPortalAction(input: {
  returnUrl: string;
}): Promise<ActionResponse<{ url: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.customer_id) {
      return error("NO_CUSTOMER", "No billing account found. Please subscribe first.");
    }

    const { url } = await createCustomerPortalSession(
      profile.customer_id,
      input.returnUrl
    );

    return success({ url });
  } catch (err: any) {
    console.error("Create billing portal error:", err);
    return mapStripeError(err);
  }
}

/**
 * Upgrade/downgrade subscription plan
 */
export async function upgradeDowngradePlanAction(
  input: unknown
): Promise<ActionResponse<{ message: string }>> {
  try {
    const parseResult = safeParse(UpgradePlanSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const { newTier, newInterval } = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("saas_subscription_id, saas_tier")
      .eq("id", user.id)
      .single();

    if (!profile?.saas_subscription_id) {
      return error("NO_SUBSCRIPTION", "No active subscription found");
    }

    // Get new price ID
    const interval = newInterval || "month";
    const priceKey = `${newTier}_${interval}` as keyof typeof PRICE_IDS;
    const newPriceId = PRICE_IDS[priceKey];

    // Update subscription with proration
    await updateSubscriptionPrice(
      profile.saas_subscription_id,
      newPriceId,
      "create_prorations"
    );

    return success({
      message: `Your subscription has been updated to ${newTier}`,
    });
  } catch (err: any) {
    console.error("Upgrade/downgrade plan error:", err);
    return mapStripeError(err);
  }
}

/**
 * Cancel subscription at end of period
 */
export async function cancelSubscriptionAction(): Promise<
  ActionResponse<{ message: string }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("saas_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile?.saas_subscription_id) {
      return error("NO_SUBSCRIPTION", "No active subscription found");
    }

    const updated = await cancelSubscriptionAtPeriodEnd(profile.saas_subscription_id);

    return success({
      message: `Your subscription will cancel on ${new Date(
        updated.current_period_end * 1000
      ).toLocaleDateString()}`,
    });
  } catch (err: any) {
    console.error("Cancel subscription error:", err);
    return mapStripeError(err);
  }
}

/**
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscriptionAction(): Promise<
  ActionResponse<{ message: string }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("saas_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile?.saas_subscription_id) {
      return error("NO_SUBSCRIPTION", "No active subscription found");
    }

    await reactivateSubscription(profile.saas_subscription_id);

    return success({
      message: "Your subscription has been reactivated",
    });
  } catch (err: any) {
    console.error("Reactivate subscription error:", err);
    return mapStripeError(err);
  }
}

/**
 * Buy AI credit pack
 */
export async function buyCreditsAction(
  input: unknown
): Promise<ActionResponse<{ url: string; sessionId: string }>> {
  try {
    const parseResult = safeParse(BuyCreditPackSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const { packSize, successUrl, cancelUrl } = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.customer_id) {
      return error("NO_CUSTOMER", "Please subscribe first to purchase credit packs");
    }

    const { url, sessionId } = await createCreditPackCheckout({
      customerId: profile.customer_id,
      packSize,
      successUrl,
      cancelUrl,
      clientReferenceId: user.id,
    });

    return success({ url, sessionId });
  } catch (err: any) {
    console.error("Buy credits error:", err);
    return mapStripeError(err);
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatusAction(): Promise<
  ActionResponse<{
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("saas_tier, saas_subscription_status")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return error("PROFILE_NOT_FOUND", "Profile not found");
    }

    // Get subscription details
    const { data: subscription } = await supabase
      .from("saas_subscriptions")
      .select("current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    return success({
      tier: profile.saas_tier || "none",
      status: profile.saas_subscription_status || "none",
      currentPeriodEnd: subscription?.current_period_end || null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
    });
  } catch (err: any) {
    console.error("Get subscription status error:", err);
    return error("SERVER_ERROR", "Failed to get subscription status");
  }
}



