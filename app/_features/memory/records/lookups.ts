import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { Constants } from "@/app/_lib/supabase/database.types";
import type { Database } from "@/app/_lib/supabase/database.types";

type FileCategory = Database["public"]["Enums"]["file_category"];
type OperatorFactCategory = Database["public"]["Enums"]["operator_fact_category"];

const FILE_CATEGORY_VALUES: readonly string[] =
  Constants.public.Enums.file_category;
const OPERATOR_FACT_CATEGORY_VALUES: readonly string[] =
  Constants.public.Enums.operator_fact_category;

function isFileCategory(value: string): value is FileCategory {
  return FILE_CATEGORY_VALUES.includes(value);
}

function isOperatorFactCategory(value: string): value is OperatorFactCategory {
  return OPERATOR_FACT_CATEGORY_VALUES.includes(value);
}

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

export interface BillingLookupRow {
  id: string;
  direction: string;
  amount_cents: number;
  currency: string;
  status: string;
  vendor_label: string | null;
  number: string | null;
  due_at: string | null;
}

export interface FileLookupRow {
  id: string;
  file_name: string;
  category: string;
  description: string | null;
  document_type: string | null;
  external_url: string | null;
}

export interface MeFactLookupRow {
  id: string;
  value: string;
  label: string | null;
  category: string;
  kind: string;
  status: string;
}

export interface TagLookupRow {
  id: string;
  slug: string;
  label: string;
  scope: string;
  category: string;
  color: string | null;
}

export interface WorkLookupRow {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  work_type: string | null;
  person_name: string | null;
  organization_name: string | null;
}

/**
 * Search people in a workspace by name or email (for Ask Salt and record actions).
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
 * Search work/projects in a workspace by name.
 */
export async function findWork(
  workspaceId: string,
  query: string,
  limit = 10,
): Promise<WorkLookupRow[]> {
  const admin = createAdminClient();
  const trimmed = query.trim();

  let dbQuery = admin
    .from("work")
    .select(`
      id,
      name,
      slug,
      status,
      work_type,
      people:person_id(name),
      organizations:organization_id(name)
    `)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (trimmed) {
    const pattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
    dbQuery = dbQuery.or(`name.ilike.${pattern},slug.ilike.${pattern}`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search work: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const people = row.people as unknown;
    const orgs = row.organizations as unknown;
    let personName: string | null = null;
    let orgName: string | null = null;
    if (people && typeof people === "object" && "name" in people) {
      personName = (people as { name: string }).name;
    }
    if (orgs && typeof orgs === "object" && "name" in orgs) {
      orgName = (orgs as { name: string }).name;
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      work_type: row.work_type,
      person_name: personName,
      organization_name: orgName,
    };
  }) as WorkLookupRow[];
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

/**
 * Search billing records in a workspace by vendor name, number, or amount.
 */
export async function findBilling(
  workspaceId: string,
  query: string,
  direction?: "receivable" | "payable",
  limit = 10,
): Promise<BillingLookupRow[]> {
  const admin = createAdminClient();
  const trimmed = query.trim();

  let dbQuery = admin
    .from("billing_records")
    .select("id, direction, amount_cents, currency, status, vendor_label, number, due_at")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (direction) {
    dbQuery = dbQuery.eq("direction", direction);
  }

  if (trimmed) {
    const pattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
    dbQuery = dbQuery.or(`vendor_label.ilike.${pattern},number.ilike.${pattern}`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search billing records: ${error.message}`);
  }

  return (data ?? []) as BillingLookupRow[];
}

/**
 * Search files in a workspace by name or description.
 */
export async function findFiles(
  workspaceId: string,
  query: string,
  category?: string,
  limit = 10,
): Promise<FileLookupRow[]> {
  const admin = createAdminClient();
  const trimmed = query.trim();

  let dbQuery = admin
    .from("resources")
    .select("id, file_name, category, description, document_type, external_url")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) {
    // category is an enum column: a value outside the enum can't match any
    // row (filtering with it would fail the whole query at Postgres).
    if (!isFileCategory(category)) return [];
    dbQuery = dbQuery.eq("category", category);
  }

  if (trimmed) {
    const pattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
    dbQuery = dbQuery.or(`file_name.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search files: ${error.message}`);
  }

  return (data ?? []) as FileLookupRow[];
}

/**
 * Search operator memory facts (Me) in a workspace.
 */
export async function findMeFacts(
  workspaceId: string,
  query: string,
  category?: string,
  limit = 10,
): Promise<MeFactLookupRow[]> {
  const admin = createAdminClient();
  const trimmed = query.trim();

  let dbQuery = admin
    .from("operator_memory_facts")
    .select("id, value, label, category, kind, status")
    .eq("workspace_id", workspaceId)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) {
    // category is an enum column: a value outside the enum can't match any
    // row (filtering with it would fail the whole query at Postgres).
    if (!isOperatorFactCategory(category)) return [];
    dbQuery = dbQuery.eq("category", category);
  }

  if (trimmed) {
    const pattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;
    dbQuery = dbQuery.or(`value.ilike.${pattern},label.ilike.${pattern}`);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to search operator facts: ${error.message}`);
  }

  return (data ?? []) as MeFactLookupRow[];
}

/**
 * List available tags in the workspace.
 */
export async function findTags(
  workspaceId: string,
  scope?: string,
  category?: string,
): Promise<TagLookupRow[]> {
  const admin = createAdminClient();

  let dbQuery = admin
    .from("workspace_tags")
    .select("id, slug, label, scope, category, color")
    .eq("workspace_id", workspaceId)
    .eq("is_archived", false)
    .order("sort_order", { ascending: true });

  if (scope && scope !== "all") {
    dbQuery = dbQuery.or(`scope.eq.${scope},scope.eq.all`);
  }

  if (category) {
    dbQuery = dbQuery.eq("category", category);
  }

  const { data, error } = await dbQuery;

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return (data ?? []) as TagLookupRow[];
}
