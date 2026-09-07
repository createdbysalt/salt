import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import type {
  Organization,
  OrganizationRow,
  Person,
  PersonRow,
  Team,
  TeamRow,
  RelationshipEntity,
  RelationshipStatus,
  transformOrganizationRow,
  transformPersonRow,
  transformTeamRow,
} from "./types";
import {
  transformOrganizationRow as transformOrg,
  transformPersonRow as transformPerson,
  transformTeamRow as transformTeam,
} from "./types";

// ============================================================================
// Organizations Queries
// ============================================================================

export type MemoryListQueryOptions = {
  limit?: number;
  offset?: number;
};

const DEFAULT_MEMORY_LIST_LIMIT = 100;

const PEOPLE_DIRECTORY_COLUMNS =
  "id, workspace_id, name, email, phone, title, relationship_status, avatar_url, created_at, updated_at, deleted_at";

const ORG_DIRECTORY_COLUMNS =
  "id, workspace_id, name, slug, relationship_status, website, industry, address, created_at, updated_at, deleted_at";

/**
 * Get organizations for the current workspace (bounded list for directory views).
 */
export const getOrganizations = cache(
  async (options: MemoryListQueryOptions = {}): Promise<Organization[]> => {
    const { limit = DEFAULT_MEMORY_LIST_LIMIT, offset = 0 } = options;
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("organizations")
      .select(ORG_DIRECTORY_COLUMNS)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching organizations:", error);
      throw error;
    }

    return (data as OrganizationRow[]).map((row) =>
      transformOrg({
        ...row,
        notes: null,
        metadata: {},
      } as OrganizationRow),
    );
  },
);

/**
 * Get a single organization by ID with its people.
 */
export const getOrganization = cache(
  async (organizationId: string): Promise<Organization | null> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .eq("workspace_id", workspace.id)
      .single();

    if (orgError) {
      if (orgError.code === "PGRST116") return null;
      console.error("Error fetching organization:", orgError);
      throw orgError;
    }

    const organization = transformOrg(org as OrganizationRow);

    // Fetch associated people
    const { data: orgPeople, error: peopleError } = await supabase
      .from("organization_people")
      .select(
        `
        id,
        role,
        is_primary,
        person:people(*)
      `
      )
      .eq("organization_id", organizationId);

    if (!peopleError && orgPeople) {
      organization.people = orgPeople
        .filter((op) => op.person)
        .map((op) => {
          // Supabase returns joined records as objects (not arrays) when using single FK joins
          const personData = op.person as unknown as PersonRow;
          return transformPerson(personData);
        });

      const primaryOp = orgPeople.find((op) => op.is_primary);
      if (primaryOp?.person) {
        organization.primaryContact = transformPerson(
          primaryOp.person as unknown as PersonRow
        );
      }
    }

    return organization;
  }
);

/**
 * Get organizations filtered by relationship status.
 */
export const getOrganizationsByStatus = cache(
  async (status: RelationshipStatus): Promise<Organization[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("relationship_status", status)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching organizations by status:", error);
      throw error;
    }

    return (data as OrganizationRow[]).map(transformOrg);
  }
);

// ============================================================================
// People Queries
// ============================================================================

/**
 * Get people for the current workspace (bounded list for directory views).
 */
export const getPeople = cache(
  async (options: MemoryListQueryOptions = {}): Promise<Person[]> => {
    const { limit = DEFAULT_MEMORY_LIST_LIMIT, offset = 0 } = options;
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("people")
      .select(PEOPLE_DIRECTORY_COLUMNS)
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching people:", error);
      throw error;
    }

    return (data as PersonRow[]).map((row) =>
      transformPerson({
        ...row,
        notes: null,
        metadata: {},
        portal_user_id: null,
      } as PersonRow),
    );
  },
);

/**
 * Get a single person by ID with their organizations.
 */
export const getPerson = cache(
  async (personId: string): Promise<Person | null> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data: person, error: personError } = await supabase
      .from("people")
      .select("*")
      .eq("id", personId)
      .eq("workspace_id", workspace.id)
      .single();

    if (personError) {
      if (personError.code === "PGRST116") return null;
      console.error("Error fetching person:", personError);
      throw personError;
    }

    const personEntity = transformPerson(person as PersonRow);

    // Fetch associated organizations
    const { data: orgLinks, error: orgError } = await supabase
      .from("organization_people")
      .select(
        `
        id,
        role,
        is_primary,
        organization:organizations(id, name)
      `
      )
      .eq("person_id", personId);

    if (!orgError && orgLinks) {
      personEntity.organizations = orgLinks
        .filter((ol) => ol.organization)
        .map((ol) => {
          const org = ol.organization as unknown as { id: string; name: string };
          return {
            organizationId: org.id,
            organizationName: org.name,
            role: ol.role,
            isPrimary: ol.is_primary,
          };
        });
    }

    return personEntity;
  }
);

/**
 * Get people filtered by relationship status.
 */
