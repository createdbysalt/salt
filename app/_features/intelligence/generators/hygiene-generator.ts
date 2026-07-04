/**
 * Hygiene Insight Generator
 *
 * Detects memory hygiene issues (missing data, duplicates, staleness)
 * and surfaces them as intelligence findings for review.
 *
 * Runs on-demand (not batch) when triggered by entity creation or updates.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

export type HygieneIssueType =
  | "org_missing_industry"
  | "org_missing_key_contact"
  | "org_duplicate_domain"
  | "person_no_contact_30_days"
  | "person_appears_in_multiple_orgs"
  | "person_duplicate_email"
  | "work_missing_stage"
  | "work_stalled"
  | "billing_overdue_unlinked"
  | "billing_missing_work_link"
  | "meeting_no_outcome"
  | "file_unlinked"
  | "file_expiring";

export interface HygieneIssue {
  type: HygieneIssueType;
  entityType: "person" | "organization" | "work" | "billing" | "meeting" | "file";
  entityId: string;
  entityName: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
}

export interface HygieneCheckResult {
  workspaceId: string;
  checkedAt: string;
  issues: HygieneIssue[];
}

/**
 * Check a single organization for hygiene issues
 */
export async function checkOrgHygiene(
  workspaceId: string,
  orgId: string
): Promise<HygieneIssue[]> {
  const admin = createAdminClient();
  const issues: HygieneIssue[] = [];

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, domain, industry_parent, key_contact_id")
    .eq("id", orgId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!org) return issues;

  // Check for missing industry
  if (!org.industry_parent) {
    issues.push({
      type: "org_missing_industry",
      entityType: "organization",
      entityId: orgId,
      entityName: org.name,
      title: `${org.name} has no industry classification`,
      description: "This organization needs an industry category to help with filtering and insights.",
      evidence: { org_id: orgId, org_name: org.name },
    });
  }

  // Check for missing key contact
  if (!org.key_contact_id) {
    // Check if org has any linked people
    const { count } = await admin
      .from("people")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("primary_org_id", orgId);

    if (count && count > 0) {
      issues.push({
        type: "org_missing_key_contact",
        entityType: "organization",
        entityId: orgId,
        entityName: org.name,
        title: `${org.name} has no key contact`,
        description: `This organization has ${count} linked ${count === 1 ? "person" : "people"} but no key contact assigned.`,
        evidence: { org_id: orgId, org_name: org.name, linked_people_count: count },
      });
    }
  }

  // Check for duplicate domain
  if (org.domain) {
    const { data: duplicates } = await admin
      .from("organizations")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("domain", org.domain)
      .neq("id", orgId)
      .limit(5);

    if (duplicates && duplicates.length > 0) {
      issues.push({
        type: "org_duplicate_domain",
        entityType: "organization",
        entityId: orgId,
        entityName: org.name,
        title: `${org.name} shares a domain with other organizations`,
        description: `The domain "${org.domain}" is also used by: ${duplicates.map((d) => d.name).join(", ")}`,
        evidence: {
          org_id: orgId,
          org_name: org.name,
          domain: org.domain,
          duplicates: duplicates.map((d) => ({ id: d.id, name: d.name })),
        },
      });
    }
  }

  return issues;
}

/**
 * Check a single person for hygiene issues
 */
export async function checkPersonHygiene(
  workspaceId: string,
  personId: string
): Promise<HygieneIssue[]> {
  const admin = createAdminClient();
  const issues: HygieneIssue[] = [];

  const { data: person } = await admin
    .from("people")
    .select("id, name, email, updated_at")
    .eq("id", personId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!person) return issues;

  // Check for no contact in 30 days
  if (person.updated_at) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(person.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact >= 30) {
      issues.push({
        type: "person_no_contact_30_days",
        entityType: "person",
        entityId: personId,
        entityName: person.name,
        title: `No contact with ${person.name} in ${daysSinceContact} days`,
        description: "Consider reaching out to maintain the relationship.",
        evidence: {
          person_id: personId,
          person_name: person.name,
          last_contact: person.updated_at,
          days_since_contact: daysSinceContact,
        },
      });
    }
  }

  // Check for duplicate email
  if (person.email) {
    const { data: duplicates } = await admin
      .from("people")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("email", person.email)
      .neq("id", personId)
      .limit(5);

    if (duplicates && duplicates.length > 0) {
      issues.push({
        type: "person_duplicate_email",
        entityType: "person",
        entityId: personId,
        entityName: person.name,
        title: `${person.name} shares an email with other people`,
        description: `The email "${person.email}" is also used by: ${duplicates.map((d) => d.name).join(", ")}`,
        evidence: {
          person_id: personId,
          person_name: person.name,
          email: person.email,
          duplicates: duplicates.map((d) => ({ id: d.id, name: d.name })),
        },
      });
    }
  }

  // Check for appearing in multiple orgs
  const { data: orgLinks } = await admin
    .from("people")
    .select("primary_org_id, organizations!inner(id, name)")
    .eq("id", personId)
    .eq("workspace_id", workspaceId);

  // TODO: Implement multi-org check when we have org_members table
  // For now, we only have primary_org_id

  return issues;
}

