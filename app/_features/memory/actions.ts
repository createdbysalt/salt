"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { extractWikilinks, type WikilinkMatch } from "@/app/_lib/notes";

export type NoteCategory = "note" | "idea" | "reminder" | "reflection" | "reference";

export async function createNote(
  workspaceId: string,
  content: string,
  options?: {
    title?: string;
    category?: NoteCategory;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      workspace_id: workspaceId,
      content,
      title: options?.title,
      category: options?.category ?? "note",
      author_type: "user",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create note:", error);
    return { error: error.message };
  }

  // Extract wikilinks and create entity relations
  const wikilinks = extractWikilinks(content);
  if (wikilinks.length > 0) {
    await syncNoteEntityRelations(supabase, data.id, workspaceId, wikilinks);
  }

  revalidatePath("/me");
  revalidatePath("/connections");

  return { data };
}

export async function updateNote(
  noteId: string,
  content: string,
  options?: {
    title?: string;
    category?: NoteCategory;
  }
) {
  const supabase = await createClient();

  // Get the note to find its workspace_id
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("workspace_id")
    .eq("id", noteId)
    .single();

  if (fetchError || !note) {
    return { error: "Note not found" };
  }

  const { error } = await supabase
    .from("notes")
    .update({
      content,
      title: options?.title,
      category: options?.category,
    })
    .eq("id", noteId);

  if (error) {
    console.error("Failed to update note:", error);
    return { error: error.message };
  }

  // Re-sync wikilinks
  const wikilinks = extractWikilinks(content);
  await syncNoteEntityRelations(supabase, noteId, note.workspace_id, wikilinks);

  revalidatePath("/me");
  revalidatePath("/connections");

  return { success: true };
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();

  // Soft delete
  const { error } = await supabase
    .from("notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", noteId);

  if (error) {
    console.error("Failed to delete note:", error);
    return { error: error.message };
  }

  // Clean up entity relations
  await supabase
    .from("entity_relations")
    .delete()
    .eq("from_entity_type", "note")
    .eq("from_entity_id", noteId);

  revalidatePath("/me");
  revalidatePath("/connections");

  return { success: true };
}

export async function toggleNotePinned(noteId: string, isPinned: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("notes")
    .update({ is_pinned: isPinned })
    .eq("id", noteId);

  if (error) {
    console.error("Failed to toggle note pin:", error);
    return { error: error.message };
  }

  revalidatePath("/me");

  return { success: true };
}

async function syncNoteEntityRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  noteId: string,
  workspaceId: string,
  wikilinks: WikilinkMatch[]
) {
  // First, delete existing relations for this note
  await supabase
    .from("entity_relations")
    .delete()
    .eq("from_entity_type", "note")
    .eq("from_entity_id", noteId);

  if (wikilinks.length === 0) return;

  // Find matching entities for each wikilink
  const targetNames = wikilinks.map((w) => w.target.toLowerCase());

  // Query people, orgs, and work that match the wikilink targets
  const [peopleResult, orgsResult, workResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, name")
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

  const relations: Array<{
    from_entity_type: string;
    from_entity_id: string;
    to_entity_type: string;
    to_entity_id: string;
    relation_type: string;
    workspace_id: string;
  }> = [];

  // Match people
  for (const p of peopleResult.data ?? []) {
    if (targetNames.includes(p.name.toLowerCase())) {
      relations.push({
        from_entity_type: "note",
        from_entity_id: noteId,
        to_entity_type: "person",
        to_entity_id: p.id,
        relation_type: "mentioned_in",
        workspace_id: workspaceId,
      });
    }
  }

  // Match orgs
  for (const o of orgsResult.data ?? []) {
    if (targetNames.includes(o.name.toLowerCase())) {
      relations.push({
        from_entity_type: "note",
        from_entity_id: noteId,
        to_entity_type: "organization",
        to_entity_id: o.id,
        relation_type: "mentioned_in",
        workspace_id: workspaceId,
      });
    }
  }

  // Match work
  for (const w of workResult.data ?? []) {
    if (targetNames.includes(w.title.toLowerCase())) {
      relations.push({
        from_entity_type: "note",
        from_entity_id: noteId,
        to_entity_type: "work",
        to_entity_id: w.id,
        relation_type: "mentioned_in",
        workspace_id: workspaceId,
      });
    }
  }

  if (relations.length > 0) {
    await supabase.from("entity_relations").insert(relations);
  }
}
