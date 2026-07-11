"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { extractWikilinks } from "@/app/_lib/notes";
import { deleteEdgesFrom, upsertEdge } from "@/app/_features/memory/lib/edge-store";
import type { EntityType } from "@/app/_features/memory/queries/entity-notes";

interface CreateEntityNoteInput {
  entityType: EntityType;
  entityId: string;
  content: string;
  title?: string;
  tags?: string[];
}

interface CreateEntityNoteResult {
  success: boolean;
  noteId?: string;
  error?: string;
}

export async function createEntityNote(
  input: CreateEntityNoteInput
): Promise<CreateEntityNoteResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: note, error } = await supabase
      .from("notes")
      .insert({
        workspace_id: workspace.id,
        entity_type: input.entityType,
        entity_id: input.entityId,
        content: input.content,
        title: input.title ?? null,
        tags: input.tags ?? [],
        author_type: "user",
        source: "manual",
        status: "confirmed",
        note_kind: "general",
        is_pinned: false,
        is_archived: false,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create entity note:", error);
      return { success: false, error: error.message };
    }

    // Sync wikilink relations and backlinks
    const wikilinks = extractWikilinks(input.content);
    await syncNoteWikilinks(
      supabase,
      note.id,
      workspace.id,
      input.entityType,
      input.entityId,
      wikilinks
    );

    revalidateEntityPaths(input.entityType, input.entityId);

    return { success: true, noteId: note.id };
  } catch (err) {
    console.error("Error creating entity note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

interface UpdateEntityNoteInput {
  noteId: string;
  content: string;
  title?: string;
  tags?: string[];
}

interface UpdateEntityNoteResult {
  success: boolean;
  error?: string;
}

export async function updateEntityNote(
  input: UpdateEntityNoteInput
): Promise<UpdateEntityNoteResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    // First get the note to verify ownership and get entity info
    const { data: existingNote, error: fetchError } = await supabase
      .from("notes")
      .select("entity_type, entity_id")
      .eq("id", input.noteId)
      .eq("workspace_id", workspace.id)
      .single();

    if (fetchError || !existingNote) {
      return { success: false, error: "Note not found" };
    }

    const updatePayload: Record<string, unknown> = {
      content: input.content,
      title: input.title ?? null,
    };
    if (input.tags !== undefined) {
      updatePayload.tags = input.tags;
    }

    const { error } = await supabase
      .from("notes")
      .update(updatePayload)
      .eq("id", input.noteId)
      .eq("workspace_id", workspace.id);

    if (error) {
      console.error("Failed to update entity note:", error);
      return { success: false, error: error.message };
    }

    // Re-sync wikilink relations and backlinks
    const wikilinks = extractWikilinks(input.content);
    if (existingNote.entity_type && existingNote.entity_id) {
      await syncNoteWikilinks(
        supabase,
        input.noteId,
        workspace.id,
        existingNote.entity_type as EntityType,
        existingNote.entity_id,
        wikilinks
      );
    }

    if (existingNote.entity_type && existingNote.entity_id) {
      revalidateEntityPaths(
        existingNote.entity_type as EntityType,
        existingNote.entity_id
      );
    }

    return { success: true };
  } catch (err) {
    console.error("Error updating entity note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

interface ToggleNotePinInput {
  noteId: string;
  isPinned: boolean;
}

export async function toggleEntityNotePin(
  input: ToggleNotePinInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data: note, error: fetchError } = await supabase
      .from("notes")
      .select("entity_type, entity_id")
      .eq("id", input.noteId)
      .eq("workspace_id", workspace.id)
      .single();

    if (fetchError || !note) {
      return { success: false, error: "Note not found" };
    }

    const { error } = await supabase
      .from("notes")
      .update({ is_pinned: input.isPinned })
      .eq("id", input.noteId)
      .eq("workspace_id", workspace.id);

    if (error) {
      console.error("Failed to toggle note pin:", error);
      return { success: false, error: error.message };
    }

    if (note.entity_type && note.entity_id) {
      revalidateEntityPaths(note.entity_type as EntityType, note.entity_id);
    }

    return { success: true };
  } catch (err) {
    console.error("Error toggling note pin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

interface ArchiveEntityNoteInput {
  noteId: string;
}

export async function archiveEntityNote(
  input: ArchiveEntityNoteInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data: note, error: fetchError } = await supabase
      .from("notes")
      .select("entity_type, entity_id")
      .eq("id", input.noteId)
      .eq("workspace_id", workspace.id)
      .single();

    if (fetchError || !note) {
      return { success: false, error: "Note not found" };
    }

    // Soft delete
    const { error } = await supabase
      .from("notes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", input.noteId)
      .eq("workspace_id", workspace.id);

    if (error) {
      console.error("Failed to archive entity note:", error);
      return { success: false, error: error.message };
    }

    // Clean up the note's mention edges
    await deleteEdgesFrom(supabase, {
      workspaceId: workspace.id,
      source: { type: "note", id: input.noteId },
    });

    if (note.entity_type && note.entity_id) {
      revalidateEntityPaths(note.entity_type as EntityType, note.entity_id);
    }

    return { success: true };
  } catch (err) {
    console.error("Error archiving entity note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

interface UpdateNoteTagsInput {
  noteId: string;
  tags: string[];
}

export async function updateNoteTags(
  input: UpdateNoteTagsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const supabase = await createClient();

    const { data: note, error: fetchError } = await supabase
      .from("notes")
      .select("entity_type, entity_id")
      .eq("id", input.noteId)
      .eq("workspace_id", workspace.id)
      .single();

    if (fetchError || !note) {
      return { success: false, error: "Note not found" };
    }

    const { error } = await supabase
      .from("notes")
      .update({ tags: input.tags })
      .eq("id", input.noteId)
      .eq("workspace_id", workspace.id);

    if (error) {
      console.error("Failed to update note tags:", error);
      return { success: false, error: error.message };
    }

    if (note.entity_type && note.entity_id) {
      revalidateEntityPaths(note.entity_type as EntityType, note.entity_id);
    }

    return { success: true };
  } catch (err) {
    console.error("Error updating note tags:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function revalidateEntityPaths(entityType: EntityType, entityId: string) {
  switch (entityType) {
    case "person":
      revalidatePath(`/people/${entityId}`);
      break;
    case "organization":
      revalidatePath(`/orgs/${entityId}`);
      break;
    case "work":
      revalidatePath(`/work/${entityId}`);
      break;
    case "meeting":
      revalidatePath(`/meetings/${entityId}`);
      break;
    case "billing":
      revalidatePath(`/billing/${entityId}`);
      break;
  }
  revalidatePath("/connections");
}

async function syncNoteWikilinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  noteId: string,
  workspaceId: string,
  sourceEntityType: EntityType,
  sourceEntityId: string,
  wikilinks: ReturnType<typeof extractWikilinks>
) {
  // Mention edges belong to the note and re-sync from its content: clear + rewrite.
  await deleteEdgesFrom(supabase, {
    workspaceId,
    source: { type: "note", id: noteId },
    relationType: "mention",
  });

  // Also clear note_mentions for this note
  await supabase
    .from("note_mentions")
    .delete()
    .eq("note_id", noteId)
    .eq("workspace_id", workspaceId);

  if (wikilinks.length === 0) return;

  const targetNames = wikilinks.map((w) => w.target.toLowerCase());

  // Query matching entities
  const [peopleResult, orgsResult, workResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, display_name")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
    supabase
      .from("work")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null),
  ]);

  const mentionTargets: Array<{ type: "person" | "org" | "work"; id: string; entityType: EntityType }> = [];

  for (const p of peopleResult.data ?? []) {
    if (p.display_name && targetNames.includes(p.display_name.toLowerCase())) {
      mentionTargets.push({ type: "person", id: p.id, entityType: "person" });
    }
  }
  for (const o of orgsResult.data ?? []) {
    if (o.name && targetNames.includes(o.name.toLowerCase())) {
      mentionTargets.push({ type: "org", id: o.id, entityType: "organization" });
    }
  }
  for (const w of workResult.data ?? []) {
    if (w.title && targetNames.includes(w.title.toLowerCase())) {
      mentionTargets.push({ type: "work", id: w.id, entityType: "work" });
    }
  }

  // Sync edge store (for graph queries)
  for (const target of mentionTargets) {
    await upsertEdge(supabase, {
      workspaceId,
      source: { type: "note", id: noteId },
      target: { type: target.type, id: target.id },
      relationType: "mention",
      provenance: { source: "system", because: "Mentioned via @mention" },
    });
  }

  // Sync note_mentions table (for backlink queries in Notes tab)
  // Filter out self-mentions (where mentioned entity equals source entity)
  const backlinkInserts = mentionTargets
    .filter(
      (t) =>
        !(t.entityType === sourceEntityType && t.id === sourceEntityId)
    )
    .map((t) => ({
      workspace_id: workspaceId,
      note_id: noteId,
      mentioned_entity_type: t.entityType,
      mentioned_entity_id: t.id,
      source_entity_type: sourceEntityType,
      source_entity_id: sourceEntityId,
    }));

  if (backlinkInserts.length > 0) {
    await supabase.from("note_mentions").insert(backlinkInserts);
  }
}
