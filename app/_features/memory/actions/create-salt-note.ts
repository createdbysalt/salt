"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import type { NoteStatus } from "@/app/_features/memory/types/taxonomies";
import { ENTITY_NOTE_KIND_LABELS } from "@/app/_features/memory/types/taxonomies";
import {
  KEEPER_ENTITY_NOTES_SLUG,
  type CreateSaltNoteInput,
  type CreateSaltNoteResult,
  type ConfirmSaltNoteInput,
  type DismissSaltNoteInput,
} from "./salt-note-types";

const DEFAULT_AUTO_APPLY_THRESHOLD = 85;

async function loadNoteSettings(workspaceId: string): Promise<{ autoApplyThreshold: number }> {
  const admin = createAdminClient();

  const { data: settingsRow } = await admin
    .from("profile_playbook_settings")
    .select("auto_apply_threshold")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", KEEPER_ENTITY_NOTES_SLUG)
    .maybeSingle();

  return {
    autoApplyThreshold: Number(settingsRow?.auto_apply_threshold ?? DEFAULT_AUTO_APPLY_THRESHOLD),
  };
}

export async function createSaltNote(
  input: CreateSaltNoteInput
): Promise<CreateSaltNoteResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const workspaceId = workspace.id;
    const admin = createAdminClient();

    // Load threshold setting
    const settings = await loadNoteSettings(workspaceId);

    // Determine status based on confidence vs threshold
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
      return { success: false, error: error.message };
    }

    // If below threshold, create an intelligence finding for the Play card
    if (status === "proposed") {
      const kindLabel = ENTITY_NOTE_KIND_LABELS[input.noteKind] ?? input.noteKind;
      const entityLabel = input.entityName ?? input.entityId;

      // Map entity type to the correct FK column
      const findingInsert: Record<string, unknown> = {
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

    // Revalidate the entity detail page
    if (input.entityType === "person") {
      revalidatePath(`/people/${input.entityId}`);
    } else if (input.entityType === "organization") {
      revalidatePath(`/orgs/${input.entityId}`);
    } else if (input.entityType === "work") {
      revalidatePath(`/work/${input.entityId}`);
    }

    revalidatePath("/plays");

    return { success: true, noteId: note.id, status };
  } catch (err) {
    console.error("Error creating Salt note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function confirmSaltNote(
  input: ConfirmSaltNoteInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const workspaceId = workspace.id;
    const admin = createAdminClient();

    const { error } = await admin
      .from("notes")
      .update({ status: "confirmed" })
      .eq("id", input.noteId)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Error confirming Salt note:", error);
      return { success: false, error: error.message };
    }

    // Mark corresponding intelligence_finding as acted
    await admin
      .from("intelligence_findings")
      .update({ state: "acted", acted_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("finding_type", "note_suggestion")
      .eq("state", "needs_you")
      .filter("evidence->>note_id", "eq", input.noteId);

    revalidatePath("/plays");

    return { success: true };
  } catch (err) {
    console.error("Error confirming Salt note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function dismissSaltNote(
  input: DismissSaltNoteInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { context } = await getTenantContext();
    const workspace = requireWorkspaceMember(context);
    const workspaceId = workspace.id;
    const admin = createAdminClient();

    const { error } = await admin
      .from("notes")
      .update({ status: "dismissed" })
      .eq("id", input.noteId)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Error dismissing Salt note:", error);
      return { success: false, error: error.message };
    }

    // Mark corresponding intelligence_finding as dismissed
    await admin
      .from("intelligence_findings")
      .update({ state: "dismissed", dismissed_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("finding_type", "note_suggestion")
      .eq("state", "needs_you")
      .filter("evidence->>note_id", "eq", input.noteId);

    revalidatePath("/plays");

    return { success: true };
  } catch (err) {
    console.error("Error dismissing Salt note:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
