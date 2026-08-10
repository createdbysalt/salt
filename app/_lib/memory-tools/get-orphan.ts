/**
 * Get Orphan Records - Find records not linked to any other entity
 *
 * Used by Memory Hygiene playbook to identify isolated records.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";

export interface OrphanRecord {
  id: string;
  entityType: LearningEntityType;
  name: string;
  signal: string;
  severity: number;
  suggestedAction: string;
}

export interface GetOrphanInput {
  workspaceId: string;
  entityType?: LearningEntityType;
  limit?: number;
}

export interface GetOrphanResult {
  records: OrphanRecord[];
  totalCount: number;
}

export async function memoryGetOrphanRecords(
  input: GetOrphanInput
): Promise<GetOrphanResult> {
  const { workspaceId, entityType, limit = 100 } = input;
  const supabase = createAdminClient();
  const records: OrphanRecord[] = [];

  if (!entityType || entityType === "person") {
    const { data: people } = await supabase
      .from("people")
      .select("id, name, email")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(500);

    if (people) {
      for (const person of people) {
        const { count: orgCount } = await supabase
          .from("organization_people")
          .select("id", { count: "exact", head: true })
          .eq("person_id", person.id);

        const { count: workCount } = await supabase
          .from("work")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("person_id", person.id)
          .is("deleted_at", null)
          .is("archived_at", null);

        const { count: billingCount } = await supabase
          .from("billing_records")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("person_id", person.id)
          .is("deleted_at", null)
          .is("archived_at", null);

        if ((orgCount || 0) === 0 && (workCount || 0) === 0 && (billingCount || 0) === 0) {
          records.push({
            id: person.id,
            entityType: "person",
            name: person.name || person.email || "Unknown",
            signal: "person_orphan",
            severity: 65,
            suggestedAction: "Link to organization or mark as independent",
          });
        }
      }
    }
  }

  if (!entityType || entityType === "work") {
    const { data: work } = await supabase
      .from("work")
      .select("id, name, organization_id, person_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .is("organization_id", null)
      .is("person_id", null)
      .limit(limit);

    if (work) {
      for (const item of work) {
        records.push({
          id: item.id,
          entityType: "work",
          name: item.name || "Unknown",
          signal: "work_orphan",
          severity: 85,
          suggestedAction: "Link to client",
        });
      }
    }
  }

  if (!entityType || entityType === "resource") {
    const { data: files } = await supabase
      .from("files")
      .select("id, file_name")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(500);

    if (files) {
      for (const file of files) {
        const { count: linkCount } = await supabase
          .from("entity_links")
          .select("id", { count: "exact", head: true })
          .or(`source_id.eq.${file.id},target_id.eq.${file.id}`);

        if ((linkCount || 0) === 0) {
          records.push({
            id: file.id,
            entityType: "resource",
            name: file.file_name || "Unknown",
            signal: "file_orphan",
            severity: 60,
            suggestedAction: "Link to entity or mark as standalone",
          });
        }
      }
    }
  }

  if (!entityType || entityType === "billing") {
    const { data: billing } = await supabase
      .from("billing_records")
      // billing_records has no project_id column — the work link is work_id
      .select("id, number, organization_id, person_id, work_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .is("organization_id", null)
      .is("person_id", null)
      .is("work_id", null)
      .limit(limit);

    if (billing) {
      for (const item of billing) {
        records.push({
          id: item.id,
          entityType: "billing",
          name: item.number || "Unknown",
          signal: "billing_orphan",
          severity: 85,
          suggestedAction: "Link to work or party",
        });
      }
    }
  }

  records.sort((a, b) => b.severity - a.severity);

  return {
    records: records.slice(0, limit),
    totalCount: records.length,
  };
}
