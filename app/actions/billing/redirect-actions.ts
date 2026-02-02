"use server";

/**
 * Redirect-style Server Actions for Stripe Billing
 */

import { redirect } from "next/navigation";
import { createClient } from "@/app/_lib/supabase/server";
import {
  createSaasSubscriptionCheckout,
  createCreditPackCheckout,
  createCustomerPortalSession,
} from "@/app/_lib/stripe/stripe-saas";

/**
 * Redirect to Stripe Customer Portal for managing SaaS subscription
 */
export async function redirectToSaasBillingPortalAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Get customer ID from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.customer_id) {
    console.error("No customer ID found for user:", user.id);
    redirect("/studio/settings/billing?error=no_customer");
  }

  const returnUrl = formData.get("returnUrl")?.toString() || "/studio/settings/billing";
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let portalUrl: string;

  try {
    const result = await createCustomerPortalSession(
      profile.customer_id,
      `${baseUrl}${returnUrl}`
    );
    portalUrl = result.url;
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    redirect("/studio/settings/billing?error=portal_failed");
  }

  // Redirect outside of try-catch to avoid catching the redirect error
  redirect(portalUrl);
}

/**
 * Redirect to Stripe Checkout for SaaS subscription
 */
export async function redirectToSaasCheckoutAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const priceId = formData.get("priceId")?.toString();
  if (!priceId) {
    redirect("/studio/settings/billing?error=no_price");
  }

  // Get customer ID from profile (if exists)
  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_id, email")
    .eq("id", user.id)
    .single();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const successUrl = `${baseUrl}/studio/settings/billing?success=true`;
  const cancelUrl = `${baseUrl}/studio/settings/billing?canceled=true`;

  let checkoutUrl: string;

  try {
    const result = await createSaasSubscriptionCheckout({
      customerId: profile?.customer_id || undefined,
      customerEmail: profile?.customer_id ? undefined : (profile?.email || user.email),
      priceId,
      successUrl,
      cancelUrl,
      trialPeriodDays: 14,
      clientReferenceId: user.id,
      metadata: {
        user_id: user.id,
        type: "saas_subscription",
      },
    });
    checkoutUrl = result.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    redirect("/studio/settings/billing?error=checkout_failed");
  }

  redirect(checkoutUrl);
}

/**
 * Redirect to Stripe Checkout for credit pack purchase
 */
export async function redirectToCreditPackCheckoutAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const packSize = parseInt(formData.get("packSize")?.toString() || "0", 10);
  if (![500, 1000, 2000].includes(packSize)) {
    redirect("/studio/settings/billing?error=invalid_pack");
  }

  // Get customer ID from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.customer_id) {
    redirect("/studio/settings/billing?error=no_customer");
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const successUrl = `${baseUrl}/studio/settings/billing?credit_success=true`;
  const cancelUrl = `${baseUrl}/studio/settings/billing?canceled=true`;

  let checkoutUrl: string;

  try {
    const result = await createCreditPackCheckout({
      customerId: profile.customer_id,
      packSize: packSize as 500 | 1000 | 2000,
      successUrl,
      cancelUrl,
      clientReferenceId: user.id,
    });
    checkoutUrl = result.url;
  } catch (error) {
    console.error("Error creating credit pack checkout:", error);
    redirect("/studio/settings/billing?error=checkout_failed");
  }

  redirect(checkoutUrl);
}

/**
 * Redirect to Stripe Checkout for one-time payment (legacy flow)
 * Used by ButtonCheckout component for one-time purchases
 */
export async function redirectToOneTimeCheckoutAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const priceId = formData.get("priceId")?.toString();
  const mode = (formData.get("mode")?.toString() || "payment") as "payment" | "subscription";
  const successUrl = formData.get("successUrl")?.toString();
  const cancelUrl = formData.get("cancelUrl")?.toString();

  if (!priceId) {
    redirect("/?error=no_price");
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const finalSuccessUrl = successUrl || `${baseUrl}/?success=true`;
  const finalCancelUrl = cancelUrl || `${baseUrl}/?canceled=true`;

  // Get customer info if user is logged in
  let customerData: { customerId?: string; email?: string } = {};
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("customer_id, email")
      .eq("id", user.id)
      .single();

    if (profile) {
      customerData = {
        customerId: profile.customer_id || undefined,
        email: profile.email || user.email || undefined,
      };
    }
  }

  let checkoutUrl: string | null;

  try {
    const { createCheckout } = await import("@/app/_lib/stripe/stripe");
    checkoutUrl = await createCheckout({
      priceId,
      mode,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      clientReferenceId: user?.id,
      user: customerData,
    });

    if (!checkoutUrl) {
      throw new Error("Failed to create checkout session");
    }
  } catch (error) {
    console.error("Error creating one-time checkout:", error);
    redirect("/?error=checkout_failed");
  }

  redirect(checkoutUrl);
}

/**
 * Redirect to Bridge invoice checkout (for client payments)
 */
export async function redirectToBridgeInvoiceCheckoutAction(formData: FormData) {
  // TODO: Implement when Connect checkout is needed
  console.warn("redirectToBridgeInvoiceCheckoutAction not yet implemented");
  redirect("/studio");
}

/**
 * Redirect to Bridge retainer checkout (for client subscriptions)
 */
export async function redirectToBridgeRetainerCheckoutAction(formData: FormData) {
  // TODO: Implement when Connect checkout is needed
  console.warn("redirectToBridgeRetainerCheckoutAction not yet implemented");
  redirect("/studio");
}
