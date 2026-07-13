/**
 * Archive Record - Soft delete a record
 *
 * Protected tool that archives (soft deletes) a record.
 * Archived records can be restored within 30 days.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";

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
  const { workspaceId, entityType, entityId, reason = "manual_archive" } = input;
  const supabase = createAdminClient();

  const table = getTableName(entityType);
  if (!table) {
    return {
      success: false,
      archivedAt: "",
      error: "Invalid entity type",
    };
  }

  const archivedAt = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    deleted_at: archivedAt,
  };

  if (table === "people") {
    updateData.record_status = "archived";
  }

  const { error } = await supabase
    .from(table)
    .update(updateData)
    .eq("id", entityId)
    .eq("workspace_id", workspaceId);

  if (error) {
    return {
      success: false,
      archivedAt: "",
      error: `Failed to archive: ${error.message}`,
    };
  }

  await supabase.from("capture_events").insert({
    workspace_id: workspaceId,
    kind: "system",
    event_type: "record_archived",
    data: {
      entity_type: entityType,
      entity_id: entityId,
      reason,
    },
  });

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

  const table = getTableName(entityType);
  if (!table) {
    return {
      success: false,
      restoredAt: "",
      error: "Invalid entity type",
    };
  }

  const restoredAt = new Date().toISOString();

  const updateData: Record<string, unknown> = {
    deleted_at: null,
  };

  if (table === "people") {
    updateData.record_status = "active";
  }

  const { error } = await supabase
    .from(table)
    .update(updateData)
    .eq("id", entityId)
    .eq("workspace_id", workspaceId);

  if (error) {
    return {
      success: false,
      restoredAt: "",
      error: `Failed to restore: ${error.message}`,
    };
  }

  await supabase.from("capture_events").insert({
    workspace_id: workspaceId,
    kind: "system",
    event_type: "record_restored",
    data: {
      entity_type: entityType,
      entity_id: entityId,
    },
  });

  return {
    success: true,
    restoredAt,
  };
}

function getTableName(entityType: LearningEntityType): string | null {
  const tables: Record<string, string> = {
    person: "people",
    organization: "organizations",
    work: "work",
    billing: "billing_records",
    meeting: "meetings",
    file: "files",
  };
  return tables[entityType] || null;
}
