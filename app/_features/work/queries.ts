import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";

export interface MemoryWorkRow {
  id: string;
  name: string;
  status: string;
  updatedAt: Date;
}

/**
 * List work/projects for the Memory directory — no clients-table join so
 * system-play rows (person-linked client_id) still appear.
 */
export const getMemoryWorkItems = cache(async (): Promise<MemoryWorkRow[]> => {
  const { workspace } = await getWorkspaceContext();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, updated_at")
    .eq("studio_id", workspace.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching memory work items:", error);
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    updatedAt: new Date(row.updated_at),
  }));
});
