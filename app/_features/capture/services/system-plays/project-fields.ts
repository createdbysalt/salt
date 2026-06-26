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

export async function findOrCreateClient(
  admin: AdminClient,
  workspaceId: string,
  input: { name: string; slug: string },
): Promise<string> {
  const { data: existing, error: existingError } = await admin
    .from("clients")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", input.slug)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) return existing.id;

  const { data: created, error: createError } = await admin
    .from("clients")
    .insert({
      workspace_id: workspaceId,
      name: input.name,
      slug: input.slug,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to create client for work");
  }

  return created.id;
}

async function resolveClientFromOrg(
  admin: AdminClient,
  workspaceId: string,
  orgId: string,
): Promise<string> {
  const { data: org, error } = await admin
    .from("organizations")
    .select("id, name, migrated_from_client_id")
    .eq("id", orgId)
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!org) {
    throw new Error("Organization not found in this workspace");
  }

  if (org.migrated_from_client_id) {
    return org.migrated_from_client_id as string;
  }

  return findOrCreateClient(admin, workspaceId, {
    name: org.name as string,
    slug: slugifyProjectName(org.name as string),
  });
}

export async function resolveClientFromPerson(
  admin: AdminClient,
  workspaceId: string,
  personId: string,
): Promise<string> {
  const { data: link, error: linkError } = await admin
    .from("organization_people")
    .select("organization:organizations(id, name, migrated_from_client_id)")
    .eq("person_id", personId)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();

  if (linkError) {
    throw new Error(linkError.message);
  }

  const organization = link?.organization as
    | { id: string; name: string; migrated_from_client_id: string | null }
    | null
    | undefined;

  if (organization?.id) {
    return resolveClientFromOrg(admin, workspaceId, organization.id);
  }

  const { data: person, error: personError } = await admin
    .from("people")
    .select("name")
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

  return findOrCreateClient(admin, workspaceId, {
    name: person.name as string,
    slug: slugifyProjectName(person.name as string),
  });
}

export async function resolveClientIdForWork(
  admin: AdminClient,
  workspaceId: string,
  input: { org_id?: string; person_id?: string; workName: string },
): Promise<string> {
  if (input.org_id) {
    return resolveClientFromOrg(admin, workspaceId, input.org_id);
  }

  if (input.person_id) {
    return resolveClientFromPerson(admin, workspaceId, input.person_id);
  }

  return findOrCreateClient(admin, workspaceId, {
    name: "General",
    slug: "memory-general",
  });
}