export const getPeopleByStatus = cache(
  async (status: RelationshipStatus): Promise<Person[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("relationship_status", status)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching people by status:", error);
      throw error;
    }

    return (data as PersonRow[]).map(transformPerson);
  }
);

/**
 * Get people with Spaces access.
 */
export const getPeopleWithPortalAccess = cache(async (): Promise<Person[]> => {
  const { workspace, supabase } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("workspace_id", workspace.id)
    .not("portal_user_id", "is", null)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching people with portal access:", error);
    throw error;
  }

  return (data as PersonRow[]).map(transformPerson);
});

// ============================================================================
// Unified List Query (for Directory view)
// ============================================================================

/**
 * Get all relationships (people + organizations) for the directory view.
 * Returns a unified list sorted by name.
 */
export const getAllRelationships = cache(
  async (filter?: {
    status?: RelationshipStatus;
    type?: "person" | "organization";
    search?: string;
  }): Promise<RelationshipEntity[]> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const results: RelationshipEntity[] = [];

    // Fetch organizations (if not filtered to people only)
    if (!filter?.type || filter.type === "organization") {
      let orgQuery = supabase
        .from("organizations")
        .select(
          `
          *,
          organization_people!inner(
            is_primary,
            person:people(name)
          )
        `
        )
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null);

      if (filter?.status) {
        orgQuery = orgQuery.eq("relationship_status", filter.status);
      }

      if (filter?.search) {
        orgQuery = orgQuery.ilike("name", `%${filter.search}%`);
      }

      const { data: orgs, error: orgError } = await orgQuery;

      if (orgError) {
        console.error("Error fetching organizations:", orgError);
      } else if (orgs) {
        for (const org of orgs as (OrganizationRow & {
          organization_people?: Array<{
            is_primary: boolean;
            person: { name: string } | null;
          }>;
        })[]) {
          const primaryContact = org.organization_people?.find(
            (op) => op.is_primary
          );
          results.push({
            id: org.id,
            entityType: "organization",
            name: org.name,
            relationshipStatus: org.relationship_status,
            email: null,
            phone: null,
            createdAt: new Date(org.created_at),
            updatedAt: new Date(org.updated_at),
            website: org.website,
            industry: org.industry,
            primaryContactName: primaryContact?.person?.name ?? null,
          });
        }
      }
    }

    // Fetch people (if not filtered to organizations only)
    if (!filter?.type || filter.type === "person") {
      let peopleQuery = supabase
        .from("people")
        .select(
          `
          *,
          organization_people(
            is_primary,
            organization:organizations(name)
          )
        `
        )
        .eq("workspace_id", workspace.id)
        .is("deleted_at", null);

      if (filter?.status) {
        peopleQuery = peopleQuery.eq("relationship_status", filter.status);
      }

      if (filter?.search) {
        peopleQuery = peopleQuery.or(
          `name.ilike.%${filter.search}%,email.ilike.%${filter.search}%`
        );
      }

      const { data: people, error: peopleError } = await peopleQuery;

      if (peopleError) {
        console.error("Error fetching people:", peopleError);
      } else if (people) {
        for (const person of people as (PersonRow & {
          organization_people?: Array<{
            is_primary: boolean;
            organization: { name: string } | null;
          }>;
        })[]) {
          const primaryOrg = person.organization_people?.find(
            (op) => op.is_primary
          );
          results.push({
            id: person.id,
            entityType: "person",
            name: person.name,
            relationshipStatus: person.relationship_status,
            email: person.email,
            phone: person.phone,
            createdAt: new Date(person.created_at),
            updatedAt: new Date(person.updated_at),
            title: person.title,
            avatarUrl: person.avatar_url,
            hasPortalAccess: !!person.portal_user_id,
            organizationName: primaryOrg?.organization?.name ?? null,
          });
        }
      }
    }

    // Sort by name
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }
);

// ============================================================================
// Count Queries (for stats/dashboards)
// ============================================================================

export const getRelationshipCounts = cache(
  async (): Promise<{
    organizations: number;
    people: number;
    clients: number;
    prospects: number;
    withPortalAccess: number;
  }> => {
    const { workspace, supabase } = await getWorkspaceContext();

    const [orgsResult, peopleResult, clientsResult, prospectsResult, portalResult] =
      await Promise.all([
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)
          .is("deleted_at", null),
        supabase
          .from("people")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)
          .is("deleted_at", null),
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)
          .eq("relationship_status", "client")
          .is("deleted_at", null),
        supabase
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)
          .eq("relationship_status", "prospect")
          .is("deleted_at", null),
        supabase
          .from("people")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)
          .not("portal_user_id", "is", null)
          .is("deleted_at", null),
      ]);

    return {
      organizations: orgsResult.count ?? 0,
      people: peopleResult.count ?? 0,
      clients: clientsResult.count ?? 0,
      prospects: prospectsResult.count ?? 0,
      withPortalAccess: portalResult.count ?? 0,
    };
  }
);
