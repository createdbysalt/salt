import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";

export interface PersonLookupRow {
  id: string;
  name: string;
  email: string | null;
  relationship_type: string | null;
}

export interface OrgLookupRow {
  id: string;
  name: string;
  domain: string | null;
}

/**
 * Search people in a workspace by name or email (for Ask Salt / system plays).
 */
export async function findPeople(
  workspaceId: string,
  query: string,
  limit = 10,
): Promise<PersonLookupRow[]> {
  const admin = createAdminClient();
  const trimmed = query.trim();

  let dbQuery = admin
    .from("people")
    .select("id, name, email, relationship_type")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(limit);

  if (trimmed) {
    const pattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
    dbQuery = dbQuery.or(`name.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search people: ${error.message}`);
  }

  return (data ?? []) as PersonLookupRow[];
}

/**
 * Search organizations in a workspace by name or domain.
 */
export async function findOrgs(
  workspaceId: string,
  query: string,
  limit = 10,
): Promise<OrgLookupRow[]> {
  const admin = createAdminClient();
  const trimmed = query.trim();

  let dbQuery = admin
    .from("organizations")
    .select("id, name, domain")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(limit);

  if (trimmed) {
    const pattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
    dbQuery = dbQuery.or(`name.ilike.${pattern},domain.ilike.${pattern}`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search organizations: ${error.message}`);
  }

  return (data ?? []) as OrgLookupRow[];
}
