import "server-only";

/**
 * Org Resolver
 *
 * Resolves a domain to an existing Org or creates a new one.
 * Skips personal email domains (gmail, outlook, etc.) and known SaaS vendor
 * domains (clickup.com, mercury.com, …) — tools the operator pays are spend,
 * not relationships, so they never become org records.
 *
 * Also handles linking a Person to an Org after both are resolved.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { evaluateOrgProfileFields, ORG_PROFILE_SLUG } from "@/app/_features/plays/playbooks/records-engine/apply-org-profile";
import { loadProfilePlaybook } from "@/app/_features/plays/playbooks/records-engine/load-profile-playbook";
import { applyProfileFieldResults } from "@/app/_features/plays/playbooks/records-engine/write-provenance";
import { isKnownSaasVendorDomain } from "@/app/_features/capture/services/intelligence/vendor-domains";
import {
  getOperatorIdentity,
  isOperatorDomain,
  logOperatorRefusal,
} from "@/app/_lib/identity/operator";
import { executeRecordAction } from "./executor";
import { domainToOrgName, isMailInfraSubdomain } from "./org-naming";
import type { RecordActionResult } from "./types";
import { extractDomain, isPersonalDomain } from "./person-resolver";

// ============================================================================
// Types
// ============================================================================

export interface OrgResolutionResult {
  resolved: boolean;
  org_id?: string;
  org_name?: string;
  is_new: boolean;
  confidence: number;
  confidence_reason: string;
}

async function applyOrgProfileAfterResolution(input: {
  workspaceId: string;
  orgId: string;
  name: string;
  domain: string;
  createdFromDomain: boolean;
}) {
  const profilePlaybook = await loadProfilePlaybook(input.workspaceId, ORG_PROFILE_SLUG);
  const evaluation = evaluateOrgProfileFields({
    name: input.name,
    domain: input.domain,
    signals: {
      org_domain_known: true,
      org_created_from_domain: input.createdFromDomain,
    },
    systemRules: profilePlaybook.systemRules,
    settings: profilePlaybook.settings,
    blueprintVersion: profilePlaybook.blueprintVersion,
  });

  await applyProfileFieldResults({
    workspaceId: input.workspaceId,
    entityType: "organization",
    entityId: input.orgId,
    results: evaluation.results,
    blueprintSlug: evaluation.blueprintSlug,
    blueprintVersion: evaluation.blueprintVersion,
  });
}

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve a domain to an existing Org or create a new one.
 */
export async function resolveOrg(
  workspaceId: string,
  email: string
): Promise<OrgResolutionResult> {
  // Extract domain
  const domain = extractDomain(email);

  // Skip personal domains
  if (!domain || isPersonalDomain(email)) {
    return {
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: "Personal email domain — no Org to create",
    };
  }

  // Skip SaaS vendor domains (checked before the existing-org lookup so
  // pre-fix vendor orgs stop attracting links too — they get archived).
  if (isKnownSaasVendorDomain(domain)) {
    return {
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: "Known SaaS vendor domain — a tool you pay is not an org",
    };
  }

  // Operator self-exclusion: the operator's own business is the Me record,
  // never an org in their own Memory. Checked before the existing-org
  // lookup so pre-fix self-orgs stop attracting links too.
  const operator = await getOperatorIdentity(workspaceId);
  if (isOperatorDomain(operator, domain)) {
    logOperatorRefusal("records.resolveOrg", `domain="${domain}"`);
    return {
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: "Operator's own domain — the operator's business lives in Me, not orgs",
    };
  }

  // Skip automated mail infrastructure. Humans write from apex domains;
  // product mail comes from subdomains (notifications@am.atlassian.com,
  // receipts@email.vendor.io). The vendor list can't cover every tool, but
  // this structural signal catches the whole class. The person record still
  // forms — only the org birth is refused.
  if (isMailInfraSubdomain(domain)) {
    return {
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: "Mail-infrastructure subdomain — automated sender, no org birth",
    };
  }

  const admin = createAdminClient();

  // Check if org already exists by domain
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("domain", domain)
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();

  if (existingOrg) {
    await applyOrgProfileAfterResolution({
      workspaceId,
      orgId: existingOrg.id,
      name: existingOrg.name,
      domain,
      createdFromDomain: false,
    });

    return {
      resolved: true,
      org_id: existingOrg.id,
      org_name: existingOrg.name,
      is_new: false,
      confidence: 100,
      confidence_reason: "Existing org matched by domain",
    };
  }

  // Auto-create org from domain
  const orgName = domainToOrgName(domain);
  if (!orgName) {
    return {
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: "Service/infrastructure domain — no org-grade name",
    };
  }
  const result = await executeRecordAction(workspaceId, "system:create-org", {
    name: orgName,
    domain,
  });

  if (!result.success || !result.entity_id) {
    return {
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: `Creation failed: ${result.error ?? "missing organization id"}`,
    };
  }

  await applyOrgProfileAfterResolution({
    workspaceId,
    orgId: result.entity_id,
    name: orgName,
    domain,
    createdFromDomain: true,
  });

  return {
    resolved: true,
    org_id: result.entity_id,
    org_name: orgName,
    is_new: true,
    confidence: 80,
    confidence_reason: "Created from email domain",
  };
}

