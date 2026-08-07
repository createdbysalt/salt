/**
 * Memory Care — Notes capability
 *
 * Intake (pattern detection + note creation) lives in the capture
 * intelligence pipeline (`note-extractor.ts` + `persist-extracted-notes.ts`).
 * This capability owns note QUALITY:
 *
 * - Signal-triggered (note_created / preference_detected / context_extracted /
 *   note_flagged / capture_processed): targeted duplicate sweep for the
 *   triggering entity.
 * - Scheduled (weekly): workspace lifecycle scan — archive AI notes not
 *   updated in 180 days, merge exact duplicates keeping highest confidence.
 *
 * Ported from the retired notes system playbook.
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { CareRunContext, CareRunResult } from "../types";

const STALE_NOTE_DAYS = 180;
/** Only AI-created notes are auto-archived; user notes are never touched. */
const AI_NOTE_SOURCES = ["ai_capture", "ai_inference"];

export async function runNotesCapability(
  ctx: CareRunContext
): Promise<CareRunResult> {
  const { workspaceId } = ctx;

  if (!workspaceId) {
    return { success: false, error: "No workspace context" };
  }

  // Signal-triggered: dedupe notes for the triggering entity only.
  if (ctx.entityType && ctx.entityId) {
    const merged = await dedupeNotes(workspaceId, {
      entityType: ctx.entityType,
      entityId: ctx.entityId,
    });
    return {
      success: true,
      summary:
        merged > 0 ? `Merged ${merged} duplicate note(s)` : "No duplicate notes",
      data: { merged, updates: merged },
    };
  }

  // Scheduled / manual: full lifecycle scan.
  const [archived, merged] = await Promise.all([
    archiveStaleNotes(workspaceId),
    dedupeNotes(workspaceId),
  ]);

  return {
    success: true,
    summary: `Archived ${archived} stale note(s), merged ${merged} duplicate(s)`,
    data: { archived, merged, updates: archived + merged },
  };
}

/**
 * Archive AI-created notes not updated in 180+ days. Pinned notes and
 * user-authored notes are never auto-archived.
 */
async function archiveStaleNotes(workspaceId: string): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(
    Date.now() - STALE_NOTE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: stale } = await admin
    .from("notes")
    .select("id")
    .eq("workspace_id", workspaceId)
    .in("source", AI_NOTE_SOURCES)
    .lt("updated_at", cutoff)
    .neq("is_pinned", true)
    .neq("is_archived", true)
    .is("deleted_at", null)
    .limit(100);

  if (!stale || stale.length === 0) return 0;

  const { error } = await admin
    .from("notes")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .in(
      "id",
      stale.map((n) => n.id)
    );

  return error ? 0 : stale.length;
}

/**
 * Merge exact-duplicate notes (same entity, same kind, same normalized
 * content): keep the highest-confidence copy, archive the rest with
 * superseded_by pointing at the surviving note.
 */
async function dedupeNotes(
  workspaceId: string,
  scope?: { entityType: string; entityId: string }
): Promise<number> {
  const admin = createAdminClient();

  let query = admin
    .from("notes")
    .select("id, entity_type, entity_id, note_kind, content, confidence, created_at")
    .eq("workspace_id", workspaceId)
    .neq("is_archived", true)
    .is("deleted_at", null)
    .not("entity_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(scope ? 100 : 500);

  if (scope) {
    query = query
      .eq("entity_type", scope.entityType)
      .eq("entity_id", scope.entityId);
  }

  const { data: notes } = await query;
  if (!notes || notes.length < 2) return 0;

  // Group by entity + kind + normalized content
  const groups = new Map<string, typeof notes>();
  for (const note of notes) {
    const key = [
      note.entity_type,
      note.entity_id,
      note.note_kind ?? "fact",
      normalizeContent(note.content),
    ].join("|");
    const group = groups.get(key);
    if (group) {
      group.push(note);
    } else {
      groups.set(key, [note]);
    }
  }

  let merged = 0;
  const now = new Date().toISOString();

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    // Keep the highest confidence (ties: oldest — the original)
    const sorted = [...group].sort((a, b) => {
      const confDiff = (b.confidence ?? 0) - (a.confidence ?? 0);
      if (confDiff !== 0) return confDiff;
      return a.created_at.localeCompare(b.created_at);
    });
    const surviving = sorted[0];
    const duplicates = sorted.slice(1);

    const { error } = await admin
      .from("notes")
      .update({
        is_archived: true,
        archived_at: now,
        superseded_by: surviving.id,
      })
      .in(
        "id",
        duplicates.map((n) => n.id)
      );

    if (!error) merged += duplicates.length;
  }

  return merged;
}

function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
