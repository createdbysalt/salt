import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { processCareProposal } from "@/app/_features/memory/care/decision-pipeline";

/** Settings/provenance slug for the Memory Care connections capability. */
export const CONNECTIONS_CAPABILITY_SLUG = "memory-connections";

export type LinkType = "person_org" | "person_work" | "person_person" | "org_work" | "person_space" | "work_space";

export type ResolveStrategy = "domain" | "id" | "name" | "id_or_name";

export interface LinkRule {
  id: string;
  link_type: LinkType;
  when: { signal: string; op: "eq" | "neq" | "gt" | "lt"; value: unknown };
  resolve_org_by?: ResolveStrategy;
  resolve_work_by?: ResolveStrategy;
  resolve_person_by?: ResolveStrategy;
  resolve_value: string;
  create_org_if_missing?: boolean;
  confidence: number;
  because: string;
}

export interface LinkSignals {
  // Person → Org signals
  email_domain_is_personal?: boolean;
  org_domain?: string | null;
  has_invoice_with_org?: boolean;
  invoice_org_id?: string | null;
  has_payment_with_org?: boolean;
  payment_org_id?: string | null;
  user_specified_org?: boolean;
  specified_org?: string | null;

  // Person → Work signals
  user_specified_work?: boolean;
  specified_work?: string | null;
  meeting_about_work?: boolean;
  meeting_work_id?: string | null;

  // Org → Work signals
  user_specified_org_for_work?: boolean;
  work_person_has_org?: boolean;
  person_primary_org_id?: string | null;
}

export interface LinkResult {
  link_type: LinkType;
  rule_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string | null;
  target_created: boolean;
  confidence: number;
  because: string;
  status: "applied" | "accumulating" | "pending" | "skipped";
  skip_reason?: string;
}

export interface ApplyConnectionLinksInput {
  workspaceId: string;
  sourceType: "person" | "org" | "work";
  sourceId: string;
  signals: LinkSignals;
  autoApplyThreshold?: number;
  blueprintVersion?: number;
}

const DEFAULT_LINK_RULES: LinkRule[] = [
  {
    id: "link-person-org-email-domain",
    link_type: "person_org",
    when: { signal: "email_domain_is_personal", op: "eq", value: false },
    resolve_org_by: "domain",
    resolve_value: "{{org_domain}}",
    create_org_if_missing: true,
    confidence: 85,
    because: "Company email domain implies organization membership",
  },
  {
    id: "link-person-org-explicit",
    link_type: "person_org",
    when: { signal: "user_specified_org", op: "eq", value: true },
    resolve_org_by: "id_or_name",
    resolve_value: "{{specified_org}}",
    create_org_if_missing: true,
    confidence: 100,
    because: "User explicitly specified the organization",
  },
  {
    id: "link-person-work-explicit",
    link_type: "person_work",
    when: { signal: "user_specified_work", op: "eq", value: true },
    resolve_work_by: "id_or_name",
    resolve_value: "{{specified_work}}",
    confidence: 100,
    because: "User explicitly linked person to work",
  },
  {
    id: "link-org-work-explicit",
    link_type: "org_work",
    when: { signal: "user_specified_org_for_work", op: "eq", value: true },
    resolve_org_by: "id_or_name",
    resolve_value: "{{specified_org}}",
    confidence: 100,
    because: "User explicitly linked organization to work",
  },
];

function evaluateCondition(
  condition: LinkRule["when"],
  signals: LinkSignals,
): boolean {
  const signalValue = signals[condition.signal as keyof LinkSignals];

  switch (condition.op) {
    case "eq":
      return signalValue === condition.value;
    case "neq":
      return signalValue !== condition.value;
    case "gt":
      return typeof signalValue === "number" && signalValue > (condition.value as number);
    case "lt":
      return typeof signalValue === "number" && signalValue < (condition.value as number);
    default:
      return false;
  }
}

function resolveTemplateValue(template: string, signals: LinkSignals): string | null {
  const match = template.match(/\{\{(\w+)\}\}/);
  if (!match) return template;

  const key = match[1] as keyof LinkSignals;
  const value = signals[key];

  if (value === null || value === undefined) return null;
  return String(value);
}

