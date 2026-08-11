/**
 * memoryRollbackField - Undo an automated field change
 *
 * Allows users to revert any automated change to a Memory field.
 * Creates a new provenance entry with source: "rollback" that points
 * back to what was rolled back.
 *
 * @example
 * ```ts
 * const result = await memoryRollbackField({
 *   workspaceId: "...",
 *   entityType: "person",
 *   entityId: "...",
 *   field: "relationship_type",
 *   reason: "Not actually a client yet",
 * });
 *
 * // result.success === true
 * // result.previousValue === "client"
 * // result.restoredValue === "prospect"
 * ```
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { toLearningDbEntityType } from "@/app/_lib/learning";
import type { Json } from "@/app/_lib/supabase/database.types";
import type { LearningEntityType, TableUpdate } from "./types";

export interface RollbackFieldInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  field: string;
  toProvenanceId?: string;
  reason: string;
}

export interface RollbackFieldResult {
  success: boolean;
  previousValue: unknown;
  restoredValue: unknown;
  rolledBackProvenanceId: string;
  newProvenanceId: string;
  message: string;
}

/**
 * Roll back a field to its previous value.
 *
 * If toProvenanceId is provided, rolls back to that specific version.
 * Otherwise, rolls back to the most recent previous value.
 */
export async function memoryRollbackField(
  input: RollbackFieldInput
): Promise<RollbackFieldResult> {
  const admin = createAdminClient();

  // 1. Get the current provenance (most recent applied)
  const dbEntityType = toLearningDbEntityType(input.entityType);

  const { data: currentProvenance, error: currentError } = await admin
    .from("profile_field_provenance")
    .select("id, value, previous_value, previous_provenance_id")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", dbEntityType)
    .eq("entity_id", input.entityId)
    .eq("field", input.field)
    .eq("status", "applied")
    .order("set_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentError) {
    throw new Error(`Failed to get current provenance: ${currentError.message}`);
  }

  if (!currentProvenance) {
    return {
      success: false,
      previousValue: null,
      restoredValue: null,
      rolledBackProvenanceId: "",
      newProvenanceId: "",
      message: `No provenance found for ${input.entityType}.${input.field}`,
    };
  }

  // 2. Determine the target value to restore
  let targetValue: unknown;
  let targetProvenanceId: string | null = null;

  if (input.toProvenanceId) {
    // Roll back to a specific version
    const { data: targetProvenance, error: targetError } = await admin
      .from("profile_field_provenance")
      .select("id, value")
      .eq("id", input.toProvenanceId)
      .eq("workspace_id", input.workspaceId)
      .eq("entity_type", dbEntityType)
      .eq("entity_id", input.entityId)
      .eq("field", input.field)
      .maybeSingle();

    if (targetError || !targetProvenance) {
      return {
        success: false,
        previousValue: currentProvenance.value,
        restoredValue: null,
        rolledBackProvenanceId: currentProvenance.id,
        newProvenanceId: "",
        message: `Target provenance not found: ${input.toProvenanceId}`,
      };
    }

    targetValue = targetProvenance.value;
    targetProvenanceId = targetProvenance.id;
  } else {
    // Roll back to the previous value
    if (currentProvenance.previous_value != null) {
      targetValue = currentProvenance.previous_value;
      targetProvenanceId = currentProvenance.previous_provenance_id;
    } else if (currentProvenance.previous_provenance_id) {
      // Get the previous provenance record
      const { data: prevProvenance } = await admin
        .from("profile_field_provenance")
        .select("id, value")
        .eq("id", currentProvenance.previous_provenance_id)
        .maybeSingle();

      if (prevProvenance) {
        targetValue = prevProvenance.value;
        targetProvenanceId = prevProvenance.id;
      }
    }

    // If no previous value exists, clear the field
    if (targetValue === undefined) {
      targetValue = null;
    }
  }

  const now = new Date().toISOString();

  // 3. Apply the rollback to the entity
  await applyRollback(admin, input, targetValue);

  // 4. Create new provenance entry for the rollback
  const { data: newProvenance, error: insertError } = await admin
    .from("profile_field_provenance")
    .insert({
      workspace_id: input.workspaceId,
      entity_type: dbEntityType,
      entity_id: input.entityId,
      field: input.field,
      // Boundary cast: the restored value came out of the provenance table's
      // Json columns, so it is Json by construction.
      value: (targetValue ?? null) as Json,
      source: "rollback",
      confidence: 100,
      because: input.reason,
      status: "applied",
      previous_value: currentProvenance.value,
      previous_provenance_id: currentProvenance.id,
      evidence: {
        rollback: true,
        rolledBackFrom: currentProvenance.id,
        rolledBackTo: targetProvenanceId,
        reason: input.reason,
      },
      set_at: now,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to record rollback: ${insertError.message}`);
  }

  return {
    success: true,
    previousValue: currentProvenance.value,
    restoredValue: targetValue,
    rolledBackProvenanceId: currentProvenance.id,
    newProvenanceId: newProvenance.id,
    message: `Rolled back ${input.field} from "${currentProvenance.value}" to "${targetValue}"`,
  };
}

/**
 * Apply the rollback to the actual entity table.
 */
async function applyRollback(
  admin: ReturnType<typeof createAdminClient>,
  input: RollbackFieldInput,
  value: unknown
): Promise<void> {
  const { entityType, entityId, workspaceId, field } = input;

  // Boundary casts: `field` comes from a provenance row that was written when
  // the value was originally applied, so it names a real column of the table.
  switch (entityType) {
    case "person":
      await admin
        .from("people")
        .update({ [field]: value } as TableUpdate<"people">)
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      break;

    case "organization":
      await admin
        .from("organizations")
        .update({ [field]: value } as TableUpdate<"organizations">)
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      break;

    case "work":
      await admin
        .from("work")
        .update({ [field]: value } as TableUpdate<"work">)
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      break;

    case "billing":
      await admin
        .from("billing_records")
        .update({ [field]: value } as TableUpdate<"billing_records">)
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      break;

    case "meeting":
      await admin
        .from("meetings")
        .update({ [field]: value } as TableUpdate<"meetings">)
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      break;

    case "resource":
      await admin
        .from("resources")
        .update({ [field]: value } as TableUpdate<"resources">)
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      break;

    case "me": {
      // Me fields can be on profiles or workspaces - try profiles first
      const { data: profileData } = await admin
        .from("profiles")
        .update({ [field]: value } as TableUpdate<"profiles">)
        .eq("id", entityId)
        .select("id");

      if (!profileData?.length) {
        await admin
          .from("workspaces")
          .update({ [field]: value } as TableUpdate<"workspaces">)
          .eq("id", entityId);
      }
      break;
    }

    default:
      throw new Error(`Unknown entity type for rollback: ${entityType}`);
  }
}
