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
import { safeSameOriginAbsoluteUrl } from "@/app/_lib/security/safe-url";
import { safeRedirectPath } from "@/app/_lib/security/safe-redirect";
import {
  resolveLegacyCheckoutPriceId,
} from "@/app/_lib/stripe/checkout-allowlist";
import { resolveSaasPriceId } from "@/app/_lib/stripe/saas-price-ids";
import {
  BillingIntervalSchema,
  SaasTierSchema,
} from "./schemas";

function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function resolveSafeRedirectUrl(candidate: string | undefined, fallbackPath: string): string {
  const origin = getSiteOrigin();
  const safePath = safeRedirectPath(candidate);
  if (safePath) {
    return `${origin}${safePath}`;
  }

  const safeAbsolute = safeSameOriginAbsoluteUrl(candidate, origin);
  if (safeAbsolute) {
    return safeAbsolute;
  }

  return `${origin}${fallbackPath}`;
}

/**
 * Redirect to Stripe Customer Portal for managing SaaS subscription
 */
export async function redirectToSaasBillingPortalAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.customer_id) {
    console.error("No customer ID found for user:", user.id);
    redirect("/settings/billing?error=no_customer");
  }

  const returnPath = safeRedirectPath(formData.get("returnUrl")?.toString()) ?? "/settings/billing";
  const baseUrl = getSiteOrigin();

  let portalUrl: string;

  try {
    const result = await createCustomerPortalSession(
      profile.customer_id,
      `${baseUrl}${returnPath}`,
    );
    portalUrl = result.url;
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    redirect("/settings/billing?error=portal_failed");
  }

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

  const tierParse = SaasTierSchema.safeParse(formData.get("tier")?.toString());
  const intervalParse = BillingIntervalSchema.safeParse(formData.get("interval")?.toString() ?? "month");

  if (!tierParse.success || !intervalParse.success) {
    redirect("/settings/billing?error=invalid_plan");
  }

  const priceId = resolveSaasPriceId(tierParse.data, intervalParse.data);
  if (!priceId) {
    redirect("/settings/billing?error=invalid_plan");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_id, email")
    .eq("id", user.id)
    .single();

  const successUrl = resolveSafeRedirectUrl(
    formData.get("successUrl")?.toString(),
    "/settings/billing?success=true",
  );
  const cancelUrl = resolveSafeRedirectUrl(
    formData.get("cancelUrl")?.toString(),
    "/settings/billing?canceled=true",
  );

  let checkoutUrl: string;

  try {
    const result = await createSaasSubscriptionCheckout({
      customerId: profile?.customer_id || undefined,
      customerEmail: profile?.customer_id ? undefined : (profile?.email || user.email),
      priceId,
      successUrl,
      cancelUrl,
      trialPeriodDays: tierParse.data === "professional" && intervalParse.data === "month" ? 14 : undefined,
      clientReferenceId: user.id,
      metadata: {
        user_id: user.id,
        type: "saas_subscription",
        tier: tierParse.data,
        interval: intervalParse.data,
      },
    });
    checkoutUrl = result.url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    redirect("/settings/billing?error=checkout_failed");
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
    redirect("/settings/billing?error=invalid_pack");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.customer_id) {
    redirect("/settings/billing?error=no_customer");
  }

  const successUrl = resolveSafeRedirectUrl(
    formData.get("successUrl")?.toString(),
    "/settings/billing?credit_success=true",
  );
  const cancelUrl = resolveSafeRedirectUrl(
    formData.get("cancelUrl")?.toString(),
    "/settings/billing?canceled=true",
  );

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
    redirect("/settings/billing?error=checkout_failed");
  }

  redirect(checkoutUrl);
}

/**
 * Redirect to Stripe Checkout for one-time payment (legacy marketing plans)
 */
export async function redirectToOneTimeCheckoutAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const planKey = formData.get("planKey")?.toString();
  const priceId = resolveLegacyCheckoutPriceId(planKey);

  if (!priceId) {
    redirect("/?error=invalid_plan");
  }

  const mode = (formData.get("mode")?.toString() || "payment") as "payment" | "subscription";
  if (mode !== "payment" && mode !== "subscription") {
    redirect("/?error=invalid_mode");
  }

  const successUrl = resolveSafeRedirectUrl(
    formData.get("successUrl")?.toString(),
    "/?success=true",
  );
  const cancelUrl = resolveSafeRedirectUrl(
    formData.get("cancelUrl")?.toString(),
    "/?canceled=true",
  );

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
      successUrl,
      cancelUrl,
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
  console.warn("redirectToBridgeInvoiceCheckoutAction not yet implemented");
  redirect("/hq");
}

/**
 * Redirect to Bridge retainer checkout (for client subscriptions)
 */
export async function redirectToBridgeRetainerCheckoutAction(formData: FormData) {
  console.warn("redirectToBridgeRetainerCheckoutAction not yet implemented");
  redirect("/hq");
}
