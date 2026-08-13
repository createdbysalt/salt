/**
 * Merge Records - Combine two duplicate records into one
 *
 * Protected tool that merges records following the merge rules.
 * Winner absorbs loser; loser is archived after merge.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  getMemoryEntityTable,
  type LearningEntityType,
  type MemoryEntityTable,
  type TableUpdate,
} from "./types";
import { memoryCompareDuplicates } from "./compare-duplicates";

export interface MergeRecordsInput {
  workspaceId: string;
  entityType: LearningEntityType;
  winnerId: string;
  loserId: string;
  fieldOverrides?: Record<string, unknown>;
}

export interface MergeRecordsResult {
  success: boolean;
  winnerId: string;
  loserId: string;
  mergedFields: string[];
  migratedBillingCount: number;
  migratedLinksCount: number;
  archivedAt: string;
  error?: string;
}

export async function memoryMergeRecords(
  input: MergeRecordsInput
): Promise<MergeRecordsResult> {
  const { workspaceId, entityType, winnerId, loserId, fieldOverrides } = input;
  const supabase = createAdminClient();

  const comparison = await memoryCompareDuplicates({
    workspaceId,
    entityType,
    recordAId: winnerId,
    recordBId: loserId,
  });

  if (!comparison) {
    return {
      success: false,
      winnerId,
      loserId,
      mergedFields: [],
      migratedBillingCount: 0,
      migratedLinksCount: 0,
      archivedAt: "",
      error: "Could not compare records",
    };
  }

  const mergeData: Record<string, unknown> = {};
  const mergedFields: string[] = [];

  for (const field of comparison.fields) {
    if (fieldOverrides && field.field in fieldOverrides) {
      mergeData[field.field] = fieldOverrides[field.field];
      mergedFields.push(field.field);
    } else if (field.match === "b_only" || (field.match === "different" && field.suggestedSource === "b")) {
      mergeData[field.field] = field.valueB;
      mergedFields.push(field.field);
    }
  }

  const table = getMemoryEntityTable(entityType);
  if (!table) {
    return {
      success: false,
      winnerId,
      loserId,
      mergedFields: [],
      migratedBillingCount: 0,
      migratedLinksCount: 0,
      archivedAt: "",
      error: "Invalid entity type",
    };
  }

  if (Object.keys(mergeData).length > 0) {
    // mergeData keys come from a real row of this table (via the comparison),
    // so the boundary cast to the table's Update payload is sound.
    const { error: updateError } = await supabase
      .from(table)
      .update(mergeData as TableUpdate<MemoryEntityTable>)
      .eq("id", winnerId)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      return {
        success: false,
        winnerId,
        loserId,
        mergedFields,
        migratedBillingCount: 0,
        migratedLinksCount: 0,
        archivedAt: "",
        error: `Failed to update winner: ${updateError.message}`,
      };
    }
  }

  let migratedBillingCount = 0;
  let migratedLinksCount = 0;

  if (entityType === "person") {
    const { data: billingUpdated } = await supabase
      .from("billing_records")
      .update({ person_id: winnerId })
      .eq("person_id", loserId)
      .eq("workspace_id", workspaceId)
      .select("id");
    migratedBillingCount = billingUpdated?.length || 0;

    await supabase
      .from("organization_people")
      .update({ person_id: winnerId })
      .eq("person_id", loserId);

    const { data: linksUpdated } = await supabase
      .from("entity_links")
      .update({ source_id: winnerId })
      .eq("source_id", loserId)
      .eq("source_type", "person")
      .select("id");
    migratedLinksCount += linksUpdated?.length || 0;

    const { data: targetLinksUpdated } = await supabase
      .from("entity_links")
      .update({ target_id: winnerId })
      .eq("target_id", loserId)
      .eq("target_type", "person")
      .select("id");
    migratedLinksCount += targetLinksUpdated?.length || 0;
  }

  if (entityType === "organization") {
    const { data: billingUpdated } = await supabase
      .from("billing_records")
      .update({ organization_id: winnerId })
      .eq("organization_id", loserId)
      .eq("workspace_id", workspaceId)
      .select("id");
    migratedBillingCount = billingUpdated?.length || 0;

    await supabase
      .from("work")
      .update({ organization_id: winnerId })
      .eq("organization_id", loserId)
      .eq("workspace_id", workspaceId);

    await supabase
      .from("meetings")
      .update({ organization_id: winnerId })
      .eq("organization_id", loserId)
      .eq("workspace_id", workspaceId);

    await supabase
      .from("resources")
      .update({ organization_id: winnerId })
      .eq("organization_id", loserId)
      .eq("workspace_id", workspaceId);

    await supabase
      .from("organization_people")
      .update({ organization_id: winnerId })
      .eq("organization_id", loserId);

    // entity_links speaks the short dialect ("org", not "organization").
    const { data: linksUpdated } = await supabase
      .from("entity_links")
      .update({ source_id: winnerId })
      .eq("source_id", loserId)
      .in("source_type", ["org", "organization"])
      .select("id");
    migratedLinksCount += linksUpdated?.length || 0;

    const { data: targetLinksUpdated } = await supabase
      .from("entity_links")
      .update({ target_id: winnerId })
      .eq("target_id", loserId)
      .in("target_type", ["org", "organization"])
      .select("id");
    migratedLinksCount += targetLinksUpdated?.length || 0;
  }

  if (entityType === "work") {
    const { data: billingUpdated } = await supabase
      .from("billing_records")
      .update({ work_id: winnerId })
      .eq("work_id", loserId)
      .eq("workspace_id", workspaceId)
      .select("id");
    migratedBillingCount = billingUpdated?.length || 0;

    await supabase
      .from("meetings")
      .update({ work_id: winnerId })
      .eq("work_id", loserId)
      .eq("workspace_id", workspaceId);

    const { data: linksUpdated } = await supabase
      .from("entity_links")
      .update({ source_id: winnerId })
      .eq("source_id", loserId)
      .eq("source_type", "work")
      .select("id");
    migratedLinksCount += linksUpdated?.length || 0;

    const { data: targetLinksUpdated } = await supabase
      .from("entity_links")
      .update({ target_id: winnerId })
      .eq("target_id", loserId)
      .eq("target_type", "work")
      .select("id");
    migratedLinksCount += targetLinksUpdated?.length || 0;
  }

  if (entityType === "meeting") {
    await supabase
      .from("meeting_sources")
      .update({ meeting_id: winnerId })
      .eq("meeting_id", loserId)
      .eq("workspace_id", workspaceId);

    const { data: linksUpdated } = await supabase
      .from("entity_links")
      .update({ source_id: winnerId })
      .eq("source_id", loserId)
      .eq("source_type", "meeting")
      .select("id");
    migratedLinksCount += linksUpdated?.length || 0;

    const { data: targetLinksUpdated } = await supabase
      .from("entity_links")
      .update({ target_id: winnerId })
      .eq("target_id", loserId)
      .eq("target_type", "meeting")
      .select("id");
    migratedLinksCount += targetLinksUpdated?.length || 0;
  }

  if (entityType === "resource") {
    // Legacy rows may spell the type "file" — move both.
    const { data: linksUpdated } = await supabase
      .from("entity_links")
      .update({ source_id: winnerId })
      .eq("source_id", loserId)
      .in("source_type", ["resource", "file"])
      .select("id");
    migratedLinksCount += linksUpdated?.length || 0;

    const { data: targetLinksUpdated } = await supabase
      .from("entity_links")
      .update({ target_id: winnerId })
      .eq("target_id", loserId)
      .in("target_type", ["resource", "file"])
      .select("id");
    migratedLinksCount += targetLinksUpdated?.length || 0;
  }

  if (entityType === "billing") {
    await supabase
      .from("billing_records")
      .update({ duplicate_of: winnerId })
      .eq("duplicate_of", loserId)
      .eq("workspace_id", workspaceId);

    const { data: linksUpdated } = await supabase
      .from("entity_links")
      .update({ source_id: winnerId })
      .eq("source_id", loserId)
      .eq("source_type", "billing")
      .select("id");
    migratedLinksCount += linksUpdated?.length || 0;

    const { data: targetLinksUpdated } = await supabase
      .from("entity_links")
      .update({ target_id: winnerId })
      .eq("target_id", loserId)
      .eq("target_type", "billing")
      .select("id");
    migratedLinksCount += targetLinksUpdated?.length || 0;
  }

  const archivedAt = new Date().toISOString();
  const { error: archiveError } =
    table === "people"
      ? await supabase
          .from("people")
          .update({ deleted_at: archivedAt, record_status: "archived" })
          .eq("id", loserId)
          .eq("workspace_id", workspaceId)
      : await supabase
          .from(table)
          .update({ deleted_at: archivedAt })
          .eq("id", loserId)
          .eq("workspace_id", workspaceId);

  if (archiveError) {
    return {
      success: false,
      winnerId,
      loserId,
      mergedFields,
      migratedBillingCount,
      migratedLinksCount,
      archivedAt: "",
      error: `Failed to archive loser: ${archiveError.message}`,
    };
  }

  // Note: a capture_events audit insert used to live here, but it wrote
  // columns (kind/event_type/data) that have never existed on capture_events,
  // so it silently failed on every call. Removed rather than polluting the
  // capture stream with synthetic rows.

  return {
    success: true,
    winnerId,
    loserId,
    mergedFields,
    migratedBillingCount,
    migratedLinksCount,
    archivedAt,
  };
}
