"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ActionResult } from "@/app/_features/plays/actions";
import { WORK_PROFILE_SLUG } from "@/app/_features/plays/playbooks/records-engine/apply-work-profile";
import { writeProfileFieldProvenance } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";
import type { WorkProfileFieldKey } from "@/app/_features/work/types";
import { computeFinalPrice } from "@/app/_features/work/utils/pricing";
import { validateRecordName } from "@/app/_features/memory/utils/record-name";

const nullableStringFields = new Set<WorkProfileFieldKey>([
  "name",
  "description",
  "deadline",
  "start_date",
  "service_id",
  "work_type",
  "stage",
  "payment_type",
  "payment_terms",
  "currency",
  "renewal_date",
  "billing_cycle",
  "billing_contact_id",
  "po_number",
  "estimated_timeline",
  "discount_reason",
]);

// Reference fields whose target must belong to the same workspace.
const referenceFieldTables: Partial<Record<WorkProfileFieldKey, "organizations" | "people">> = {
  organization_id: "organizations",
  person_id: "people",
};

const nullableIntegerFields = new Set<WorkProfileFieldKey>([
  "contract_value_cents",
  "hourly_rate_cents",
  "retainer_mrr_cents",
  "discount_amount_cents",
  "final_price_cents",
]);

const nullableNumberFields = new Set<WorkProfileFieldKey>([
  "hours_estimate",
  "discount_percent",
]);

function parseNullableInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function correctWorkProfileField(input: {
  workId: string;
  field: WorkProfileFieldKey;
  value: string;
}): Promise<ActionResult<{ workId: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { data: work, error: workError } = await admin
    .from("work")
    .select("id")
    .eq("id", input.workId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (workError || !work) {
    return {
      ok: false,
      errorCode: "WORK_NOT_FOUND",
      message: workError?.message ?? "Work item not found",
    };
  }

  const patch: Record<string, string | number | null> = {};
  if (input.field === "status") patch.status = input.value;
  if (input.field === "name") {
    const validated = validateRecordName(input.value);
    if (!validated.ok) {
      return { ok: false, errorCode: "INVALID_NAME", message: validated.message };
    }
    patch.name = validated.name;
  }
  if (nullableStringFields.has(input.field) && input.field !== "name") patch[input.field] = input.value.trim() || null;
  if (nullableIntegerFields.has(input.field)) patch[input.field] = parseNullableInteger(input.value);
  if (nullableNumberFields.has(input.field)) patch[input.field] = parseNullableNumber(input.value);

  const referenceTable = referenceFieldTables[input.field];
  if (referenceTable) {
    const targetId = input.value.trim() || null;
    if (targetId) {
      const { data: target } = await admin
        .from(referenceTable)
        .select("id")
        .eq("id", targetId)
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      if (!target) {
        return {
          ok: false,
          errorCode: "TARGET_NOT_FOUND",
          message: "Linked record not found in this workspace",
        };
      }
    }
    patch[input.field] = targetId;
  }

  if (
    input.field === "contract_value_cents" ||
    input.field === "discount_percent" ||
    input.field === "discount_amount_cents"
  ) {
    const { data: current } = await admin
      .from("work")
      .select("contract_value_cents, discount_percent, discount_amount_cents")
      .eq("id", input.workId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    const nextBase =
      input.field === "contract_value_cents"
        ? parseNullableInteger(input.value)
        : ((current?.contract_value_cents as number | null) ?? null);
    const nextPercent =
      input.field === "discount_percent"
        ? parseNullableNumber(input.value)
        : ((current?.discount_percent as number | null) ?? null);
    const nextAmount =
      input.field === "discount_amount_cents"
        ? parseNullableInteger(input.value)
        : ((current?.discount_amount_cents as number | null) ?? null);

    patch.final_price_cents =
      nextAmount != null
        ? computeFinalPrice(nextBase, { type: "amount", amountCents: nextAmount })
        : computeFinalPrice(nextBase, { type: "percent", percent: nextPercent });
  }

  const { error } = await admin
    .from("work")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", input.workId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  await writeProfileFieldProvenance({
    workspaceId: workspace.id,
    entityType: "work",
    entityId: input.workId,
    field: input.field,
    value: input.value,
    source: "manual",
    ruleId: null,
    confidence: 100,
    evidence: { because: "You corrected this field" },
    blueprintSlug: WORK_PROFILE_SLUG,
    blueprintVersion: 1,
    status: "applied",
  });

  scheduleWorkHealthRecompute(input.workId);
  revalidatePath(`/work/${input.workId}`);
  revalidatePath("/work");
  revalidatePath("/plays");

  return { ok: true, data: { workId: input.workId } };
}
