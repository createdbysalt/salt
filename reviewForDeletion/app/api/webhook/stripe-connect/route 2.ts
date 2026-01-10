/**
 * Stripe Connect Webhook Handler
 * Processes events for client billing through The Bridge (connected accounts)
 * 
 * Events handled:
 * - account.updated (Connect account status changes)
 * - checkout.session.completed (invoice payments & subscription starts)
 * - payment_intent.* (direct payment intents if used)
 * - invoice.* (subscription billing on connected accounts)
 * - customer.subscription.* (retainer lifecycle)
 */

import { getStripeClient } from "@/libs/stripe-client";
import { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = getStripeClient();
const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("STRIPE_CONNECT_WEBHOOK_SECRET is not defined");
}

/**
 * Check if webhook event has already been processed
 */
async function isEventProcessed(
  supabase: SupabaseClient,
  eventId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("billing_webhook_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .eq("endpoint", "connect")
    .single();

  return !!data;
}

/**
 * Log webhook event
 */
async function logWebhookEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
  error?: string
): Promise<void> {
  await supabase.from("billing_webhook_events").insert({
    stripe_event_id: event.id,
    endpoint: "connect",
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

  const supabase = new SupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Connect webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  // Check idempotency
  if (await isEventProcessed(supabase, event.id)) {
    console.log(`Connect event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, skipped: true });
  }

  const eventType = event.type;

  // Process event
  try {
    switch (eventType) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(supabase, account);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // This could be either an invoice payment or subscription start
        if (session.mode === "payment") {
          await handleInvoicePaymentCheckout(supabase, session, event.account as string);
        } else if (session.mode === "subscription") {
          await handleSubscriptionCheckout(supabase, session, event.account as string);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(supabase, paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(supabase, paymentIntent);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleSubscriptionInvoicePaid(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleSubscriptionInvoicePaymentFailed(supabase, invoice);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription, event.account as string);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      default:
        console.log(`Unhandled Connect webhook event type: ${eventType}`);
    }

    // Log successful processing
    await logWebhookEvent(supabase, event);

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`Connect webhook processing error for ${event.id}:`, err);
    
    await logWebhookEvent(supabase, event, err.message);

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle Connect account status updates
 */
async function handleAccountUpdated(
  supabase: SupabaseClient,
  account: Stripe.Account
): Promise<void> {
  await supabase
    .from("profiles")
    .update({
      stripe_connect_status: account.charges_enabled ? "active" : "pending",
      stripe_connect_charges_enabled: account.charges_enabled,
      stripe_connect_payouts_enabled: account.payouts_enabled,
      stripe_connect_details_submitted: account.details_submitted,
    })
    .eq("stripe_connect_account_id", account.id);

  console.log(`Connect account ${account.id} updated: charges=${account.charges_enabled}, payouts=${account.payouts_enabled}`);
}

/**
 * Handle invoice payment via Checkout (one-time Bridge invoice)
 */
async function handleInvoicePaymentCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  connectedAccountId: string
): Promise<void> {
  const invoiceId = session.metadata?.invoice_id;

  if (!invoiceId) {
    console.warn("Checkout session missing invoice_id in metadata");
    return;
  }

  // Update invoice status
  await supabase
    .from("bridge_invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  // Record payment
  await supabase.from("bridge_invoice_payments").insert({
    invoice_id: invoiceId,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    amount_cents: session.amount_total || 0,
    status: "succeeded",
    paid_at: new Date().toISOString(),
  });

  console.log(`Invoice ${invoiceId} paid via checkout session ${session.id}`);
}

/**
 * Handle subscription start via Checkout (Bridge retainer)
 */
async function handleSubscriptionCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  connectedAccountId: string
): Promise<void> {
  const subscriptionId = session.subscription as string;
  const clientId = session.metadata?.client_id;
  const studioId = session.metadata?.studio_id;
  const projectId = session.metadata?.project_id;

  if (!subscriptionId || !clientId || !studioId) {
    console.warn("Checkout session missing required metadata for subscription");
    return;
  }

  // Retrieve subscription details from connected account
  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    {},
    { stripeAccount: connectedAccountId }
  );

  const priceAmount = subscription.items.data[0].price.unit_amount || 0;
  const interval = subscription.items.data[0].price.recurring?.interval || "month";
  const intervalCount = subscription.items.data[0].price.recurring?.interval_count || 1;

  // Create subscription record
  await supabase.from("bridge_client_subscriptions").insert({
    studio_id: studioId,
    client_id: clientId,
    project_id: projectId || null,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    amount_cents: priceAmount,
    currency: subscription.currency,
    interval,
    interval_count: intervalCount,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  });

  console.log(`Bridge subscription ${subscriptionId} created for client ${clientId}`);
}

/**
 * Handle PaymentIntent success (if using direct PI flow)
 */
async function handlePaymentIntentSucceeded(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const invoiceId = paymentIntent.metadata?.invoice_id;

  if (invoiceId) {
    await supabase
      .from("bridge_invoices")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    await supabase.from("bridge_invoice_payments").insert({
      invoice_id: invoiceId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: paymentIntent.amount,
      status: "succeeded",
      paid_at: new Date().toISOString(),
    });
  }
}

/**
 * Handle PaymentIntent failure
 */
async function handlePaymentIntentFailed(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const invoiceId = paymentIntent.metadata?.invoice_id;

  if (invoiceId) {
    await supabase
      .from("bridge_invoices")
      .update({ status: "failed" })
      .eq("id", invoiceId);

    await supabase.from("bridge_invoice_payments").insert({
      invoice_id: invoiceId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: paymentIntent.amount,
      status: "failed",
      failure_reason: paymentIntent.last_payment_error?.message || "Payment failed",
    });
  }
}

/**
 * Handle subscription invoice payment (recurring retainer billing)
 */
async function handleSubscriptionInvoicePaid(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  // Find our subscription record
  const { data: subscription } = await supabase
    .from("bridge_client_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!subscription) return;

  // Record invoice
  await supabase.from("bridge_subscription_invoices").insert({
    subscription_id: subscription.id,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_paid,
    status: "paid",
    period_start: new Date(invoice.period_start * 1000).toISOString(),
    period_end: new Date(invoice.period_end * 1000).toISOString(),
    paid_at: new Date().toISOString(),
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf_url: invoice.invoice_pdf,
  });
}

/**
 * Handle subscription invoice payment failure
 */
async function handleSubscriptionInvoicePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  const { data: subscription } = await supabase
    .from("bridge_client_subscriptions")
    .select("id, studio_id, client_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!subscription) return;

  // Update subscription status
  await supabase
    .from("bridge_client_subscriptions")
    .update({ status: "past_due" })
    .eq("id", subscription.id);

  // Record failed invoice
  await supabase.from("bridge_subscription_invoices").insert({
    subscription_id: subscription.id,
    stripe_invoice_id: invoice.id,
    amount_cents: invoice.amount_due,
    status: "open",
    period_start: new Date(invoice.period_start * 1000).toISOString(),
    period_end: new Date(invoice.period_end * 1000).toISOString(),
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    hosted_invoice_url: invoice.hosted_invoice_url,
  });

  // TODO: Notify studio owner of payment failure
  console.log(`Bridge subscription invoice ${invoice.id} payment failed`);
}

/**
 * Handle subscription updates (retainer changes)
 */
async function handleSubscriptionUpdated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  connectedAccountId: string
): Promise<void> {
  await supabase
    .from("bridge_client_subscriptions")
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq("stripe_subscription_id", subscription.id);
}

/**
 * Handle subscription deletion (retainer canceled)
 */
async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  await supabase
    .from("bridge_client_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}



