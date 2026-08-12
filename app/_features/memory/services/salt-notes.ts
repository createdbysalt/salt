import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { TablesInsert } from "@/app/_lib/supabase/database.types";
import type { NoteStatus } from "@/app/_features/memory/types/taxonomies";
import { ENTITY_NOTE_KIND_LABELS } from "@/app/_features/memory/types/taxonomies";
import {
  ENTITY_NOTES_BLUEPRINT_SLUG,
  type CreateSaltNoteInput,
} from "../actions/salt-note-types";

const DEFAULT_AUTO_APPLY_THRESHOLD = 85;

async function loadNoteSettings(
  workspaceId: string,
): Promise<{ autoApplyThreshold: number }> {
  const admin = createAdminClient();

  const { data: settingsRow } = await admin
    .from("profile_playbook_settings")
    .select("auto_apply_threshold")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", ENTITY_NOTES_BLUEPRINT_SLUG)
    .maybeSingle();

  return {
    autoApplyThreshold: Number(settingsRow?.auto_apply_threshold ?? DEFAULT_AUTO_APPLY_THRESHOLD),
  };
}

export interface InsertSaltNoteResult {
  noteId?: string;
  status?: NoteStatus;
  error?: string;
}

/**
 * Background-safe core of the createSaltNote action: threshold lookup, note
 * insert, and the intelligence finding for proposed notes. Callers with a
 * request context (the server action) revalidate paths themselves.
 */
export async function insertSaltNote(
  workspaceId: string,
  input: CreateSaltNoteInput,
): Promise<InsertSaltNoteResult> {
  const admin = createAdminClient();
  const settings = await loadNoteSettings(workspaceId);

  const status: NoteStatus = input.confidence >= settings.autoApplyThreshold
    ? "confirmed"
    : "proposed";

  const { data: note, error } = await admin
    .from("notes")
    .insert({
      workspace_id: workspaceId,
      title: input.title ?? null,
      content: input.content,
      category: "note",
      author_type: "salt",
      entity_type: input.entityType,
      entity_id: input.entityId,
      source: input.source,
      source_ref: input.sourceRef ?? null,
      confidence: input.confidence,
      status,
      note_kind: input.noteKind,
      is_pinned: false,
      is_archived: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating Salt note:", error);
    return { error: error.message };
  }

  if (status === "proposed") {
    const kindLabel = ENTITY_NOTE_KIND_LABELS[input.noteKind] ?? input.noteKind;
    const entityLabel = input.entityName ?? input.entityId;

    const findingInsert: TablesInsert<"intelligence_findings"> = {
      workspace_id: workspaceId,
      finding_type: "note_suggestion",
      state: "needs_you",
      title: `Salt noted a ${kindLabel.toLowerCase()} about ${entityLabel}`,
      content: input.content.slice(0, 200) + (input.content.length > 200 ? "…" : ""),
      evidence: {
        note_id: note.id,
        entity_type: input.entityType,
        entity_name: input.entityName,
        note_kind: input.noteKind,
        source: input.source,
        source_ref: input.sourceRef,
        confidence: input.confidence,
        threshold: settings.autoApplyThreshold,
      },
      confidence: Math.round(input.confidence),
    };

    if (input.entityType === "person") {
      findingInsert.person_id = input.entityId;
    } else if (input.entityType === "organization") {
      findingInsert.org_id = input.entityId;
    }

    await admin.from("intelligence_findings").insert(findingInsert);
  }

  return { noteId: note.id, status };
}
