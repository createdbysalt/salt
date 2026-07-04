"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ActionResult } from "@/app/_features/plays/actions";
import { correctPersonProfileField } from "@/app/_features/people/actions/profile-fields";
import { correctOrgProfileField } from "@/app/_features/orgs/actions/profile-fields";
import { correctWorkProfileField } from "@/app/_features/work/actions/profile-fields";
import type {
  ProfileEntityType,
  ProfileFieldKey,
  PersonProfileFieldKey,
} from "@/app/_features/plays/playbooks/records-engine/types";
import type { OrgProfileFieldKey } from "@/app/_features/orgs/types";
import type { WorkProfileFieldKey } from "@/app/_features/work/types";

export type ProfileFieldHistoryRow = {
  value: { text?: string } | null;
  set_at: string;
};

/**
 * Compute the value to revert to based on provenance history.
 * Takes the second-most-recent applied value (the one before the current),
 * or falls back to a sensible default.
 */
export async function computeRevertValue(
  history: ProfileFieldHistoryRow[] | null | undefined,
  field: ProfileFieldKey,
): Promise<string> {
  const priorValue = history?.[1]?.value?.text ?? null;

  if (priorValue != null) {
    return priorValue;
  }

  if (field === "relationship_type") {
    return "unknown";
  }

  return "";
}

/**
 * Dispatch a profile field save to the appropriate entity-specific action.
 */
export async function saveProfileField(input: {
  entityType: ProfileEntityType;
  entityId: string;
  field: ProfileFieldKey;
  value: string;
}): Promise<ActionResult<{ entityId: string }>> {
  if (input.entityType === "person") {
    const result = await correctPersonProfileField({
      personId: input.entityId,
      field: input.field as PersonProfileFieldKey,
      value: input.value,
    });
    if (result.ok) {
      return { ok: true, data: { entityId: result.data.personId } };
    }
    return result;
  }

  if (input.entityType === "organization") {
    const result = await correctOrgProfileField({
      orgId: input.entityId,
      field: input.field as OrgProfileFieldKey,
      value: input.value,
    });
    if (result.ok) {
      return { ok: true, data: { entityId: result.data.orgId } };
    }
    return result;
  }

  if (input.entityType === "work") {
    const result = await correctWorkProfileField({
      workId: input.entityId,
      field: input.field as WorkProfileFieldKey,
      value: input.value,
    });
    if (result.ok) {
      return { ok: true, data: { entityId: result.data.workId } };
    }
    return result;
  }

  return {
    ok: false,
    errorCode: "INVALID_ENTITY_TYPE",
    message: `Unknown entity type: ${input.entityType}`,
  };
}

/**
 * Revert a profile field to its prior applied value.
 * Generalizes the pattern from undoHandledFinding across all entity types.
 */
export async function revertProfileField(input: {
  entityType: ProfileEntityType;
  entityId: string;
  field: ProfileFieldKey;
}): Promise<ActionResult<{ entityId: string; revertedTo: string }>> {
  const { context } = await getTenantContext();
  const workspace = getWorkspaceMemberOrNull(context);

  if (!workspace) {
    return {
      ok: false,
      errorCode: "UNAUTHORIZED",
      message: "Not signed in. Refresh the page and try again.",
    };
  }

  const admin = createAdminClient();

  const { data: history } = await admin
    .from("profile_field_provenance")
    .select("value, set_at")
    .eq("workspace_id", workspace.id)
    .eq("entity_type", input.entityType === "organization" ? "organization" : input.entityType)
    .eq("entity_id", input.entityId)
    .eq("field", input.field)
    .eq("status", "applied")
    .order("set_at", { ascending: false })
    .limit(2);

  const revertValue = await computeRevertValue(history, input.field);

  const saveResult = await saveProfileField({
    entityType: input.entityType,
    entityId: input.entityId,
    field: input.field,
    value: revertValue,
  });

  if (!saveResult.ok) {
    return saveResult;
  }

  revalidatePath("/plays");

  return {
    ok: true,
    data: {
      entityId: input.entityId,
      revertedTo: revertValue,
    },
  };
}
