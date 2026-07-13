/**
 * Merge Records - Combine two duplicate records into one
 *
 * Protected tool that merges records following the merge rules.
 * Winner absorbs loser; loser is archived after merge.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";
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

  const table = getTableName(entityType);
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
    const { error: updateError } = await supabase
      .from(table)
      .update(mergeData)
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
      .from("organization_people")
      .update({ organization_id: winnerId })
      .eq("organization_id", loserId);

    const { data: linksUpdated } = await supabase
      .from("entity_links")
      .update({ source_id: winnerId })
      .eq("source_id", loserId)
      .eq("source_type", "organization")
      .select("id");
    migratedLinksCount += linksUpdated?.length || 0;
  }

  const archivedAt = new Date().toISOString();
  const { error: archiveError } = await supabase
    .from(table)
    .update({
      deleted_at: archivedAt,
      ...(table === "people" ? { record_status: "archived" } : {}),
    })
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

  await supabase.from("capture_events").insert({
    workspace_id: workspaceId,
    kind: "system",
    event_type: "records_merged",
    data: {
      entity_type: entityType,
      winner_id: winnerId,
      loser_id: loserId,
      merged_fields: mergedFields,
      migrated_billing: migratedBillingCount,
      migrated_links: migratedLinksCount,
    },
  });

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
