"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import {
  BILLING_STATUS_VALUES,
  CURRENCIES,
} from "@/app/_features/memory/taxonomy/registry";
import { writeProfileFieldProvenance } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
import { error, success, type ActionResponse } from "./schemas";

/**
 * Allow-listed inline field updates for a billing record, per the
 * keeper-field-contracts canon (BILLING_FIELDS in the taxonomy registry).
 *
 * Provenance: profile_field_provenance's entity_type CHECK admits
 * 'billing_record' (20260703190000), so every successful edit here routes
 * through the shared provenance writer and shows up on the Activity tab.
 */

const BILLING_STATUS_SLUGS = BILLING_STATUS_VALUES.map((v) => v.slug);
// billing_records.currency CHECK is the uppercase ISO-4217 canon
// (20260703180000) — same 10-value set as the registry.
const DB_CURRENCIES: readonly string[] = CURRENCIES;

const FIELD_TO_COLUMN = {
  number: "number",
  status: "status",
  amount: "amount_cents",
  amountPaid: "amount_paid_cents",
  currency: "currency",
  issuedAt: "issued_at",
  dueAt: "due_at",
  paidAt: "paid_at",
  organizationId: "organization_id",
  personId: "person_id",
  projectId: "project_id",
} as const;

export type BillingRecordField = keyof typeof FIELD_TO_COLUMN;

function normalizeValue(
  field: BillingRecordField,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; message: string } {
  switch (field) {
    case "number": {
      if (typeof value !== "string") return { ok: false, message: "Number must be text" };
      const trimmed = value.trim();
      return { ok: true, value: trimmed || null };
    }
    case "status": {
      if (typeof value !== "string" || !BILLING_STATUS_SLUGS.includes(value)) {
        return { ok: false, message: `Status must be one of: ${BILLING_STATUS_SLUGS.join(", ")}` };
      }
      return { ok: true, value };
    }
    case "amount":
    case "amountPaid": {
      if (value === null) return { ok: true, value: field === "amount" ? 0 : null };
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return { ok: false, message: "Amount must be a non-negative number of cents" };
      }
      return { ok: true, value: Math.round(value) };
    }
    case "currency": {
      if (typeof value !== "string") return { ok: false, message: "Currency is required" };
      const normalized = value.trim().toUpperCase();
      if (!DB_CURRENCIES.includes(normalized)) {
        return {
          ok: false,
          message: `Currency must be one of: ${DB_CURRENCIES.join(", ")}`,
        };
      }
      return { ok: true, value: normalized };
    }
    case "issuedAt":
    case "dueAt":
    case "paidAt": {
      if (value === null || value === "") return { ok: true, value: null };
      if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
        return { ok: false, message: "Date must be a valid ISO date" };
      }
      return { ok: true, value };
    }
    case "organizationId":
    case "personId":
    case "projectId": {
      if (value === null) return { ok: true, value: null };
      if (typeof value !== "string" || value.length === 0) {
        return { ok: false, message: "Reference must be a record id" };
      }
      return { ok: true, value };
    }
  }
}

export async function updateBillingRecordField(
  billingId: string,
  field: BillingRecordField,
  value: unknown,
): Promise<ActionResponse<{ id: string }>> {
  try {
    if (!(field in FIELD_TO_COLUMN)) {
      return error("INVALID_FIELD", `Field "${field}" is not editable`);
    }

    const normalized = normalizeValue(field, value);
    if (!normalized.ok) {
      return error("INVALID_VALUE", normalized.message);
    }

    const { workspace, supabase } = await getWorkspaceContext();

    // Referenced records must belong to the same workspace.
    if (
      normalized.value !== null &&
      (field === "organizationId" || field === "personId" || field === "projectId")
    ) {
      const table =
        field === "organizationId" ? "organizations" : field === "personId" ? "people" : "projects";
      const { data: target } = await supabase
        .from(table)
        .select("id")
        .eq("id", normalized.value as string)
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      if (!target) {
        return error("NOT_FOUND", "Linked record not found in this workspace");
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("billing_records")
      .update({
        [FIELD_TO_COLUMN[field]]: normalized.value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", billingId)
      .eq("workspace_id", workspace.id)
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      return error(
        "UPDATE_FAILED",
        updateError?.message ?? "Billing record not found",
      );
    }

    // Manual corrections are memory: record provenance so the Activity tab
    // shows a discrete "You updated …" event (memory-activity parity).
    await writeProfileFieldProvenance({
      workspaceId: workspace.id,
      entityType: "billing_record",
      entityId: billingId,
      field,
      value: normalized.value === null ? null : String(normalized.value),
      source: "manual",
      ruleId: null,
      confidence: 100,
      evidence: { because: "You corrected this field" },
      blueprintSlug: "keeper-billing-records",
      blueprintVersion: 1,
      status: "applied",
    });

    revalidatePath("/billing");
    revalidatePath(`/billing/${billingId}`);
    return success({ id: updated.id as string });
  } catch (err) {
    return error(
      "UNEXPECTED",
      err instanceof Error ? err.message : "Could not update billing record",
    );
  }
}
