import type { createAdminClient } from "@/app/_lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export function slugifyProjectName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50) || "work"
  );
}

export async function ensureUniqueProjectSlug(
  admin: AdminClient,
  workspaceId: string,
  name: string,
): Promise<string> {
  const base = slugifyProjectName(name);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data } = await admin
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("slug", slug)
      .maybeSingle();

    if (!data) return slug;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export interface WorkParents {
  personId: string | null;
  organizationId: string | null;
}

/**
 * Resolve the organization a person primarily belongs to (via the
 * organization_people primary link), scoped to the workspace.
 * Returns null when the person has no primary organization.
 */
export async function resolvePrimaryOrgIdForPerson(
  admin: AdminClient,
  workspaceId: string,
  personId: string,
): Promise<string | null> {
  const { data: link, error: linkError } = await admin
    .from("organization_people")
    .select("organization_id")
    .eq("person_id", personId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  if (linkError) {
    throw new Error(linkError.message);
  }

  if (!link?.organization_id) return null;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id")
    .eq("id", link.organization_id)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (orgError) {
    throw new Error(orgError.message);
  }

  return org?.id ?? null;
}

/**
 * Resolve the person/organization parents for a work item.
 * Verifies the referenced entities belong to the workspace. When only a
 * person is given, the organization is inferred from their primary link.
 */
export async function resolveWorkParents(
  admin: AdminClient,
  workspaceId: string,
  input: { org_id?: string; person_id?: string },
): Promise<WorkParents> {
  const personId = input.person_id ?? null;

  if (input.org_id) {
    const { data: org, error } = await admin
      .from("organizations")
      .select("id")
      .eq("id", input.org_id)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!org) {
      throw new Error("Organization not found in this workspace");
    }

    return { personId, organizationId: org.id };
  }

  if (personId) {
    const { data: person, error: personError } = await admin
      .from("people")
      .select("id")
      .eq("id", personId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .maybeSingle();

    if (personError) {
      throw new Error(personError.message);
    }

    if (!person) {
      throw new Error("Person not found in this workspace");
    }

    const organizationId = await resolvePrimaryOrgIdForPerson(
      admin,
      workspaceId,
      personId,
    );

    return { personId, organizationId };
  }

  return { personId: null, organizationId: null };
}
