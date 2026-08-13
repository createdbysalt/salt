"use server";

/**
 * Watching nudges for Memory → Filter.
 *
 * "That's right" confirms accumulating evidence (may cross the bar).
 * "Not this" dismisses and teaches — records a correction so Salt learns.
 * Neither is an approval queue action.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  memoryMergeRecords,
  memoryUpdateField,
  type LearningEntityType,
} from "@/app/_lib/memory-tools";
import {
  getMemoryEntityTable,
  type MemoryEntityTable,
  type TableUpdate,
} from "@/app/_lib/memory-tools/types";
import { recordCorrection } from "@/app/_features/me/actions/corrections";

interface ConfirmWatchingEvidenceInput {
  workspaceId: string;
  entityType?: LearningEntityType;
  entityId?: string;
  fieldPath: string;
  proposedValue: string;
  evidenceIds: string[];
}

interface DismissWatchingEvidenceInput {
  workspaceId: string;
  evidenceIds: string[];
  entityType?: LearningEntityType;
  entityId?: string;
  fieldPath?: string;
  proposedValue?: string;
}

/**
 * Meta candidate fields emitted by Memory Hygiene (_merge_candidate,
 * _archive_candidate, _link_candidate). These describe suggested operations
 * rather than field values. Confirming one performs the operation the
 * button promises ("Merge them" merges, "Link it" links, "Archive"
 * archives), then resolves the evidence.
 */
function isMetaCandidateField(fieldPath: string): boolean {
  return fieldPath.startsWith("_");
}

interface MetaCandidateValue {
  targetId?: string;
  linkField?: "organization_people" | "organization_id" | "person_id";
}

function parseMetaCandidateValue(raw: string): MetaCandidateValue | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as MetaCandidateValue;
  } catch {
    return null;
  }
}

/**
 * Perform the operation a meta candidate proposes. Only the exact
 * (field, entityType, linkField) combinations hygiene emits are allowed —
 * anything else is a no-op error rather than an arbitrary write.
 */
async function performMetaCandidateOperation(
  workspaceId: string,
  entityType: LearningEntityType,
  entityId: string,
  fieldPath: string,
  proposedValue: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  if (fieldPath === "_archive_candidate") {
    const table = getMemoryEntityTable(entityType);
    if (!table) return { success: false, error: "Unsupported record type" };
    const { error } = await admin
      .from(table)
      .update({ archived_at: new Date().toISOString() })
      .eq("id", entityId)
      .eq("workspace_id", workspaceId);
    return error ? { success: false, error: error.message } : { success: true };
  }

  const value = parseMetaCandidateValue(proposedValue);
  if (!value?.targetId) {
    return { success: false, error: "Missing link target" };
  }

  if (fieldPath === "_merge_candidate") {
    const result = await memoryMergeRecords({
      workspaceId,
      entityType,
      winnerId: entityId,
      loserId: value.targetId,
    });
    return result.success
      ? { success: true }
      : { success: false, error: result.error ?? "Merge failed" };
  }

  if (fieldPath === "_link_candidate") {
    if (value.linkField === "organization_people" && entityType === "person") {
      const { data: existing } = await admin
        .from("organization_people")
        .select("id")
        .eq("organization_id", value.targetId)
        .eq("person_id", entityId)
        .maybeSingle();
      if (existing) return { success: true };
      const { error } = await admin
        .from("organization_people")
        .insert({ organization_id: value.targetId, person_id: entityId });
      return error ? { success: false, error: error.message } : { success: true };
    }

    const allowedColumnLinks: Partial<
      Record<LearningEntityType, Array<"organization_id" | "person_id">>
    > = {
      work: ["organization_id", "person_id"],
      billing: ["organization_id", "person_id"],
      meeting: ["organization_id", "person_id"],
      resource: ["organization_id", "person_id"],
    };
    const allowed = allowedColumnLinks[entityType] ?? [];
    if (
      (value.linkField === "organization_id" || value.linkField === "person_id") &&
      allowed.includes(value.linkField)
    ) {
      const table = getMemoryEntityTable(entityType);
      if (!table) return { success: false, error: "Unsupported record type" };
      // linkField is allowlisted above, so the boundary cast to the table's
      // Update payload is sound (same pattern as merge-records).
      const { error } = await admin
        .from(table)
        .update({
          [value.linkField]: value.targetId,
        } as TableUpdate<MemoryEntityTable>)
        .eq("id", entityId)
        .eq("workspace_id", workspaceId);
      return error ? { success: false, error: error.message } : { success: true };
    }

    return { success: false, error: "Unsupported link" };
  }

  // Other meta fields (internal diagnostics) resolve without an operation.
  return { success: true };
}