function domainToOrgName(domain: string): string {
  const baseName = domain.split(".")[0] ?? domain;
  return baseName
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function resolveOrCreateOrg(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  strategy: ResolveStrategy,
  value: string,
  createIfMissing: boolean,
): Promise<{ id: string; created: boolean } | null> {
  if (!value) return null;

  // Try by ID first
  if (strategy === "id" || strategy === "id_or_name") {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    if (isUuid) {
      const { data } = await admin
        .from("organizations")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("id", value)
        .is("deleted_at", null)
        .maybeSingle();

      if (data?.id) return { id: data.id, created: false };
    }
  }

  // Try by domain
  if (strategy === "domain") {
    const domain = value.toLowerCase().trim();
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("domain", domain)
      .is("deleted_at", null)
      .maybeSingle();

    if (data?.id) return { id: data.id, created: false };

    if (createIfMissing) {
      const { data: created, error } = await admin
        .from("organizations")
        .insert({
          workspace_id: workspaceId,
          name: domainToOrgName(domain),
          domain,
          created_via: "capture_intake",
        })
        .select("id")
        .single();

      if (!error && created?.id) return { id: created.id, created: true };
    }
    return null;
  }

  // Try by name
  if (strategy === "name" || strategy === "id_or_name") {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${value}%`)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (data?.id) return { id: data.id, created: false };

    if (createIfMissing) {
      const { data: created, error } = await admin
        .from("organizations")
        .insert({
          workspace_id: workspaceId,
          name: value,
          created_via: "capture_intake",
        })
        .select("id")
        .single();

      if (!error && created?.id) return { id: created.id, created: true };
    }
  }

  return null;
}

async function resolveWork(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  strategy: ResolveStrategy,
  value: string,
): Promise<string | null> {
  if (!value) return null;

  // Try by ID first
  if (strategy === "id" || strategy === "id_or_name") {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    if (isUuid) {
      const { data } = await admin
        .from("work")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("id", value)
        .is("deleted_at", null)
        .maybeSingle();

      if (data?.id) return data.id;
    }
  }

  // Try by name
  if (strategy === "name" || strategy === "id_or_name") {
    const { data } = await admin
      .from("work")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("name", `%${value}%`)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (data?.id) return data.id;
  }

  return null;
}

async function createPersonOrgLink(
  admin: ReturnType<typeof createAdminClient>,
  personId: string,
  orgId: string,
  title?: string,
): Promise<boolean> {
  const { error } = await admin.from("organization_people").upsert(
    {
      organization_id: orgId,
      person_id: personId,
      role: title ?? null,
      is_primary: true,
    },
    { onConflict: "organization_id,person_id" },
  );

  if (!error) {
    // Propagate relationship from person to org if org has none
    await propagateRelationshipToOrg(admin, personId, orgId);
  }

  return !error;
}

async function propagateRelationshipToOrg(
  admin: ReturnType<typeof createAdminClient>,
  personId: string,
  orgId: string,
): Promise<void> {
  // Check if org already has a relationship_status
  const { data: org } = await admin
    .from("organizations")
    .select("id, relationship_status")
    .eq("id", orgId)
    .maybeSingle();

  if (org?.relationship_status) return; // Org already has a relationship

  // Get person's relationship_type
  const { data: person } = await admin
    .from("people")
    .select("id, relationship_type")
    .eq("id", personId)
    .maybeSingle();

  if (!person?.relationship_type) return; // Person has no relationship

  // Propagate person's relationship to org
  await admin
    .from("organizations")
    .update({ relationship_status: person.relationship_type })
    .eq("id", orgId);
}

async function createEntityLink(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string,
  confidence: number,
  because: string,
): Promise<boolean> {
  const { error } = await admin.from("entity_links").upsert(
    {
      workspace_id: workspaceId,
      source_type: sourceType,
      source_id: sourceId,
      target_type: targetType,
      target_id: targetId,
      relation_type: "related",
      confidence,
      because,
      source: "memory_care",
    },
    { onConflict: "workspace_id,source_type,source_id,target_type,target_id" },
  );

  return !error;
}

export async function applyConnectionLinks(
  input: ApplyConnectionLinksInput,
): Promise<LinkResult[]> {
  const admin = createAdminClient();
  const results: LinkResult[] = [];

  for (const rule of DEFAULT_LINK_RULES) {
    // Only process rules for the source type
    const [ruleSourceType] = rule.link_type.split("_") as [string, string];
    if (ruleSourceType !== input.sourceType) continue;

    // Evaluate condition
    if (!evaluateCondition(rule.when, input.signals)) continue;

    // Resolve target value
    const resolvedValue = resolveTemplateValue(rule.resolve_value, input.signals);
    if (!resolvedValue) continue;

    const result: LinkResult = {
      link_type: rule.link_type,
      rule_id: rule.id,
      source_type: input.sourceType,
      source_id: input.sourceId,
      target_type: rule.link_type.split("_")[1] ?? "unknown",
      target_id: null,
      target_created: false,
      confidence: rule.confidence,
      because: rule.because,
      status: "skipped",
    };

    // Route through the Memory Care decision pipeline
    const entityType = input.sourceType === "org" ? "organization" : input.sourceType;
    const decision = await processCareProposal({
      workspaceId: input.workspaceId,
      capability: "connections",
      entityType,
      entityId: input.sourceId,
      entityLabel: input.sourceId,
      field: `link:${rule.link_type}`,
      proposedValue: resolvedValue,
      currentValue: null,
      confidence: rule.confidence,
      because: rule.because,
      ruleId: rule.id,
      evidenceType: "llm_inference",
      evidenceDetails: input.signals as unknown as Record<string, unknown>,
      sourceType: "ask_salt",
    });

    if (decision.action === "watch") {
      result.status = "accumulating";
      result.skip_reason = `Gathering evidence (${decision.aggregatedConfidence}% confidence)`;
      results.push(result);
      continue;
    }

    if (decision.action === "refuse") {
      result.status = "skipped";
      result.skip_reason = decision.reason;
      results.push(result);
      continue;
    }

    // Decision is apply - proceed with creating the link
    if (rule.link_type === "person_org" && rule.resolve_org_by) {
      const org = await resolveOrCreateOrg(
        admin,
        input.workspaceId,
        rule.resolve_org_by,
        resolvedValue,
        rule.create_org_if_missing ?? false,
      );

      if (org) {
        result.target_id = org.id;
        result.target_created = org.created;
        const success = await createPersonOrgLink(admin, input.sourceId, org.id);
        result.status = success ? "applied" : "skipped";
        if (!success) result.skip_reason = "Link creation failed";
      } else {
        result.skip_reason = "Could not resolve organization";
      }
    }

    if (rule.link_type === "person_work" && rule.resolve_work_by) {
      const workId = await resolveWork(admin, input.workspaceId, rule.resolve_work_by, resolvedValue);

      if (workId) {
        result.target_id = workId;
        const success = await createEntityLink(
          admin,
          input.workspaceId,
          "person",
          input.sourceId,
          "work",
          workId,
          rule.confidence,
          rule.because,
        );
        result.status = success ? "applied" : "skipped";
        if (!success) result.skip_reason = "Link creation failed";
      } else {
        result.skip_reason = "Could not resolve work";
      }
    }

    if (rule.link_type === "org_work" && rule.resolve_org_by) {
      const org = await resolveOrCreateOrg(
        admin,
        input.workspaceId,
        rule.resolve_org_by,
        resolvedValue,
        rule.create_org_if_missing ?? false,
      );

      if (org && input.sourceType === "work") {
        result.target_id = org.id;
        result.target_created = org.created;

        // Update work.organization_id
        await admin
          .from("work")
          .update({ organization_id: org.id })
          .eq("id", input.sourceId)
          .eq("workspace_id", input.workspaceId);

        const success = await createEntityLink(
          admin,
          input.workspaceId,
          "org",
          org.id,
          "work",
          input.sourceId,
          rule.confidence,
          rule.because,
        );
        result.status = success ? "applied" : "skipped";
        if (!success) result.skip_reason = "Link creation failed";
      } else {
        result.skip_reason = "Could not resolve organization";
      }
    }

    results.push(result);
  }

  return results;
}

/**
 * Build link signals from person creation input.
 * Called by Ask Salt when creating/updating a person.
 */
export function buildPersonLinkSignals(input: {
  email?: string;
  orgId?: string;
  organizationName?: string;
  domain?: string;
  workId?: string;
  workName?: string;
}): LinkSignals {
  const signals: LinkSignals = {};

  // Email domain signals
  if (input.email) {
    const domain = input.email.split("@")[1]?.toLowerCase();
    if (domain) {
      const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "me.com", "aol.com"];
      signals.email_domain_is_personal = personalDomains.includes(domain);
      signals.org_domain = signals.email_domain_is_personal ? null : domain;
    }
  }

  // Explicit org signals
  if (input.orgId || input.organizationName || input.domain) {
    signals.user_specified_org = true;
    signals.specified_org = input.orgId ?? input.organizationName ?? input.domain ?? null;
  }

  // Explicit work signals
  if (input.workId || input.workName) {
    signals.user_specified_work = true;
    signals.specified_work = input.workId ?? input.workName ?? null;
  }

  return signals;
}
