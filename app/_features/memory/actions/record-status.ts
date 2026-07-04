"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";

export type RecordStatusValue = "active" | "inactive";
export type RecordStatusEntity = "person" | "org";

/**
 * Manual record-status change (keeper-field-contracts Phase 1.3).
 * Precedence: source='manual' — Keeper never silently overrides a manual
 * value; it may only raise an ask-first play card on sustained contradiction.
 * Logged to lifecycle_events so the change shows on the Activity tab.
 */
export async function updateRecordStatus(input: {
  entityType: RecordStatusEntity;
  entityId: string;
  status: RecordStatusValue;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    if (input.status !== "active" && input.status !== "inactive") {
      return { ok: false, message: "Status must be active or inactive" };
    }

    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const admin = createAdminClient();
    const table = input.entityType === "person" ? "people" : "organizations";
    const now = new Date().toISOString();

    const { data: previous } = await admin
      .from(table)
      .select("record_status")
      .eq("id", input.entityId)
      .eq("workspace_id", workspace.id)
      .maybeSingle();

    const { data: updated, error } = await admin
      .from(table)
      .update({
        record_status: input.status,
        record_status_source: "manual",
        record_status_changed_at: now,
        updated_at: now,
      })
      .eq("id", input.entityId)
      .eq("workspace_id", workspace.id)
      .select("id")
      .maybeSingle();

    if (error || !updated) {
      return { ok: false, message: error?.message ?? "Record not found" };
    }

    await admin.from("lifecycle_events").insert({
      workspace_id: workspace.id,
      entity_type: input.entityType === "person" ? "person" : "organization",
      entity_id: input.entityId,
      event_type: input.status === "inactive" ? "became_inactive" : "reactivated",
      from_value: (previous?.record_status as string | null) ?? "active",
      to_value: input.status,
      source: "manual",
      because: "You changed the record status",
    });

    revalidatePath(input.entityType === "person" ? `/people/${input.entityId}` : `/orgs/${input.entityId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Could not update record status",
    };
  }
}
