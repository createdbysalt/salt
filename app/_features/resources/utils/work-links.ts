import type { createClient } from "@/app/_lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Resource ↔ work linkage lives in entity_links (source_type='resource',
 * target_type='work') — the legacy files.project_id column was dropped in the
 * Phase 6.4 rename wave. These helpers keep the "a resource belongs to one
 * work item" UI semantics on top of the edge store. Reads dual-read the
 * legacy 'file' spelling until the rename backfill is verified complete.
 */

/** Post-rename canon plus the pre-rename legacy spelling (dual-read). */
const RESOURCE_SOURCE_TYPES = ["resource", "file"] as const;

/** First work edge per file, batched. */
export async function getFileWorkLinkMap(
  supabase: Supabase,
  workspaceId: string,
  fileIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (fileIds.length === 0) return map;

  const { data, error } = await supabase
    .from("entity_links")
    .select("source_id, target_id, created_at")
    .eq("workspace_id", workspaceId)
    .in("source_type", [...RESOURCE_SOURCE_TYPES])
    .eq("target_type", "work")
    .in("source_id", fileIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching file work links:", error);
    return map;
  }

  for (const link of data ?? []) {
    if (!map.has(link.source_id)) {
      map.set(link.source_id, link.target_id);
    }
  }
  return map;
}

/**
 * Replace the file's work link (single-project UI semantics): removes existing
 * file→work edges, then inserts the new one when workId is non-null.
 */
export async function setFileWorkLink(
  supabase: Supabase,
  workspaceId: string,
  fileId: string,
  workId: string | null,
  createdBy?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: deleteError } = await supabase
    .from("entity_links")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("source_type", [...RESOURCE_SOURCE_TYPES])
    .eq("source_id", fileId)
    .eq("target_type", "work");

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  if (!workId) return { ok: true };

  const { error: insertError } = await supabase.from("entity_links").insert({
    workspace_id: workspaceId,
    source_type: "resource",
    source_id: fileId,
    target_type: "work",
    target_id: workId,
    relation_type: "related",
    source: "manual",
    created_by: createdBy ?? null,
  });

  if (insertError && insertError.code !== "23505") {
    return { ok: false, message: insertError.message };
  }

  return { ok: true };
}
