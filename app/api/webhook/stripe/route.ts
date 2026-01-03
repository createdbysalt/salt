/**
 * Stripe SaaS Webhook Handler
 * Processes subscription events for Salt Core (studio owners → Salt Core)
 * 
 * Events handled:
 * - checkout.session.completed (subscription + credit pack purchases)
 * - customer.subscription.* (lifecycle events)
 * - invoice.* (payment success/failure)
 */

import { getStripeClient } from "@/libs/stripe-client";
import { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = getStripeClient();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not defined");
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
async function isEventProcessed(
  supabase: SupabaseClient,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("billing_webhook_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .eq("endpoint", "saas")
    .single();

  return !!data;
}

/**
 * Log webhook event for audit trail and idempotency
 */
async function logWebhookEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
  error?: string
): Promise<void> {
  await supabase.from("billing_webhook_events").insert({
    stripe_event_id: event.id,
    endpoint: "saas",
    event_type: event.type,
    stripe_created: new Date(event.created * 1000).toISOString(),
    payload: event as any,
    processed_at: error ? null : new Date().toISOString(),
    processing_error: error || null,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  // Create service role Supabase client
  const supabase = new SupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify Stripe webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Check idempotency
  if (await isEventProcessed(supabase, event.id)) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, skipped: true });
  }

  const eventType = event.type;

  // Process event
  try {
    switch (eventType) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Differentiate between subscription and credit pack purchase
        const isSubscription = session.mode === "subscription";
        const isCreditPack = session.metadata?.type === "credit_pack";

        if (isSubscription) {
          await handleSubscriptionCheckout(supabase, session);
        } else if (isCreditPack) {
          await handleCreditPackPurchase(supabase, session);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled SaaS webhook event type: ${eventType}`);
    }

    // Log successful processing
    await logWebhookEvent(supabase, event);

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook processing error for ${event.id}:`, err);
    
    // Log error
    await logWebhookEvent(supabase, event, err.message);

    // Return 500 to trigger Stripe retry
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription checkout completion
 */
async function handleSubscriptionCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId = session.client_reference_id;

  // Retrieve subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  
  // Determine tier from metadata
  const tier = session.metadata?.tier || "professional";

  // Find user
  let profile;
  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    profile = data;
  } else {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", customer.email)
      .single();
    profile = data;
  }

  if (!profile) {
    throw new Error(`Profile not found for customer ${customerId}`);
  }

  // Update profile
  await supabase
    .from("profiles")
    .update({
      customer_id: customerId,
      saas_subscription_id: subscriptionId,
      saas_subscription_status: subscription.status,
      saas_tier: tier,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      has_access: true,
    })
    .eq("id", profile.id);

  // Create subscription history record
  await supabase.from("saas_subscriptions").insert({
    user_id: profile.id,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    tier,
    status: subscription.status,
    price_id: priceId,
    interval: subscription.items.data[0].price.recurring?.interval || "month",
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  });

  // Update AI credit allocation based on tier
  const creditAllocations = { solo: 400, professional: 1200, studio: 4000, enterprise: 10000 };
  await supabase
    .from("ai_credit_balances")
    .update({ monthly_allocation: creditAllocations[tier as keyof typeof creditAllocations] || 400 })
    .eq("user_id", profile.id);
}

/**
 * Handle credit pack purchase
 */
async function handleCreditPackPurchase(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const packSize = parseInt(session.metadata?.pack_size || "0");
  const userId = session.client_reference_id;
  const amountPaid = session.amount_total || 0;

  if (!userId || !packSize) {
    throw new Error("Missing user ID or pack size in credit pack purchase");
  }

  // Record purchase
  await supabase.from("ai_credit_purchases").insert({
    user_id: userId,
    pack_size: packSize,
    amount_paid_cents: amountPaid,
    stripe_payment_intent_id: session.payment_intent as string,
    stripe_checkout_session_id: session.id,
  });

  // Add credits to balance
  await supabase.rpc("add_purchased_credits", {
    p_user_id: userId,
    p_credits: packSize,
  });
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  await supabase
    .from("profiles")
    .update({
      saas_subscription_status: subscription.status,
      saas_subscription_id: subscription.id,
    })
    .eq("customer_id", customerId);

  // Update subscription history
  await supabase
    .from("saas_subscriptions")
    .update({
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq("stripe_subscription_id", subscription.id);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  await supabase
    .from("profiles")
    .update({
      saas_subscription_status: "canceled",
      has_access: false,
    })
    .eq("customer_id", customerId);

  await supabase
    .from("saas_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;

  // Grant access on successful payment
  await supabase
    .from("profiles")
    .update({ has_access: true })
    .eq("customer_id", customerId);
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string;

  // Update status but don't immediately revoke access (grace period)
  await supabase
    .from("profiles")
    .update({ saas_subscription_status: "past_due" })
    .eq("customer_id", customerId);

  // TODO: Send payment failure notification email
  console.log(`Payment failed for customer ${customerId}, invoice ${invoice.id}`);
}
