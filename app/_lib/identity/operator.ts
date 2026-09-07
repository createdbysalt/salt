import "server-only";

/**
 * Operator Identity Guard
 *
 * The operator (the workspace's owner/members) and their own business must
 * never become person/org records in their own Memory — self-contamination
 * produced records like org "Createdbysalt" and people holding the
 * operator's own email. Every record-birth path (records executor,
 * evidence auto-create, capture classifier, Ask Salt intake) checks here
 * before creating a person or org.
 *
 * Identity is assembled from four sources so it holds even when the
 * workspace profile is half-filled (e.g. website_url never set):
 * - workspace_members.email (+ user_id → profiles)
 * - profiles.email / full_name / display_name
 * - workspaces.website_url (domain), workspaces.business_email
 * - workspaces.name
 *
 * False-positive contract: refuse ONLY on exact email match, exact (or
 * subdomain-of) domain match, or exact normalized full-name match. Every
 * refusal is logged.
 */

import { cache } from "react";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { domainFromWebsiteUrl, isPersonalEmailDomain } from "./domain";

export interface OperatorIdentity {
  /** Lowercased email addresses belonging to the operator/workspace. */
  emails: ReadonlySet<string>;
  /** Normalized names (see normalizeOperatorName) of operator + business. */
  names: ReadonlySet<string>;
  /** Lowercased apex domains belonging to the operator's business. */
  domains: ReadonlySet<string>;
}

export const EMPTY_OPERATOR_IDENTITY: OperatorIdentity = {
  emails: new Set(),
  names: new Set(),
  domains: new Set(),
};

/**
 * Normalized comparison key for person/business names — "Gabriella  Martins",
 * "gabriella martins", and "Gabriella-Martins" are the same name. Matching is
 * exact after normalization; partial matches never refuse.
 */
export function normalizeOperatorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

async function loadOperatorIdentity(
  workspaceId: string
): Promise<OperatorIdentity> {
  const admin = createAdminClient();

  const emails = new Set<string>();
  const names = new Set<string>();
  const domains = new Set<string>();

  const addEmail = (value: string | null | undefined) => {
    if (!value) return;
    const email = normalizeEmail(value);
    if (!email || !email.includes("@")) return;
    emails.add(email);
    const domain = email.split("@")[1];
    if (domain && !isPersonalEmailDomain(domain)) {
      domains.add(domain);
    }
  };
  const addName = (value: string | null | undefined) => {
    if (!value) return;
    const normalized = normalizeOperatorName(value);
    if (normalized) names.add(normalized);
  };

  // Plain awaited list queries (no maybeSingle/in on this path) — the
  // evidence lane's test fakes model PostgREST builders minimally.
  const [membersResult, workspacesResult] = await Promise.all([
    admin
      .from("workspace_members")
      .select("email, user_id")
      .eq("workspace_id", workspaceId),
    admin
      .from("workspaces")
      .select("name, website_url, business_email, owner_id")
      .eq("id", workspaceId),
  ]);

  const members = Array.isArray(membersResult.data) ? membersResult.data : [];
  for (const member of members) {
    addEmail(member.email);
  }

  const workspacesData = workspacesResult.data;
  const workspace = Array.isArray(workspacesData)
    ? workspacesData[0]
    : workspacesData;
  if (workspace) {
    addName(workspace.name);
    addEmail(workspace.business_email);
    const websiteDomain = domainFromWebsiteUrl(workspace.website_url);
    if (websiteDomain) domains.add(websiteDomain);
  }

  const userIds = new Set<string>();
  for (const member of members) {
    if (member.user_id) userIds.add(member.user_id);
  }
  if (workspace?.owner_id) userIds.add(workspace.owner_id);

  if (userIds.size > 0) {
    const { data: profileRows } = await admin
      .from("profiles")
      .select("email, full_name, display_name")
      .in("id", [...userIds]);
    const profiles = Array.isArray(profileRows) ? profileRows : [];
    for (const profile of profiles) {
      addEmail(profile.email);
      addName(profile.full_name);
      addName(profile.display_name);
    }
  }

  return { emails, names, domains };
}

/**
 * Per-request memoized identity. React `cache` scopes the memo to the
 * request in the Next.js server runtime; outside it (scripts, tests) it is a
 * passthrough, so cron/backlog callers always see fresh data.
 */
export const getOperatorIdentity: (
  workspaceId: string
) => Promise<OperatorIdentity> = cache(loadOperatorIdentity);

export function isOperatorEmail(
  identity: OperatorIdentity,
  email: string | null | undefined
): boolean {
  if (!email) return false;
  return identity.emails.has(normalizeEmail(email));
}

export function isOperatorName(
  identity: OperatorIdentity,
  name: string | null | undefined
): boolean {
  if (!name) return false;
  const normalized = normalizeOperatorName(name);
  return normalized.length > 0 && identity.names.has(normalized);
}

export function isOperatorDomain(
  identity: OperatorIdentity,
  domain: string | null | undefined
): boolean {
  if (!domain) return false;
  const candidate = domain.toLowerCase().trim().replace(/^www\./, "");
  if (!candidate) return false;
  for (const own of identity.domains) {
    if (candidate === own || candidate.endsWith(`.${own}`)) return true;
  }
  return false;
}

/** Refusals are always logged — silent drops make self-contamination invisible. */
export function logOperatorRefusal(scope: string, detail: string): void {
  console.warn(`[operator-guard] ${scope}: refused — ${detail}`);
}
