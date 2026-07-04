import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type { ResolvedEntity } from "@/app/_lib/notes";

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export const getLinkableEntities = cache(async (): Promise<ResolvedEntity[]> => {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();

  const [peopleResult, orgsResult, workResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("work")
      .select("id, title")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .order("title"),
  ]);

  const entities: ResolvedEntity[] = [];

  for (const person of peopleResult.data ?? []) {
    entities.push({
      id: person.id,
      type: "person",
      name: person.name,
      slug: nameToSlug(person.name),
    });
  }

  for (const org of orgsResult.data ?? []) {
    entities.push({
      id: org.id,
      type: "org",
      name: org.name,
      slug: nameToSlug(org.name),
    });
  }

  for (const work of workResult.data ?? []) {
    entities.push({
      id: work.id,
      type: "work",
      name: work.title,
      slug: nameToSlug(work.title),
    });
  }

  return entities.sort((a, b) => a.name.localeCompare(b.name));
});
