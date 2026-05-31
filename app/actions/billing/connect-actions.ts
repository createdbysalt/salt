/**
 * Stripe Connect Billing Server Actions
 * Studio owners managing client billing through Roundtables (Stripe Connect)
 */

"use server";

import { createClient } from "@/app/_lib/supabase/server";
import {
  createConnectAccount,
  createAccountLink,
  getConnectAccount,
  createBridgeInvoiceCheckout,
  createBridgeSubscriptionCheckout,
  cancelBridgeSubscription,
  createDashboardLink,
} from "@/app/_lib/stripe/stripe-connect";
import {
  CreateConnectAccountSchema,
  CreateBridgeInvoiceSchema,
  CreateBridgeInvoiceCheckoutSchema,
  CreateBridgeRetainerCheckoutSchema,
  CancelRetainerSchema,
  SendInvoiceSchema,
  safeParse,
  success,
  error,
  mapStripeError,
  type ActionResponse,
} from "./schemas";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import * as crypto from "crypto";

/**
 * Create Stripe Connect Express account for studio owner
 */
export async function createConnectAccountAction(
  input: unknown
): Promise<ActionResponse<{ accountId: string; onboardingUrl: string }>> {
  try {
    const parseResult = safeParse(CreateConnectAccountSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const { country, businessType, returnUrl, refreshUrl } = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return error("PROFILE_NOT_FOUND", "Profile not found");
    }

    // Check if already has Connect account
    if (profile.stripe_connect_account_id) {
      return error("ACCOUNT_EXISTS", "You already have a Connect account");
    }

    // Create Connect account
    const account = await createConnectAccount({
      email: profile.email,
      country,
      businessType,
      metadata: {
        user_id: user.id,
      },
    });

    // Save account ID to profile
    await supabase
      .from("profiles")
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_status: "pending",
      })
      .eq("id", user.id);

    // Create onboarding link
    const { url } = await createAccountLink({
      accountId: account.id,
      refreshUrl,
      returnUrl,
      type: "account_onboarding",
    });

    return success({
      accountId: account.id,
      onboardingUrl: url,
    });
  } catch (err: any) {
    console.error("Create Connect account error:", err);
    return mapStripeError(err);
  }
}

/**
 * Create Connect onboarding link (for resuming onboarding)
 */
export async function createConnectOnboardingLinkAction(input: {
  returnUrl: string;
  refreshUrl: string;
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
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return error("NO_ACCOUNT", "No Connect account found");
    }

    const { url } = await createAccountLink({
      accountId: profile.stripe_connect_account_id,
      refreshUrl: input.refreshUrl,
      returnUrl: input.returnUrl,
      type: "account_onboarding",
    });

    return success({ url });
  } catch (err: any) {
    console.error("Create onboarding link error:", err);
    return mapStripeError(err);
  }
}

/**
 * Get Connect account status
 */
