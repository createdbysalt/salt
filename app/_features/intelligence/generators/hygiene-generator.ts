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
  | "person_duplicate_email";

export interface HygieneIssue {
  type: HygieneIssueType;
  entityType: "person" | "organization";
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
    } else {
      existingQuery.eq("org_id", issue.entityId);
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
      },
      confidence: 95,
    };

    if (issue.entityType === "person") {
      insertData.person_id = issue.entityId;
    } else {
      insertData.org_id = issue.entityId;
    }

    const { error } = await admin.from("intelligence_findings").insert(insertData);

    if (!error) {
      created++;
    }
  }

  return { created, skipped };
}