const STALLED_WORK_DAYS = 21;
const FILE_EXPIRY_WINDOW_DAYS = 30;

/**
 * Check a single work item for hygiene issues (keeper-field-contracts 5.3).
 */
export async function checkWorkHygiene(
  workspaceId: string,
  workId: string
): Promise<HygieneIssue[]> {
  const admin = createAdminClient();
  const issues: HygieneIssue[] = [];

  const { data: work } = await admin
    .from("work")
    .select("id, name, status, work_type, stage, updated_at")
    .eq("id", workId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .single();

  if (!work) return issues;

  const isOpen = work.status === "active" || work.status === "signed";

  if (isOpen && work.work_type && !work.stage) {
    issues.push({
      type: "work_missing_stage",
      entityType: "work",
      entityId: workId,
      entityName: work.name,
      title: `${work.name} has no stage`,
      description:
        "This work item has a type but no pipeline stage — progress and renewal signals can't be derived without one.",
      evidence: { work_id: workId, work_name: work.name, work_type: work.work_type },
    });
  }

  if (work.status === "active" && work.updated_at) {
    const daysQuiet = Math.floor(
      (Date.now() - new Date(work.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysQuiet >= STALLED_WORK_DAYS) {
      issues.push({
        type: "work_stalled",
        entityType: "work",
        entityId: workId,
        entityName: work.name,
        title: `${work.name} looks stalled`,
        description: `No record activity in ${daysQuiet} days on an active work item. Update the stage, put it on hold, or close it out.`,
        evidence: {
          work_id: workId,
          work_name: work.name,
          days_since_activity: daysQuiet,
          last_activity: work.updated_at,
        },
      });
    }
  }

  return issues;
}

/**
 * Check a single billing record for hygiene issues.
 */
export async function checkBillingHygiene(
  workspaceId: string,
  billingId: string
): Promise<HygieneIssue[]> {
  const admin = createAdminClient();
  const issues: HygieneIssue[] = [];

  const { data: record } = await admin
    .from("billing_records")
    .select("id, number, status, direction, person_id, organization_id, project_id")
    .eq("id", billingId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!record) return issues;

  const label = record.number || `${record.direction === "receivable" ? "INV" : "BILL"}-${record.id.slice(0, 6)}`;
  const isOpen = record.status === "due" || record.status === "overdue" || record.status === "partial";

  if (record.status === "overdue" && !record.person_id && !record.organization_id) {
    issues.push({
      type: "billing_overdue_unlinked",
      entityType: "billing",
      entityId: billingId,
      entityName: label,
      title: `${label} is overdue with no counterparty linked`,
      description:
        "This overdue record has no person or organization attached — reminders and account balances can't route without one.",
      evidence: { billing_id: billingId, number: label, status: record.status },
    });
  }

  if (isOpen && record.direction === "receivable" && !record.project_id) {
    issues.push({
      type: "billing_missing_work_link",
      entityType: "billing",
      entityId: billingId,
      entityName: label,
      title: `${label} is not linked to work`,
      description:
        "This open receivable has no work item attached — revenue and contract-value rollups will miss it.",
      evidence: { billing_id: billingId, number: label, status: record.status },
    });
  }

  return issues;
}

/**
 * Check a single meeting for hygiene issues.
 */
export async function checkMeetingHygiene(
  workspaceId: string,
  meetingId: string
): Promise<HygieneIssue[]> {
  const admin = createAdminClient();
  const issues: HygieneIssue[] = [];

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, title, status, end_time")
    .eq("id", meetingId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!meeting || meeting.status !== "completed") return issues;

  const { count: summaryCount } = await admin
    .from("meeting_summaries")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meetingId);

  if (!summaryCount) {
    issues.push({
      type: "meeting_no_outcome",
      entityType: "meeting",
      entityId: meetingId,
      entityName: meeting.title,
      title: `${meeting.title} has no recorded outcome`,
      description:
        "This meeting completed without a summary, decisions, or action items — the outcome will be lost.",
      evidence: { meeting_id: meetingId, meeting_title: meeting.title, ended_at: meeting.end_time },
    });
  }

  return issues;
}

/**
 * Check a single file for hygiene issues.
 */
export async function checkFileHygiene(
  workspaceId: string,
  fileId: string
): Promise<HygieneIssue[]> {
  const admin = createAdminClient();
  const issues: HygieneIssue[] = [];

  const { data: file } = await admin
    .from("files")
    .select(
      "id, file_name, person_id, organization_id, expiry_date, lifecycle_status, is_operator_asset"
    )
    .eq("id", fileId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!file) return issues;

  // Work linkage lives in entity_links (files.project_id dropped in 6.4)
  const { count: workLinkCount } = await admin
    .from("entity_links")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("source_type", "file")
    .eq("source_id", fileId)
    .eq("target_type", "work");

  if (
    !workLinkCount &&
    !file.person_id &&
    !file.organization_id &&
    !file.is_operator_asset
  ) {
    issues.push({
      type: "file_unlinked",
      entityType: "file",
      entityId: fileId,
      entityName: file.file_name,
      title: `${file.file_name} is not linked to anything`,
      description:
        "This file has no person, organization, or work link — it won't surface on any record.",
      evidence: { file_id: fileId, file_name: file.file_name },
    });
  }

  if (file.expiry_date && file.lifecycle_status !== "archived" && file.lifecycle_status !== "expired") {
    const daysToExpiry = Math.ceil(
      (new Date(file.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysToExpiry >= 0 && daysToExpiry <= FILE_EXPIRY_WINDOW_DAYS) {
      issues.push({
        type: "file_expiring",
        entityType: "file",
        entityId: fileId,
        entityName: file.file_name,
        title: `${file.file_name} expires in ${daysToExpiry} day${daysToExpiry === 1 ? "" : "s"}`,
        description: "Renew, replace, or archive this document before it lapses.",
        evidence: { file_id: fileId, file_name: file.file_name, expiry_date: file.expiry_date },
      });
    }
  }

  return issues;
}

/**
 * Surface hygiene issues as intelligence findings
 */
export async function surfaceHygieneFindings(
  workspaceId: string,
  issues: HygieneIssue[]
): Promise<{ created: number; skipped: number }> {
  if (issues.length === 0) return { created: 0, skipped: 0 };

  const admin = createAdminClient();
  let created = 0;
  let skipped = 0;

  for (const issue of issues) {
    // Check if we already have an active finding for this issue
    const existingQuery = admin
      .from("intelligence_findings")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("finding_type", "needs_routing")
      .eq("state", "needs_you")
      .filter("evidence->>hygiene_type", "eq", issue.type);

    if (issue.entityType === "person") {
      existingQuery.eq("person_id", issue.entityId);
    } else if (issue.entityType === "organization") {
      existingQuery.eq("org_id", issue.entityId);
    } else {
      // Work/billing/meeting/file findings key on evidence — the findings
      // table only carries person/org FK columns.
      existingQuery.filter("evidence->>hygiene_entity_id", "eq", issue.entityId);
    }

    const { data: existing } = await existingQuery.limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Create new finding
    const insertData: Record<string, unknown> = {
      workspace_id: workspaceId,
      finding_type: "needs_routing",
      state: "needs_you",
      title: issue.title,
      content: issue.description,
      evidence: {
        ...issue.evidence,
        hygiene_type: issue.type,
        hygiene_entity_type: issue.entityType,
        hygiene_entity_id: issue.entityId,
      },
      confidence: 95,
    };

    if (issue.entityType === "person") {
      insertData.person_id = issue.entityId;
    } else if (issue.entityType === "organization") {
      insertData.org_id = issue.entityId;
    }

    const { error } = await admin.from("intelligence_findings").insert(insertData);

    if (!error) {
      created++;
    }
  }

  return { created, skipped };
}
