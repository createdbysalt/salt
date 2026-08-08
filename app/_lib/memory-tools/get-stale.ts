/**
 * Get Stale Records - Find records with no recent activity
 *
 * Used by Memory Hygiene playbook to identify records that may need archiving.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";

export interface StaleRecord {
  id: string;
  entityType: LearningEntityType;
  name: string;
  lastActivityAt: string | null;
  daysSinceActivity: number;
  relationshipType?: string;
  hasBillingHistory: boolean;
  signal: string;
  severity: number;
  suggestedAction: string;
}

export interface GetStaleInput {
  workspaceId: string;
  entityType?: LearningEntityType;
  days?: number;
  limit?: number;
}

export interface GetStaleResult {
  records: StaleRecord[];
  totalCount: number;
}

export async function memoryGetStaleRecords(
  input: GetStaleInput
): Promise<GetStaleResult> {
  const { workspaceId, entityType, days = 90, limit = 100 } = input;
  const supabase = createAdminClient();
  const records: StaleRecord[] = [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString();

  if (!entityType || entityType === "person") {
    const { data: people } = await supabase
      .from("people")
      .select("id, name, email, relationship_type, updated_at, created_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .or(`updated_at.lt.${cutoff},updated_at.is.null`)
      .order("updated_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (people) {
      for (const person of people) {
        const { count } = await supabase
          .from("billing_records")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("person_id", person.id)
          .is("deleted_at", null)
          .is("archived_at", null);

        const lastActivity = person.updated_at || person.created_at;
        const daysSince = lastActivity
          ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const severity = daysSince >= 180 ? 75 : 60;
        const signal = daysSince >= 180 ? "person_no_activity_180d" : "person_no_activity_90d";

        records.push({
          id: person.id,
          entityType: "person",
          name: person.name || person.email || "Unknown",
          lastActivityAt: lastActivity,
          daysSinceActivity: daysSince,
          relationshipType: person.relationship_type || undefined,
          hasBillingHistory: (count || 0) > 0,
          signal,
          severity,
          suggestedAction: daysSince >= 180 ? "Archive" : "Review",
        });
      }
    }
  }

  if (!entityType || entityType === "organization") {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, relationship_status, updated_at, created_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .or(`updated_at.lt.${cutoff},updated_at.is.null`)
      .order("updated_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (orgs) {
      for (const org of orgs) {
        const { count } = await supabase
          .from("billing_records")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("organization_id", org.id)
          .is("deleted_at", null)
          .is("archived_at", null);

        const lastActivity = org.updated_at || org.created_at;
        const daysSince = lastActivity
          ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        records.push({
          id: org.id,
          entityType: "organization",
          name: org.name || "Unknown",
          lastActivityAt: lastActivity,
          daysSinceActivity: daysSince,
          relationshipType: org.relationship_status || undefined,
          hasBillingHistory: (count || 0) > 0,
          signal: "org_no_activity_90d",
          severity: 60,
          suggestedAction: "Review relationship status",
        });
      }
    }
  }

  if (!entityType || entityType === "work") {
    const { data: work } = await supabase
      .from("work")
      .select("id, name, status, updated_at, created_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .eq("status", "active")
      .or(`updated_at.lt.${cutoff},updated_at.is.null`)
      .order("updated_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (work) {
      for (const item of work) {
        const lastActivity = item.updated_at || item.created_at;
        const daysSince = lastActivity
          ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        records.push({
          id: item.id,
          entityType: "work",
          name: item.name || "Unknown",
          lastActivityAt: lastActivity,
          daysSinceActivity: daysSince,
          hasBillingHistory: false,
          signal: "work_stale_active",
          severity: 78,
          suggestedAction: "Update status or add note",
        });
      }
    }
  }

  if (!entityType || entityType === "billing") {
    // Stale billing = still awaiting payment with no movement past the
    // cutoff. Paid/voided records age out naturally and are never stale.
    const { data: billing } = await supabase
      .from("billing_records")
      .select("id, number, status, updated_at, created_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .in("status", ["draft", "due", "overdue", "partial"])
      .or(`updated_at.lt.${cutoff},updated_at.is.null`)
      .order("updated_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (billing) {
      for (const record of billing) {
        const lastActivity = record.updated_at || record.created_at;
        const daysSince = lastActivity
          ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        records.push({
          id: record.id,
          entityType: "billing",
          name: record.number || "Billing Record",
          lastActivityAt: lastActivity,
          daysSinceActivity: daysSince,
          hasBillingHistory: true,
          signal: "billing_stale_unpaid",
          severity: 70,
          suggestedAction: "Follow up or void",
        });
      }
    }
  }

  records.sort((a, b) => b.severity - a.severity || b.daysSinceActivity - a.daysSinceActivity);

  return {
    records: records.slice(0, limit),
    totalCount: records.length,
  };
}