/** Confirm a Watching proposal ("That's right") — may cross the bar. */
export async function confirmWatchingEvidence(
  input: ConfirmWatchingEvidenceInput
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;

  if (workspace.id !== input.workspaceId) {
    return { success: false, error: "Workspace mismatch" };
  }

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  // User confirmation is full confidence, so this applies immediately and
  // resolves all pending evidence for the field.
  const shouldApply =
    input.entityType &&
    input.entityId &&
    !isMetaCandidateField(input.fieldPath) &&
    input.proposedValue.trim().length > 0;

  if (shouldApply) {
    try {
      await memoryUpdateField({
        workspaceId: workspace.id,
        entityType: input.entityType!,
        entityId: input.entityId!,
        field: input.fieldPath,
        value: input.proposedValue,
        confidence: 100,
        because: "Confirmed in Memory → Filter",
        source: "manual",
        sourceDetails: { externalId: userId },
      });
    } catch (error) {
      console.error("Failed to apply confirmed evidence:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to apply value",
      };
    }
  }

  // Meta candidates carry an operation, not a field value — perform it
  // ("Merge them" merges, "Link it" links, "Archive" archives) before
  // resolving the evidence.
  if (
    !shouldApply &&
    input.entityType &&
    input.entityId &&
    isMetaCandidateField(input.fieldPath)
  ) {
    try {
      const operation = await performMetaCandidateOperation(
        workspace.id,
        input.entityType,
        input.entityId,
        input.fieldPath,
        input.proposedValue,
      );
      if (!operation.success) {
        return { success: false, error: operation.error ?? "Operation failed" };
      }
    } catch (error) {
      console.error("Failed to perform meta candidate operation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Operation failed",
      };
    }
  }

  // Ensure the specific evidence rows shown to the user are resolved even if
  // the field write path didn't cover them (meta fields, missing entity).
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("entity_evidence")
    .update({
      resolved_at: now,
      resolution: "applied",
    })
    .in("id", input.evidenceIds)
    .eq("workspace_id", workspace.id)
    .is("resolved_at", null);

  if (error) {
    console.error("Failed to confirm watching evidence:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/memory");
  return { success: true };
}

/**
 * Dismiss a Watching proposal ("Not this") and teach Salt.
 * Records a structured correction so the bar learns from the nudge.
 */
export async function dismissWatchingEvidence(
  input: DismissWatchingEvidenceInput
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;

  if (workspace.id !== input.workspaceId) {
    return { success: false, error: "Workspace mismatch" };
  }

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("entity_evidence")
    .update({
      resolved_at: now,
      resolution: "dismissed",
    })
    .in("id", input.evidenceIds)
    .eq("workspace_id", workspace.id);

  if (error) {
    console.error("Failed to dismiss watching evidence:", error);
    return { success: false, error: error.message };
  }

  // Teach: record a correction when we know what was wrong. Meta candidates
  // (merge/archive/link) teach too — "Keep both" must stop the same merge
  // proposal from re-surfacing on the next hygiene scan. The correction
  // blocklist matches meta candidates by target, so the stored display
  // string is enough.
  if (input.entityType && input.entityId && input.fieldPath) {
    try {
      await recordCorrection({
        workspaceId: workspace.id,
        entityType: input.entityType,
        entityId: input.entityId,
        fieldPath: input.fieldPath,
        wrongValue: input.proposedValue ?? null,
        correctionType: "structured_reason",
        correctionReason: "never_true",
        userExplanation: "Dismissed in Memory → Filter (Not this)",
      });
    } catch (error) {
      // Teaching must not block the dismiss.
      console.error("[watching] Failed to record teaching correction:", error);
    }
  }

  revalidatePath("/memory");
  revalidatePath("/me");
  return { success: true };
}

/** @deprecated Use confirmWatchingEvidence — kept for any lingering imports. */
export const acceptLearningEvidence = confirmWatchingEvidence;

/** @deprecated Use dismissWatchingEvidence — kept for any lingering imports. */
export const dismissLearningEvidence = dismissWatchingEvidence;