/**
 * Link a Person to an Org after both are resolved.
 */
export async function linkPersonToOrg(
  workspaceId: string,
  personId: string,
  orgId: string,
  actorUserId?: string
): Promise<RecordActionResult> {
  return executeRecordAction(
    workspaceId,
    "system:link-person-org",
    {
      person_id: personId,
      org_id: orgId,
    },
    actorUserId
  );
}

/**
 * Full resolution flow: resolve Person, resolve Org, link them.
 */
export async function resolvePersonAndOrg(
  workspaceId: string,
  email: string,
  name?: string,
  signals?: {
    has_payment_received?: boolean;
    has_stripe_payment?: boolean;
    has_invoice_sent?: boolean;
    is_bidirectional_thread?: boolean;
    you_initiated?: boolean;
    has_calendar_meeting?: boolean;
    has_signature?: boolean;
    email_count?: number;
  }
): Promise<{
  person: { id?: string; name?: string; is_new: boolean; resolved: boolean };
  org: { id?: string; name?: string; is_new: boolean; resolved: boolean };
  linked: boolean;
}> {
  // Import here to avoid circular dependency
  const { resolvePerson } = await import("./person-resolver");

  // Resolve person
  const personResult = await resolvePerson(workspaceId, {
    email,
    name,
    signals,
  });

  // Resolve org (only if person was resolved or needs confirmation)
  let orgResult: OrgResolutionResult = {
    resolved: false,
    is_new: false,
    confidence: 0,
    confidence_reason: "Person not resolved",
  };

  if (personResult.resolved || personResult.needs_confirmation) {
    orgResult = await resolveOrg(workspaceId, email);
  }

  // Link person to org if both resolved
  let linked = false;
  if (personResult.resolved && personResult.person_id && orgResult.resolved && orgResult.org_id) {
    const linkResult = await linkPersonToOrg(
      workspaceId,
      personResult.person_id,
      orgResult.org_id
    );
    linked = linkResult.success;
  }

  return {
    person: {
      id: personResult.person_id,
      name: personResult.person_name,
      is_new: personResult.is_new,
      resolved: personResult.resolved,
    },
    org: {
      id: orgResult.org_id,
      name: orgResult.org_name,
      is_new: orgResult.is_new,
      resolved: orgResult.resolved,
    },
    linked,
  };
}

// ============================================================================
// Helpers
// ============================================================================

// Naming helpers (domainToOrgName, normalizeOrgName, …) live in ./org-naming,
// a pure leaf module, so executor.ts can use them without a circular import —
// org-resolver depends on the executor.