export async function getConnectAccountStatusAction(): Promise<
  ActionResponse<{
    accountId: string | null;
    status: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
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
      .select(
        "stripe_connect_account_id, stripe_connect_status, stripe_connect_charges_enabled, stripe_connect_payouts_enabled"
      )
      .eq("id", user.id)
      .single();

    if (!profile) {
      return error("PROFILE_NOT_FOUND", "Profile not found");
    }

    // If no account, return default state
    if (!profile.stripe_connect_account_id) {
      return success({
        accountId: null,
        status: "not_created",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      });
    }

    // Get fresh account data from Stripe
    const account = await getConnectAccount(profile.stripe_connect_account_id);

    // Update profile with latest status
    await supabase
      .from("profiles")
      .update({
        stripe_connect_charges_enabled: account.charges_enabled,
        stripe_connect_payouts_enabled: account.payouts_enabled,
        stripe_connect_details_submitted: account.details_submitted,
        stripe_connect_status: account.charges_enabled ? "active" : "pending",
      })
      .eq("id", user.id);

    return success({
      accountId: account.id,
      status: account.charges_enabled ? "active" : "pending",
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (err: any) {
    console.error("Get Connect account status error:", err);
    return mapStripeError(err);
  }
}

/**
 * Create Bridge invoice (studio owner → client)
 */
export async function createBridgeInvoiceAction(
  input: unknown
): Promise<ActionResponse<{ invoiceId: string }>> {
  try {
    const parseResult = safeParse(CreateBridgeInvoiceSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const data = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    // Get studio ID from user
    const { data: studioMember } = await supabase
      .from("studio_members")
      .select("studio_id")
      .eq("user_id", user.id)
      .single();

    if (!studioMember) {
      return error("NO_STUDIO", "No studio found for user");
    }

    // Verify client belongs to studio
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("id", data.clientId)
      .eq("studio_id", studioMember.studio_id)
      .single();

    if (!client) {
      return error("CLIENT_NOT_FOUND", "Client not found or doesn't belong to your studio");
    }

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("portal_invoices")
      .insert({
        studio_id: studioMember.studio_id,
        client_id: data.clientId,
        project_id: data.projectId,
        amount_cents: data.amountCents,
        currency: data.currency,
        description: data.description,
        due_date: data.dueDate,
        status: "draft",
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice creation error:", invoiceError);
      return error("INVOICE_CREATION_FAILED", "Failed to create invoice");
    }

    return success({ invoiceId: invoice.id });
  } catch (err: any) {
    console.error("Create Bridge invoice error:", err);
    return error("SERVER_ERROR", "Failed to create invoice");
  }
}

/**
 * Create Stripe Checkout session for Bridge invoice payment
 */
export async function createBridgeInvoiceCheckoutAction(
  input: unknown
): Promise<ActionResponse<{ url: string; sessionId: string }>> {
  try {
    const parseResult = safeParse(CreateBridgeInvoiceCheckoutSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const { invoiceId, successUrl, cancelUrl } = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    // Get invoice with studio and client data
    const { data: invoice } = await supabase
      .from("portal_invoices")
      .select(
        `
        *,
        studio:studios!studio_id(owner_id),
        client:clients!client_id(contact_email)
      `
      )
      .eq("id", invoiceId)
      .single();

    if (!invoice) {
      return error("INVOICE_NOT_FOUND", "Invoice not found");
    }

    // Get studio owner's Connect account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", invoice.studio.owner_id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return error("NO_CONNECT_ACCOUNT", "Studio owner has not set up payment processing");
    }

    if (!profile.stripe_connect_charges_enabled) {
      return error("ACCOUNT_NOT_READY", "Studio owner's payment account is not yet activated");
    }

    // Create Stripe Checkout session on connected account
    const { url, sessionId } = await createBridgeInvoiceCheckout({
      connectedAccountId: profile.stripe_connect_account_id,
      amount: invoice.amount_cents,
      currency: invoice.currency,
      description: invoice.description || "Invoice Payment",
      customerEmail: invoice.client.contact_email,
      successUrl,
      cancelUrl,
      metadata: {
        invoice_id: invoice.id,
        client_id: invoice.client_id,
        studio_id: invoice.studio_id,
      },
    });

    // Update invoice status to sent
    await supabase
      .from("portal_invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return success({ url, sessionId });
  } catch (err: any) {
    console.error("Create Bridge invoice checkout error:", err);
    return mapStripeError(err);
  }
}

/**
 * Create Stripe Checkout session for Bridge subscription (retainer)
 * Also creates a pending record in the database immediately
 */
export async function createBridgeRetainerCheckoutAction(
  input: unknown
): Promise<ActionResponse<{ url: string; sessionId: string; subscriptionId: string }>> {
  try {
    const parseResult = safeParse(CreateBridgeRetainerCheckoutSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const { retainerData, successUrl, cancelUrl } = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    // Get studio ID
    const { data: studioMember } = await supabase
      .from("studio_members")
      .select("studio_id")
      .eq("user_id", user.id)
      .single();

    if (!studioMember) {
      return error("NO_STUDIO", "No studio found");
    }

    // Get client with email
    const { data: client } = await supabase
      .from("clients")
      .select("id, contact_email, name")
      .eq("id", retainerData.clientId)
      .eq("studio_id", studioMember.studio_id)
      .single();

    if (!client) {
      return error("CLIENT_NOT_FOUND", "Client not found");
    }

    // Get studio owner's Connect account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_connect_account_id || !profile.stripe_connect_charges_enabled) {
      return error("ACCOUNT_NOT_READY", "Payment processing is not set up");
    }

    // Create pending subscription record in database first
    const { data: pendingSubscription, error: dbError } = await supabase
      .from("portal_client_subscriptions")
      .insert({
        studio_id: studioMember.studio_id,
        client_id: client.id,
        project_id: retainerData.projectId || null,
        status: "pending",
        amount_cents: retainerData.amountCents,
        currency: retainerData.currency || "usd",
        interval: retainerData.interval,
        interval_count: retainerData.intervalCount || 1,
        description: retainerData.description,
      })
      .select()
      .single();

    if (dbError || !pendingSubscription) {
      console.error("Failed to create pending subscription:", dbError);
      return error("DB_ERROR", "Failed to create retainer record");
    }

    // Create Stripe Checkout session for subscription
    const { url, sessionId } = await createBridgeSubscriptionCheckout({
      connectedAccountId: profile.stripe_connect_account_id,
      customerEmail: client.contact_email,
      amount: retainerData.amountCents,
      currency: retainerData.currency,
      interval: retainerData.interval,
      intervalCount: retainerData.intervalCount,
      description: retainerData.description,
      successUrl,
      cancelUrl,
      metadata: {
        client_id: client.id,
        studio_id: studioMember.studio_id,
        project_id: retainerData.projectId || "",
        subscription_record_id: pendingSubscription.id,
      },
    });

    // Update pending record with checkout session ID
    await supabase
      .from("portal_client_subscriptions")
      .update({ stripe_checkout_session_id: sessionId })
      .eq("id", pendingSubscription.id);

    return success({ url, sessionId, subscriptionId: pendingSubscription.id });
  } catch (err: any) {
    console.error("Create Bridge retainer checkout error:", err);
    return mapStripeError(err);
  }
}

/**
 * Cancel Bridge retainer subscription
 */
export async function cancelBridgeRetainerAction(
  input: unknown
): Promise<ActionResponse<{ message: string }>> {
  try {
    const parseResult = safeParse(CancelRetainerSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const { subscriptionId, immediately } = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from("portal_client_subscriptions")
      .select("stripe_subscription_id, studio:studios!studio_id(owner_id)")
      .eq("id", subscriptionId)
      .single();

    if (!subscription) {
      return error("SUBSCRIPTION_NOT_FOUND", "Subscription not found");
    }

    // Verify user owns this subscription's studio
    if ((subscription.studio as any)?.owner_id !== user.id) {
      return error("FORBIDDEN", "You don't have permission to cancel this subscription");
    }

    // Get Connect account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return error("NO_CONNECT_ACCOUNT", "No Connect account found");
    }

    // Cancel subscription on connected account
    await cancelBridgeSubscription(
      subscription.stripe_subscription_id,
      profile.stripe_connect_account_id,
      immediately
    );

    return success({
      message: immediately
        ? "Subscription canceled immediately"
        : "Subscription will cancel at end of billing period",
    });
  } catch (err: any) {
    console.error("Cancel Bridge retainer error:", err);
    return mapStripeError(err);
  }
}

/**
 * Create Connect Dashboard login link
 */
export async function createConnectDashboardLinkAction(): Promise<
  ActionResponse<{ url: string }>
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
      .select("stripe_connect_account_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_connect_account_id) {
      return error("NO_ACCOUNT", "No Connect account found");
    }

    const { url } = await createDashboardLink(profile.stripe_connect_account_id);

    return success({ url });
  } catch (err: any) {
    console.error("Create dashboard link error:", err);
    return mapStripeError(err);
  }
}

/**
 * Send invoice to client - generates tokenized payment link
 * Updates invoice status to 'sent' and creates access token with 30-day TTL
 */
export async function sendInvoiceAction(
  input: unknown
): Promise<ActionResponse<{ paymentUrl: string; expiresAt: string }>> {
  try {
    const parseResult = safeParse(SendInvoiceSchema, input);
    if (!parseResult.ok) {
      return error("VALIDATION_ERROR", "Invalid input parameters");
    }
    const { invoiceId } = parseResult.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return error("UNAUTHORIZED", "You must be logged in");
    }

    // Get user's studio
    const { data: studioMember } = await supabase
      .from("studio_members")
      .select("studio_id")
      .eq("user_id", user.id)
      .single();

    if (!studioMember) {
      return error("NO_STUDIO", "No studio found for user");
    }

    // Get invoice and verify ownership
    const { data: invoice } = await supabase
      .from("portal_invoices")
      .select("id, status, studio_id")
      .eq("id", invoiceId)
      .eq("studio_id", studioMember.studio_id)
      .single();

    if (!invoice) {
      return error("INVOICE_NOT_FOUND", "Invoice not found or doesn't belong to your studio");
    }

    if (invoice.status !== "draft") {
      return error("INVALID_STATUS", "Only draft invoices can be sent");
    }

    // Generate secure token (32 bytes = 256 bits)
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Hash the token for storage (we store hash, not raw token)
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Use admin client to insert token (bypasses RLS for service role)
    const adminSupabase = createAdminClient();

    // Revoke any existing active tokens for this invoice
    await adminSupabase.rpc("revoke_invoice_tokens", { p_invoice_id: invoiceId });

    // Insert new token
    const { error: tokenError } = await adminSupabase
      .from("portal_invoice_access_tokens")
      .insert({
        invoice_id: invoiceId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        last_sent_at: new Date().toISOString(),
      });

    if (tokenError) {
      console.error("Token creation error:", tokenError);
      return error("TOKEN_CREATION_FAILED", "Failed to generate payment link");
    }

    // Update invoice status to sent
    const { error: updateError } = await supabase
      .from("portal_invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Invoice update error:", updateError);
      return error("UPDATE_FAILED", "Failed to update invoice status");
    }

    // Build the payment URL (client-facing route)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentUrl = `${baseUrl}/table/invoices/${rawToken}`;

    return success({
      paymentUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error("Send invoice error:", err);
    return error("SERVER_ERROR", "Failed to send invoice");
  }
}


