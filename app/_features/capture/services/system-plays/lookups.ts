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

export interface MeetingLookupRow {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_type: string | null;
  person_name: string | null;
  status: string | null;
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

/**
 * Search meetings in a workspace by title.
 */
export async function findMeetings(
  workspaceId: string,
  query: string,
  limit = 10,
): Promise<MeetingLookupRow[]> {
  const admin = createAdminClient();
  const trimmed = query.trim();

  let dbQuery = admin
    .from("meetings")
    .select(`
      id,
      title,
      start_time,
      end_time,
      meeting_type,
      status,
      people:person_id(name)
    `)
    .eq("workspace_id", workspaceId)
    .neq("status", "cancelled")
    .order("start_time", { ascending: false })
    .limit(limit);

  if (trimmed) {
    const pattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
    dbQuery = dbQuery.ilike("title", pattern);
  } else {
    // If no query, show upcoming meetings
    dbQuery = dbQuery.gte("start_time", new Date().toISOString());
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search meetings: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const people = row.people as unknown;
    let personName: string | null = null;
    if (people && typeof people === "object" && "name" in people) {
      personName = (people as { name: string }).name;
    }
    return {
      id: row.id,
      title: row.title,
      start_time: row.start_time,
      end_time: row.end_time,
      meeting_type: row.meeting_type,
      status: row.status,
      person_name: personName,
    };
  }) as MeetingLookupRow[];
}
