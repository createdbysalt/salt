"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";

export type WorkSearchResult = {
  id: string;
  name: string;
};

export async function searchWork(
  query: string,
): Promise<{ ok: true; data: WorkSearchResult[] } | { ok: false; error: string }> {
  const { context } = await getTenantContext();
  const workspace = getWorkspaceMemberOrNull(context);

  if (!workspace) {
    return { ok: false, error: "Not signed in" };
  }

  const admin = createAdminClient();

  let queryBuilder = admin
    .from("projects")
    .select("id, name")
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .limit(20);

  if (query.trim()) {
    queryBuilder = queryBuilder.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
    })),
  };
}
