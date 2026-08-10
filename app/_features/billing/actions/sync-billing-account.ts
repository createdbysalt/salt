"use server";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { TablesInsert, TablesUpdate } from "@/app/_lib/supabase/database.types";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

interface ComputedBillingMetrics {
  mrrCents: number;
  lifetimeRevenueCents: number;
  outstandingCents: number;
  totalPaidCents: number;
  retainerLabel: string | null;
}

/** recurrence_cadence is TEXT CHECK ('weekly'|'monthly'|'yearly') in the DB. */
function normalizeToMonthlyCents(amountCents: number, cadence: string): number {
  if (cadence === "yearly") return Math.round(amountCents / 12);
  if (cadence === "weekly") return Math.round((amountCents * 52) / 12);
  return amountCents;
}

/**
 * Compute billing metrics from billing_records for an entity
 */
async function computeBillingMetrics(
  workspaceId: string,
  entityType: "organization" | "person",
  entityId: string
): Promise<ComputedBillingMetrics> {
  const admin = createAdminClient();

  // Get entity filter field
  const entityField = entityType === "organization" ? "organization_id" : "person_id";

  // Get all billing records for this entity
  const { data: records } = await admin
    .from("billing_records")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq(entityField, entityId);

  if (!records || records.length === 0) {
    return {
      mrrCents: 0,
      lifetimeRevenueCents: 0,
      outstandingCents: 0,
      totalPaidCents: 0,
      retainerLabel: null,
    };
  }

  let mrrCents = 0;
  let lifetimeRevenueCents = 0;
  let outstandingCents = 0;
  let totalPaidCents = 0;
  const seenRecurrenceSeries = new Set<string>();

  for (const record of records) {
    // Client billing metrics come from receivables; payables are workspace spend.
    if (record.direction !== "receivable") continue;

    const amountCents = record.amount_cents;
    const amountPaidCents = record.amount_paid_cents;

    // Lifetime revenue (fully or partially collected receivables)
    if (record.status === "paid") {
      lifetimeRevenueCents += amountCents;
      totalPaidCents += amountCents;
    } else if (record.status === "partial") {
      lifetimeRevenueCents += amountPaidCents;
      totalPaidCents += amountPaidCents;
      outstandingCents += Math.max(0, amountCents - amountPaidCents);
    } else if (record.status === "due" || record.status === "overdue") {
      // Outstanding (unpaid receivables)
      outstandingCents += amountCents;
    }

    // MRR: one contribution per recurrence series (mirrors billing-metrics.ts)
    if (record.recurrence_series_id && record.recurrence_cadence) {
      if (!seenRecurrenceSeries.has(record.recurrence_series_id)) {
        seenRecurrenceSeries.add(record.recurrence_series_id);
        mrrCents += normalizeToMonthlyCents(amountCents, record.recurrence_cadence);
      }
    }
  }

  return {
    mrrCents,
    lifetimeRevenueCents,
    outstandingCents,
    totalPaidCents,
    // billing_records has no subscription-label column; retainer_label is only
    // ever set via setManualBillingMetrics.
    retainerLabel: null,
  };
}

/**
 * Sync billing account for an organization
 * Computes metrics from billing_records and upserts billing_accounts
 */
export async function syncOrgBillingAccount(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const admin = createAdminClient();

    // Verify organization belongs to this workspace before proceeding
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (orgError || !org) {
      return { success: false, error: "Organization not found in this workspace" };
    }

    const metrics = await computeBillingMetrics(workspace.id, "organization", orgId);

    // Use select-then-insert/update pattern for tenant safety
    const { data: existing } = await admin
      .from("billing_accounts")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("organization_id", orgId)
      .maybeSingle();

    const billingData = {
      mrr_cents: metrics.mrrCents,
      lifetime_revenue_cents: metrics.lifetimeRevenueCents,
      outstanding_cents: metrics.outstandingCents,
      total_paid_cents: metrics.totalPaidCents,
      retainer_label: metrics.retainerLabel,
      source: "billing_records",
      last_computed_at: new Date().toISOString(),
    };

    let error;
    if (existing) {
      ({ error } = await admin
        .from("billing_accounts")
        .update(billingData)
        .eq("id", existing.id));
    } else {
      ({ error } = await admin.from("billing_accounts").insert({
        workspace_id: workspace.id,
        organization_id: orgId,
        ...billingData,
      }));
    }

    if (error) {
      console.error("Error syncing org billing account:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error syncing org billing account:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Sync billing account for a person
 */
export async function syncPersonBillingAccount(
  personId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const admin = createAdminClient();

    // Verify person belongs to this workspace before proceeding
    const { data: person, error: personError } = await admin
      .from("people")
      .select("id")
      .eq("id", personId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    if (personError || !person) {
      return { success: false, error: "Person not found in this workspace" };
    }

    const metrics = await computeBillingMetrics(workspace.id, "person", personId);

    // Use select-then-insert/update pattern for tenant safety
    const { data: existing } = await admin
      .from("billing_accounts")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("person_id", personId)
      .maybeSingle();

    const billingData = {
      mrr_cents: metrics.mrrCents,
      lifetime_revenue_cents: metrics.lifetimeRevenueCents,
      outstanding_cents: metrics.outstandingCents,
      total_paid_cents: metrics.totalPaidCents,
      retainer_label: metrics.retainerLabel,
      source: "billing_records",
      last_computed_at: new Date().toISOString(),
    };

    let error;
    if (existing) {
      ({ error } = await admin
        .from("billing_accounts")
        .update(billingData)
        .eq("id", existing.id));
    } else {
      ({ error } = await admin.from("billing_accounts").insert({
        workspace_id: workspace.id,
        person_id: personId,
        ...billingData,
      }));
    }

    if (error) {
      console.error("Error syncing person billing account:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error syncing person billing account:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Manually set billing metrics (override computed values)
 */
export async function setManualBillingMetrics(input: {
  entityType: "organization" | "person";
  entityId: string;
  mrrCents?: number;
  retainerLabel?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const admin = createAdminClient();

    const entityField =
      input.entityType === "organization" ? "organization_id" : "person_id";

    const updateData: TablesUpdate<"billing_accounts"> = {
      source: "manual",
      updated_at: new Date().toISOString(),
    };

    if (input.mrrCents !== undefined) {
      updateData.mrr_cents = input.mrrCents;
    }
    if (input.retainerLabel !== undefined) {
      updateData.retainer_label = input.retainerLabel;
    }

    // First check if record exists
    const { data: existing } = await admin
      .from("billing_accounts")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq(entityField, input.entityId)
      .maybeSingle();

    if (existing) {
      const { error } = await admin
        .from("billing_accounts")
        .update(updateData)
        .eq("id", existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Create new record with manual values
      const insertData: TablesInsert<"billing_accounts"> = {
        workspace_id: workspace.id,
        organization_id: input.entityType === "organization" ? input.entityId : null,
        person_id: input.entityType === "person" ? input.entityId : null,
        mrr_cents: input.mrrCents ?? 0,
        lifetime_revenue_cents: 0,
        outstanding_cents: 0,
        total_paid_cents: 0,
        retainer_label: input.retainerLabel ?? null,
        source: "manual",
      };

      const { error } = await admin.from("billing_accounts").insert(insertData);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Error setting manual billing metrics:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
