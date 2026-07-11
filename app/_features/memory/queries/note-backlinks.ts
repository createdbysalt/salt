import "server-only";

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type { EntityType } from "./entity-notes";

export interface BacklinkedNote {
  noteId: string;
  noteContent: string;
  noteCreatedAt: string;
  noteAuthorType: "user" | "salt";
  noteIsPinned: boolean;
  noteTags: string[];
  sourceEntityType: EntityType;
  sourceEntityId: string;
  sourceEntityName: string;
}

/**
 * Get notes that @mention a specific entity.
 * These appear as "Mentioned in a note on [Source Entity]" in the Notes tab.
 */
export const getBacklinkedNotes = cache(
  async (entityType: EntityType, entityId: string): Promise<BacklinkedNote[]> => {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_backlinked_notes", {
      p_workspace_id: workspace.id,
      p_entity_type: entityType,
      p_entity_id: entityId,
    });

    if (error) {
      console.error("Failed to fetch backlinked notes:", error);
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      noteId: row.note_id as string,
      noteContent: row.note_content as string,
      noteCreatedAt: row.note_created_at as string,
      noteAuthorType: row.note_author_type as "user" | "salt",
      noteIsPinned: row.note_is_pinned as boolean,
      noteTags: (row.note_tags as string[]) ?? [],
      sourceEntityType: row.source_entity_type as EntityType,
      sourceEntityId: row.source_entity_id as string,
      sourceEntityName: (row.source_entity_name as string) ?? "Unknown",
    }));
  }
);

/**
 * Get count of backlinked notes for an entity.
 */
export async function getBacklinkedNotesCount(
  entityType: EntityType,
  entityId: string
): Promise<number> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("note_mentions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("mentioned_entity_type", entityType)
    .eq("mentioned_entity_id", entityId);

  if (error) {
    console.error("Failed to count backlinked notes:", error);
    return 0;
  }

  return count ?? 0;
}
