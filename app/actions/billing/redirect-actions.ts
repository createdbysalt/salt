"use server";

/**
 * Redirect-style Server Actions for Stripe Billing
 *
 * These actions handle form submissions that need to redirect to Stripe-hosted pages.
 * They validate input, create Stripe sessions, and redirect the user.
 */

import { redirect } from "next/navigation";
import { verifyInvoiceToken, markTokenSpentForCheckout } from "@/libs/bridge-invoice-tokens";
import { createBridgeInvoiceCheckout } from "@/libs/stripe-connect";
import { createAdminClient } from "@/libs/supabase/admin";

/**
 * Create Stripe Checkout session for Bridge invoice payment and redirect
 * Called from the client invoice payment page form
 */
export async function redirectToBridgeInvoiceCheckoutAction(formData: FormData) {
  const invoiceId = formData.get("invoiceId") as string;
  const token = formData.get("token") as string;
  const successUrl = formData.get("successUrl") as string;
  const cancelUrl = formData.get("cancelUrl") as string;

  // Validate required fields
  if (!invoiceId || !token || !successUrl || !cancelUrl) {
    redirect(`${cancelUrl}?error=missing_fields`);
  }

  // Verify token is still valid
  const verificationResult = await verifyInvoiceToken(token);

  if (!verificationResult.valid) {
    if (verificationResult.reason === "expired" || verificationResult.reason === "revoked") {
      redirect(`/invoices/${token}/expired`);
    }
    redirect(`${cancelUrl}?error=invalid_token`);
  }

  const { invoice, token: tokenRecord } = verificationResult;

  if (!invoice) {
    redirect(`${cancelUrl}?error=invoice_not_found`);
  }

  // Check if invoice is already paid
  if (invoice.status === "paid") {
    redirect(`${cancelUrl}?alreadyPaid=true`);
  }

  // Check if token was already spent for checkout (prevent double-checkout)
  if (tokenRecord?.spentForCheckout) {
    redirect(`${cancelUrl}?error=checkout_in_progress`);
  }

  // Get studio and owner's Connect account
  const supabase = createAdminClient();

  const { data: studio } = await supabase
    .from("studios")
    .select("id, owner_id, name")
    .eq("id", invoice.studioId)
    .single();

  if (!studio) {
    redirect(`${cancelUrl}?error=studio_not_found`);
  }

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", studio.owner_id)
    .single();

  if (!ownerProfile?.stripe_connect_account_id) {
    redirect(`${cancelUrl}?error=no_payment_account`);
  }

  if (!ownerProfile.stripe_connect_charges_enabled) {
    redirect(`${cancelUrl}?error=account_not_active`);
  }

  // Get client email for Stripe Checkout
  const { data: client } = await supabase
    .from("clients")
    .select("contact_email")
    .eq("id", invoice.clientId)
    .single();

  try {
    // Mark token as spent to prevent duplicate checkout sessions
    await markTokenSpentForCheckout(token);

    // Create Stripe Checkout session on the connected account (Direct Charge)
    const { url } = await createBridgeInvoiceCheckout({
      connectedAccountId: ownerProfile.stripe_connect_account_id,
      amount: invoice.amountCents,
      currency: invoice.currency,
      description: invoice.description || "Invoice Payment",
      customerEmail: client?.contact_email,
      successUrl: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl,
      metadata: {
        invoice_id: invoice.id,
        client_id: invoice.clientId,
        studio_id: invoice.studioId,
        token: token,
      },
    });

    // Update invoice status to viewed (they initiated payment)
    await supabase
      .from("bridge_invoices")
      .update({ status: "viewed" })
      .eq("id", invoiceId)
      .eq("status", "sent"); // Only update if still in sent status

    // Redirect to Stripe Checkout
    redirect(url);
  } catch (error) {
    console.error("Failed to create Bridge invoice checkout:", error);
    redirect(`${cancelUrl}?error=checkout_failed`);
  }
}

export async function redirectToBridgeRetainerCheckoutAction(formData: FormData) {
  console.warn("redirectToBridgeRetainerCheckoutAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}

export async function redirectToSaasCheckoutAction(formData: FormData) {
  console.warn("redirectToSaasCheckoutAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}

export async function redirectToSaasBillingPortalAction() {
  console.warn("redirectToSaasBillingPortalAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}

export async function redirectToCreditPackCheckoutAction(formData: FormData) {
  console.warn("redirectToCreditPackCheckoutAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}
