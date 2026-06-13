/**
 * Stripe Ingestion Service
 *
 * Ingests payment events from user's connected Stripe account via Composio.
 * Captures invoices, payments, and customer data for Memory routing.
 *
 * Note: This is for the USER's Stripe account (connected via Composio),
 * not Salt's own billing Stripe.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { CONFIDENCE_THRESHOLDS, BOOTSTRAP_LIMITS } from "../types";
import type { MemorySurface } from "../types";

// ============================================================================
// Types
// ============================================================================

interface StripeInvoice {
  id: string;
  number: string | null;
  customer: string;
  customer_name: string | null;
  customer_email: string | null;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  amount_due: number;
  amount_paid: number;
  currency: string;
  due_date: number | null;
  created: number;
  hosted_invoice_url: string | null;
}

interface StripePayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer: string | null;
  description: string | null;
  created: number;
  receipt_url: string | null;
}

interface StripeCustomer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created: number;
}

interface IngestionResult {
  success: boolean;
  capturesCreated: number;
  error?: string;
}

// ============================================================================
// Stripe Ingestion
// ============================================================================

/**
 * Ingest recent invoices from user's Stripe account.
 */
export async function ingestStripeInvoices(
  workspaceId: string,
  options: {
    limit?: number;
    status?: string;
    isBootstrap?: boolean;
  } = {}
): Promise<IngestionResult> {
  const {
    limit = options.isBootstrap ? 50 : 20,
    status,
    isBootstrap = false,
  } = options;

  const admin = createAdminClient();

  // Get Stripe connection via Composio
  const connectionStatus = await getConnectionStatus("stripe", workspaceId);
  if (!connectionStatus.connected || !connectionStatus.composioConnectionId) {
    return { success: false, capturesCreated: 0, error: "Stripe not connected" };
  }
  const connectionId = connectionStatus.composioConnectionId;

  // Fetch invoices via Composio
  let invoices: StripeInvoice[] = [];
  try {
    const response = await fetch(
      `https://backend.composio.dev/api/v2/actions/STRIPE_LIST_INVOICES/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.COMPOSIO_API_KEY!,
        },
        body: JSON.stringify({
          connectedAccountId: connectionId,
          input: {
            limit,
            ...(status && { status }),
          },
        }),
      }
    );

    const result = await response.json();
    invoices = (result.data?.data ?? []) as StripeInvoice[];
  } catch (error) {
    console.error("[stripe-ingestion] Failed to fetch invoices:", error);
    return { success: false, capturesCreated: 0, error: "Failed to fetch invoices" };
  }

  if (invoices.length === 0) {
    return { success: true, capturesCreated: 0 };
  }

  // Check for existing captures to avoid duplicates
  const externalIds = invoices.map((i) => `stripe:invoice:${i.id}`);
  const { data: existing } = await admin
    .from("capture_events")
    .select("external_id")
    .eq("workspace_id", workspaceId)
    .in("external_id", externalIds);

  const existingIds = new Set(existing?.map((e) => e.external_id) ?? []);
  const newInvoices = invoices.filter(
    (i) => !existingIds.has(`stripe:invoice:${i.id}`)
  );

  if (newInvoices.length === 0) {
    return { success: true, capturesCreated: 0 };
  }

  // Create captures
  const captures = newInvoices.map((invoice) => {
    const amountFormatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: invoice.currency.toUpperCase(),
    }).format(invoice.amount_due / 100);

    return {
      workspace_id: workspaceId,
      source_type: "stripe" as const,
      capture_type: "payment" as const,
      origin: "found" as const,
      external_id: `stripe:invoice:${invoice.id}`,
      title: `Invoice ${invoice.number ?? invoice.id.slice(-8)} — ${amountFormatted}`,
      raw_payload: invoice,
      extracted_data: {
        type: "payment",
        subtype: "invoice",
        invoice_id: invoice.id,
        invoice_number: invoice.number,
        customer_id: invoice.customer,
        customer_name: invoice.customer_name,
        customer_email: invoice.customer_email,
        status: invoice.status,
        amount: invoice.amount_due / 100,
        amount_paid: invoice.amount_paid / 100,
        currency: invoice.currency.toUpperCase(),
        due_date: invoice.due_date
          ? new Date(invoice.due_date * 1000).toISOString()
          : null,
        link: invoice.hosted_invoice_url,
      },
      state: "pending" as const,
    };
  });

  const { data: insertedCaptures, error: insertError } = await admin
    .from("capture_events")
    .insert(captures)
    .select("id, extracted_data");

  if (insertError) {
    console.error("[stripe-ingestion] Failed to insert captures:", insertError);
    return { success: false, capturesCreated: 0, error: "Failed to create captures" };
  }

  // Create routing decisions
  const routingDecisions = insertedCaptures?.flatMap((capture) => {
    const extracted = capture.extracted_data as {
      status?: string;
      customer_name?: string;
    };

    const surfaces: Array<{ surface: MemorySurface; confidence: number }> = [
      { surface: "work", confidence: 90 },
    ];

    // Route to orgs if we have customer info
    if (extracted.customer_name) {
      surfaces.push({ surface: "orgs", confidence: 85 });
    }

    // High-value pending invoices should be flagged
    const isPending = extracted.status === "open" || extracted.status === "draft";

    return surfaces.map(({ surface, confidence }) => ({
      capture_event_id: capture.id,
      target_surface: surface,
      confidence,
      status: confidence >= CONFIDENCE_THRESHOLDS.AUTO_ROUTE && !isPending
        ? "approved"
        : "pending",
      routing_action: "route" as const,
      routed_at: confidence >= CONFIDENCE_THRESHOLDS.AUTO_ROUTE && !isPending
        ? new Date().toISOString()
        : null,
    }));
  }) ?? [];

  if (routingDecisions.length > 0) {
    await admin.from("capture_routing_decisions").insert(routingDecisions);
  }

  return { success: true, capturesCreated: insertedCaptures?.length ?? 0 };
}

/**
 * Ingest recent payments (successful charges).
 */
export async function ingestStripePayments(
  workspaceId: string,
  options: { limit?: number } = {}
): Promise<IngestionResult> {
  const { limit = 20 } = options;
  const admin = createAdminClient();

  const connectionStatus = await getConnectionStatus("stripe", workspaceId);
  if (!connectionStatus.connected || !connectionStatus.composioConnectionId) {
    return { success: false, capturesCreated: 0, error: "Stripe not connected" };
  }
  const connectionId = connectionStatus.composioConnectionId;

  let payments: StripePayment[] = [];
  try {
    const response = await fetch(
      `https://backend.composio.dev/api/v2/actions/STRIPE_LIST_CHARGES/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.COMPOSIO_API_KEY!,
        },
        body: JSON.stringify({
          connectedAccountId: connectionId,
          input: { limit },
        }),
      }
    );

    const result = await response.json();
    payments = (result.data?.data ?? []).filter(
      (p: StripePayment) => p.status === "succeeded"
    );
  } catch (error) {
    console.error("[stripe-ingestion] Failed to fetch payments:", error);
    return { success: false, capturesCreated: 0, error: "Failed to fetch payments" };
  }

  if (payments.length === 0) {
    return { success: true, capturesCreated: 0 };
  }

  // Check for existing captures
  const externalIds = payments.map((p) => `stripe:charge:${p.id}`);
  const { data: existing } = await admin
    .from("capture_events")
    .select("external_id")
    .eq("workspace_id", workspaceId)
    .in("external_id", externalIds);

  const existingIds = new Set(existing?.map((e) => e.external_id) ?? []);
  const newPayments = payments.filter(
    (p) => !existingIds.has(`stripe:charge:${p.id}`)
  );

  if (newPayments.length === 0) {
    return { success: true, capturesCreated: 0 };
  }

  const captures = newPayments.map((payment) => {
    const amountFormatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: payment.currency.toUpperCase(),
    }).format(payment.amount / 100);

    return {
      workspace_id: workspaceId,
      source_type: "stripe" as const,
      capture_type: "payment" as const,
      origin: "found" as const,
      external_id: `stripe:charge:${payment.id}`,
      title: `Payment received — ${amountFormatted}`,
      raw_payload: payment,
      extracted_data: {
        type: "payment",
        subtype: "charge",
        charge_id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency.toUpperCase(),
        description: payment.description,
        receipt_url: payment.receipt_url,
      },
      state: "routed" as const, // Auto-route successful payments
      processed_at: new Date().toISOString(),
    };
  });

  const { data: insertedCaptures, error: insertError } = await admin
    .from("capture_events")
    .insert(captures)
    .select("id");

  if (insertError) {
    console.error("[stripe-ingestion] Failed to insert payment captures:", insertError);
    return { success: false, capturesCreated: 0, error: "Failed to create captures" };
  }

  // Auto-route to work surface
  const routingDecisions = insertedCaptures?.map((capture) => ({
    capture_event_id: capture.id,
    target_surface: "work" as MemorySurface,
    confidence: 95,
    status: "approved",
    routing_action: "route" as const,
    routed_at: new Date().toISOString(),
  })) ?? [];

  if (routingDecisions.length > 0) {
    await admin.from("capture_routing_decisions").insert(routingDecisions);
  }

  return { success: true, capturesCreated: insertedCaptures?.length ?? 0 };
}

/**
 * Run Stripe bootstrap on first connection.
 */
export async function runStripeBootstrap(workspaceId: string): Promise<IngestionResult> {
  console.log(`[stripe-ingestion] Running bootstrap for workspace ${workspaceId}`);

  // Ingest both invoices and recent payments
  const [invoiceResult, paymentResult] = await Promise.all([
    ingestStripeInvoices(workspaceId, { isBootstrap: true, limit: 30 }),
    ingestStripePayments(workspaceId, { limit: 20 }),
  ]);

  const totalCreated =
    (invoiceResult.capturesCreated ?? 0) + (paymentResult.capturesCreated ?? 0);

  console.log(
    `[stripe-ingestion] Bootstrap complete: ${totalCreated} captures created`
  );

  return {
    success: invoiceResult.success && paymentResult.success,
    capturesCreated: totalCreated,
    error: invoiceResult.error ?? paymentResult.error,
  };
}
