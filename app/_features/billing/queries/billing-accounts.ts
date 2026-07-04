import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

export interface BillingAccountMetrics {
  mrrCents: number | null;
  lifetimeRevenueCents: number | null;
  outstandingCents: number | null;
  totalPaidCents: number | null;
  retainerLabel: string | null;
  source: "billing_records" | "manual" | "legacy_migration";
  lastComputedAt: string | null;
}

const EMPTY_METRICS: BillingAccountMetrics = {
  mrrCents: null,
  lifetimeRevenueCents: null,
  outstandingCents: null,
  totalPaidCents: null,
  retainerLabel: null,
  source: "billing_records",
  lastComputedAt: null,
};

/**
 * Get billing account metrics for an organization
 * Returns cached metrics from billing_accounts table if available
 */
export const getOrgBillingAccount = cache(
  async (orgId: string): Promise<BillingAccountMetrics> => {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data } = await supabase
      .from("billing_accounts")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (!data) return EMPTY_METRICS;

    return {
      mrrCents: data.mrr_cents,
      lifetimeRevenueCents: data.lifetime_revenue_cents,
      outstandingCents: data.outstanding_cents,
      totalPaidCents: data.total_paid_cents,
      retainerLabel: data.retainer_label,
      source: data.source as BillingAccountMetrics["source"],
      lastComputedAt: data.last_computed_at,
    };
  }
);

/**
 * Get billing account metrics for a person
 */
export const getPersonBillingAccount = cache(
  async (personId: string): Promise<BillingAccountMetrics> => {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data } = await supabase
      .from("billing_accounts")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("person_id", personId)
      .maybeSingle();

    if (!data) return EMPTY_METRICS;

    return {
      mrrCents: data.mrr_cents,
      lifetimeRevenueCents: data.lifetime_revenue_cents,
      outstandingCents: data.outstanding_cents,
      totalPaidCents: data.total_paid_cents,
      retainerLabel: data.retainer_label,
      source: data.source as BillingAccountMetrics["source"],
      lastComputedAt: data.last_computed_at,
    };
  }
);
