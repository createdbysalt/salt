/**
 * Archive Record - Soft delete a record
 *
 * Protected tool that archives (soft deletes) a record.
 * Archived records can be restored within 30 days.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getMemoryEntityTable, type LearningEntityType } from "./types";

export interface ArchiveRecordInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  reason?: string;
}

export interface ArchiveRecordResult {
  success: boolean;
  archivedAt: string;
  error?: string;
}

export async function memoryArchiveRecord(
  input: ArchiveRecordInput
): Promise<ArchiveRecordResult> {
  const { workspaceId, entityType, entityId } = input;
  const supabase = createAdminClient();

  const table = getMemoryEntityTable(entityType);
  if (!table) {
    return {
      success: false,
      archivedAt: "",
      error: "Invalid entity type",
    };
  }

  const archivedAt = new Date().toISOString();

  const { error } =
    table === "people"
      ? await supabase
          .from("people")
          .update({ deleted_at: archivedAt, record_status: "archived" })
          .eq("id", entityId)
          .eq("workspace_id", workspaceId)
      : await supabase
          .from(table)
          .update({ deleted_at: archivedAt })
          .eq("id", entityId)
          .eq("workspace_id", workspaceId);

  if (error) {
    return {
      success: false,
      archivedAt: "",
      error: `Failed to archive: ${error.message}`,
    };
  }

  // Note: a capture_events audit insert used to live here, but it wrote
  // columns (kind/event_type/data) that have never existed on capture_events,
  // so it silently failed on every call. Removed rather than polluting the
  // capture stream with synthetic rows.

  return {
    success: true,
    archivedAt,
  };
}

export interface RestoreRecordInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
}

export interface RestoreRecordResult {
  success: boolean;
  restoredAt: string;
  error?: string;
}

export async function memoryRestoreRecord(
  input: RestoreRecordInput
): Promise<RestoreRecordResult> {
  const { workspaceId, entityType, entityId } = input;
  const supabase = createAdminClient();

  const table = getMemoryEntityTable(entityType);
  if (!table) {
    return {
      success: false,
      restoredAt: "",
      error: "Invalid entity type",
    };
  }

  const restoredAt = new Date().toISOString();

  const { error } =
    table === "people"
      ? await supabase
          .from("people")
          .update({ deleted_at: null, record_status: "active" })
          .eq("id", entityId)
          .eq("workspace_id", workspaceId)
      : await supabase
          .from(table)
          .update({ deleted_at: null })
          .eq("id", entityId)
          .eq("workspace_id", workspaceId);

  if (error) {
    return {
      success: false,
      restoredAt: "",
      error: `Failed to restore: ${error.message}`,
    };
  }

  // Note: the broken capture_events audit insert was removed here too — see
  // memoryArchiveRecord above.

  return {
    success: true,
    restoredAt,
  };
}
