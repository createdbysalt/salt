import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import {
  mapNoteRow,
  type EntityNoteWithProvenance,
} from "@/app/_features/memory/types/taxonomies";

export type EntityType = "person" | "organization" | "work" | "billing" | "meeting";

export const getEntityNotes = cache(
  async (
    entityType: EntityType,
    entityId: string,
    options?: { includeDismissed?: boolean }
  ): Promise<EntityNoteWithProvenance[]> => {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_entity_notes_with_provenance", {
      p_workspace_id: workspace.id,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_include_dismissed: options?.includeDismissed ?? false,
    });

    if (error) {
      console.error("Failed to fetch entity notes:", error);
      return [];
    }

    return (data ?? []).map(mapNoteRow);
  }
);

export async function getEntityNotesCount(
  entityType: EntityType,
  entityId: string
): Promise<number> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .is("deleted_at", null)
    .neq("status", "dismissed");

  if (error) {
    console.error("Failed to count entity notes:", error);
    return 0;
  }

  return count ?? 0;
}

export async function getProposedNotesCount(
  entityType: EntityType,
  entityId: string
): Promise<number> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "proposed")
    .is("deleted_at", null);

  if (error) {
    console.error("Failed to count proposed notes:", error);
    return 0;
  }

  return count ?? 0;
}
