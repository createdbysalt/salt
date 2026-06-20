import "server-only";

/**
 * Org Resolver
 *
 * Resolves a domain to an existing Org or creates a new one.
 * Skips personal email domains (gmail, outlook, etc.).
 *
 * Also handles linking a Person to an Org after both are resolved.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { executeSystemPlay } from "./executor";
import type { SystemPlayResult } from "./types";
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

  const admin = createAdminClient();

  // Check if org already exists by domain
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id, name")
    .eq("studio_id", workspaceId)
    .eq("domain", domain)
    .is("archived_at", null)
    .maybeSingle();

  if (existingOrg) {
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
  const result = await executeSystemPlay(workspaceId, "system:create-org", {
    name: orgName,
    domain,
  });

  if (!result.success) {
    return {
      resolved: false,
      is_new: false,
      confidence: 0,
      confidence_reason: `Creation failed: ${result.error}`,
    };
  }

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
): Promise<SystemPlayResult> {
  return executeSystemPlay(
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

/**
 * Convert a domain to an org name.
 * e.g., "acme-corp.com" → "Acme Corp"
 */
function domainToOrgName(domain: string): string {
  // Remove TLD
  const parts = domain.split(".");
  const baseName = parts[0];

  // Convert to title case, replacing hyphens/underscores with spaces
  return baseName
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
