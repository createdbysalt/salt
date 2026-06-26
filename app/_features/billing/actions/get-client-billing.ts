"use server";

import { createClient } from "@/app/_lib/supabase/server";

// =============================================================================
// Types
// =============================================================================

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "canceled" | "failed";
  description: string | null;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  projectName: string | null;
}

export interface ClientRetainer {
  id: string;
  status: "pending" | "active" | "paused" | "canceled" | "past_due" | "trialing";
  amountCents: number;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
  description: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  projectName: string | null;
  // Stripe Connect fields
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  collectionMethod: "charge_automatically" | "send_invoice";
  paymentMethod: {
    brand: string; // "visa", "mastercard", "amex", etc.
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  } | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  pastDueSince: string | null;
}

export interface ClientBillingOverview {
  totalPaidCents: number;
  outstandingCents: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  activeRetainerCount: number;
}

export interface ClientBillingData {
  overview: ClientBillingOverview;
  invoices: ClientInvoice[];
  retainers: ClientRetainer[];
  currency: string;
}

// =============================================================================
// Server Action
// =============================================================================

export async function getClientBilling(clientId: string): Promise<ClientBillingData> {
  const supabase = await createClient();

  // Fetch invoices for this client
  const { data: invoices, error: invoicesError } = await supabase
    .from("portal_invoices")
    .select(`
      id,
      invoice_number,
      amount_cents,
      currency,
      status,
      description,
      due_date,
      sent_at,
      paid_at,
      created_at,
      project:projects(name)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (invoicesError) {
    console.error("Error fetching invoices:", invoicesError);
    throw new Error("Failed to fetch invoices");
  }

  // Fetch retainers/subscriptions for this client
  const { data: retainers, error: retainersError } = await supabase
    .from("portal_client_subscriptions")
    .select(`
      id,
      status,
      amount_cents,
      currency,
      interval,
      interval_count,
      description,
      current_period_start,
      current_period_end,
      created_at,
      project:projects(name),
      stripe_subscription_id,
      stripe_customer_id,
      collection_method,
      payment_method_brand,
      payment_method_last4,
      payment_method_exp_month,
      payment_method_exp_year,
      cancel_at_period_end,
      canceled_at,
      trial_start,
      trial_end,
      past_due_since
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (retainersError) {
    console.error("Error fetching retainers:", retainersError);
    throw new Error("Failed to fetch retainers");
  }

  // Helper to extract project name from relation (handles both array and object formats)
  const getProjectName = (project: unknown): string | null => {
    if (!project) return null;
    if (Array.isArray(project)) {
      return (project[0] as { name?: string })?.name || null;
    }
    return (project as { name?: string })?.name || null;
  };

  // Transform invoices
  const transformedInvoices: ClientInvoice[] = (invoices || []).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    amountCents: inv.amount_cents,
    currency: inv.currency,
    status: inv.status,
    description: inv.description,
    dueDate: inv.due_date,
    sentAt: inv.sent_at,
    paidAt: inv.paid_at,
    createdAt: inv.created_at,
    projectName: getProjectName(inv.project),
  }));

  // Transform retainers
  const transformedRetainers: ClientRetainer[] = (retainers || []).map((ret) => ({
    id: ret.id,
    status: ret.status,
    amountCents: ret.amount_cents,
    currency: ret.currency,
    interval: ret.interval,
    intervalCount: ret.interval_count,
    description: ret.description,
    currentPeriodStart: ret.current_period_start,
    currentPeriodEnd: ret.current_period_end,
    createdAt: ret.created_at,
    projectName: getProjectName(ret.project),
    // Stripe Connect fields
    stripeSubscriptionId: ret.stripe_subscription_id,
    stripeCustomerId: ret.stripe_customer_id,
    collectionMethod: ret.collection_method || "charge_automatically",
    paymentMethod: ret.payment_method_last4
      ? {
          brand: ret.payment_method_brand || "card",
          last4: ret.payment_method_last4,
          expiryMonth: ret.payment_method_exp_month || 0,
          expiryYear: ret.payment_method_exp_year || 0,
        }
      : null,
    cancelAtPeriodEnd: ret.cancel_at_period_end || false,
    canceledAt: ret.canceled_at,
    trialStart: ret.trial_start,
    trialEnd: ret.trial_end,
    pastDueSince: ret.past_due_since,
  }));

  // Calculate overview metrics
  const paidInvoices = transformedInvoices.filter((inv) => inv.status === "paid");
  const totalPaidCents = paidInvoices.reduce((sum, inv) => sum + inv.amountCents, 0);

  const outstandingInvoices = transformedInvoices.filter(
    (inv) => inv.status === "sent" || inv.status === "viewed" || inv.status === "overdue"
  );
  const outstandingCents = outstandingInvoices.reduce((sum, inv) => sum + inv.amountCents, 0);

  // Find last payment
  const lastPaidInvoice = paidInvoices
    .filter((inv) => inv.paidAt)
    .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())[0];

  const activeRetainerCount = transformedRetainers.filter(
    (ret) => ret.status === "active"
  ).length;

  // Use USD as default, or get from first invoice/retainer
  const currency =
    transformedInvoices[0]?.currency ||
    transformedRetainers[0]?.currency ||
    "usd";

  const overview: ClientBillingOverview = {
    totalPaidCents,
    outstandingCents,
    lastPaymentDate: lastPaidInvoice?.paidAt || null,
    lastPaymentAmount: lastPaidInvoice?.amountCents || null,
    activeRetainerCount,
  };

  return {
    overview,
    invoices: transformedInvoices,
    retainers: transformedRetainers,
    currency,
  };
}
