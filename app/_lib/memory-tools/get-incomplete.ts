/**
 * Get Incomplete Records - Find records missing required fields
 *
 * Used by Memory Hygiene playbook to identify data quality issues.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "./types";

export interface IncompleteRecord {
  id: string;
  entityType: LearningEntityType;
  name: string;
  missingFields: string[];
  signal: string;
  severity: number;
  suggestedAction: string;
  quickAction?: string;
}

export interface GetIncompleteInput {
  workspaceId: string;
  entityType?: LearningEntityType;
  severityMin?: number;
  limit?: number;
}

export interface GetIncompleteResult {
  records: IncompleteRecord[];
  totalCount: number;
}

interface FieldRequirement {
  field: string;
  dbColumn: string;
  signal: string;
  severity: number;
  suggestedAction: string;
}

const PERSON_REQUIREMENTS: FieldRequirement[] = [
  { field: "email", dbColumn: "email", signal: "person_missing_email", severity: 95, suggestedAction: "Add email or mark as incomplete" },
  { field: "relationship_type", dbColumn: "relationship_type", signal: "person_missing_relationship_type", severity: 80, suggestedAction: "Infer from signals or ask" },
];

const ORG_REQUIREMENTS: FieldRequirement[] = [
  { field: "domain", dbColumn: "domain", signal: "org_missing_domain", severity: 85, suggestedAction: "Derive from people emails" },
  // primary_contact is checked via the organization_people junction, not a column
  { field: "primary_contact", dbColumn: "_junction_primary", signal: "org_missing_primary_contact", severity: 78, suggestedAction: "Identify from activity" },
  { field: "industry", dbColumn: "industry", signal: "org_missing_industry", severity: 55, suggestedAction: "Infer from domain or ask" },
];

const WORK_REQUIREMENTS: FieldRequirement[] = [
  { field: "client", dbColumn: "organization_id", signal: "work_missing_client", severity: 92, suggestedAction: "Link to org/person or mark internal" },
  { field: "status", dbColumn: "status", signal: "work_missing_status", severity: 82, suggestedAction: "Infer from activity" },
  { field: "deadline", dbColumn: "deadline", signal: "work_missing_deadline", severity: 65, suggestedAction: "Add deadline or mark open-ended" },
  { field: "value", dbColumn: "contract_value_cents", signal: "work_missing_value", severity: 58, suggestedAction: "Add value or mark time-based" },
];

const BILLING_REQUIREMENTS: FieldRequirement[] = [
  { field: "party", dbColumn: "organization_id", signal: "billing_missing_party", severity: 90, suggestedAction: "Link to person/org" },
  { field: "due_date", dbColumn: "due_at", signal: "billing_missing_due_date", severity: 75, suggestedAction: "Add due date" },
];

const FILE_REQUIREMENTS: FieldRequirement[] = [
  { field: "category", dbColumn: "category", signal: "file_missing_category", severity: 55, suggestedAction: "Auto-categorize or ask" },
];

const MEETING_REQUIREMENTS: FieldRequirement[] = [
  { field: "attendees", dbColumn: "attendees", signal: "meeting_missing_attendees", severity: 65, suggestedAction: "Link from calendar data" },
];

export async function memoryGetIncompleteRecords(
  input: GetIncompleteInput
): Promise<GetIncompleteResult> {
  const { workspaceId, entityType, severityMin = 50, limit = 100 } = input;
  const supabase = createAdminClient();
  const records: IncompleteRecord[] = [];

  if (!entityType || entityType === "person") {
    const { data: people } = await supabase
      .from("people")
      .select("id, name, email, relationship_type")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(500);

    if (people) {
      for (const person of people) {
        const missing: FieldRequirement[] = [];
        for (const req of PERSON_REQUIREMENTS) {
          if (!person[req.dbColumn as keyof typeof person]) {
            missing.push(req);
          }
        }
        if (missing.length > 0 && Math.max(...missing.map((m) => m.severity)) >= severityMin) {
          const topIssue = missing.reduce((a, b) => (a.severity > b.severity ? a : b));
          records.push({
            id: person.id,
            entityType: "person",
            name: person.name || person.email || "Unknown",
            missingFields: missing.map((m) => m.field),
            signal: topIssue.signal,
            severity: topIssue.severity,
            suggestedAction: topIssue.suggestedAction,
          });
        }
      }
    }
  }

  if (!entityType || entityType === "organization") {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, domain, website, industry")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(500);

    // Primary contact lives in the organization_people junction
    const orgsWithPrimary = new Set<string>();
    if (orgs && orgs.length > 0) {
      const { data: primaryLinks } = await supabase
        .from("organization_people")
        .select("organization_id")
        .in("organization_id", orgs.map((o) => o.id))
        .eq("is_primary", true);
      for (const link of primaryLinks ?? []) {
        orgsWithPrimary.add(link.organization_id);
      }
    }

    if (orgs) {
      for (const org of orgs) {
        const missing: FieldRequirement[] = [];
        for (const req of ORG_REQUIREMENTS) {
          if (req.dbColumn === "_junction_primary") {
            if (!orgsWithPrimary.has(org.id)) missing.push(req);
            continue;
          }
          if (req.field === "domain") {
            if (!org.domain && !org.website) missing.push(req);
            continue;
          }
          if (!org[req.dbColumn as keyof typeof org]) {
            missing.push(req);
          }
        }
        if (missing.length > 0 && Math.max(...missing.map((m) => m.severity)) >= severityMin) {
          const topIssue = missing.reduce((a, b) => (a.severity > b.severity ? a : b));
          records.push({
            id: org.id,
            entityType: "organization",
            name: org.name || "Unknown",
            missingFields: missing.map((m) => m.field),
            signal: topIssue.signal,
            severity: topIssue.severity,
            suggestedAction: topIssue.suggestedAction,
          });
        }
      }
    }
  }

  if (!entityType || entityType === "work") {
    const { data: work } = await supabase
      .from("work")
      .select("id, name, organization_id, person_id, status, deadline, contract_value_cents")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(500);

    if (work) {
      for (const item of work) {
        const missing: FieldRequirement[] = [];
        if (!item.organization_id && !item.person_id) {
          missing.push(WORK_REQUIREMENTS[0]);
        }
        for (const req of WORK_REQUIREMENTS.slice(1)) {
          if (!item[req.dbColumn as keyof typeof item]) {
            missing.push(req);
          }
        }
        if (missing.length > 0 && Math.max(...missing.map((m) => m.severity)) >= severityMin) {
          const topIssue = missing.reduce((a, b) => (a.severity > b.severity ? a : b));
          records.push({
            id: item.id,
            entityType: "work",
            name: item.name || "Unknown",
            missingFields: missing.map((m) => m.field),
            signal: topIssue.signal,
            severity: topIssue.severity,
            suggestedAction: topIssue.suggestedAction,
          });
        }
      }
    }
  }

  if (!entityType || entityType === "billing") {
    const { data: billing } = await supabase
      .from("billing_records")
      .select("id, number, organization_id, person_id, due_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(500);

    if (billing) {
      for (const item of billing) {
        const missing: FieldRequirement[] = [];
        if (!item.organization_id && !item.person_id) {
          missing.push(BILLING_REQUIREMENTS[0]);
        }
        if (!item.due_at) {
          missing.push(BILLING_REQUIREMENTS[1]);
        }
        if (missing.length > 0 && Math.max(...missing.map((m) => m.severity)) >= severityMin) {
          const topIssue = missing.reduce((a, b) => (a.severity > b.severity ? a : b));
          records.push({
            id: item.id,
            entityType: "billing",
            name: item.number || "Unknown",
            missingFields: missing.map((m) => m.field),
            signal: topIssue.signal,
            severity: topIssue.severity,
            suggestedAction: topIssue.suggestedAction,
          });
        }
      }
    }
  }

  if (!entityType || entityType === "resource") {
    const { data: files } = await supabase
      .from("resources")
      .select("id, file_name, category")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(500);

    if (files) {
      for (const file of files) {
        const missing: FieldRequirement[] = [];
        if (!file.category) {
          missing.push(FILE_REQUIREMENTS[0]);
        }
        if (missing.length > 0 && Math.max(...missing.map((m) => m.severity)) >= severityMin) {
          const topIssue = missing.reduce((a, b) => (a.severity > b.severity ? a : b));
          records.push({
            id: file.id,
            entityType: "resource",
            name: file.file_name || "Unknown",
            missingFields: missing.map((m) => m.field),
            signal: topIssue.signal,
            severity: topIssue.severity,
            suggestedAction: topIssue.suggestedAction,
          });
        }
      }
    }
  }

  if (!entityType || entityType === "meeting") {
    const { data: meetings } = await supabase
      .from("meetings")
      .select("id, title, attendees")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .limit(500);

    if (meetings) {
      for (const meeting of meetings) {
        const missing: FieldRequirement[] = [];
        const attendees = meeting.attendees as unknown[];
        if (!attendees || attendees.length === 0) {
          missing.push(MEETING_REQUIREMENTS[0]);
        }
        if (missing.length > 0 && Math.max(...missing.map((m) => m.severity)) >= severityMin) {
          const topIssue = missing.reduce((a, b) => (a.severity > b.severity ? a : b));
          records.push({
            id: meeting.id,
            entityType: "meeting",
            name: meeting.title || "Unknown",
            missingFields: missing.map((m) => m.field),
            signal: topIssue.signal,
            severity: topIssue.severity,
            suggestedAction: topIssue.suggestedAction,
          });
        }
      }
    }
  }

  records.sort((a, b) => b.severity - a.severity);

  return {
    records: records.slice(0, limit),
    totalCount: records.length,
  };
}
