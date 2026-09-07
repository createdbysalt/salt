import "server-only";

import { insertSaltNote } from "@/app/_features/memory/services/salt-notes";
import type { EntityNoteKind } from "@/app/_features/memory/types/taxonomies";

/**
 * memory_update playbook outputs — the sanctioned exception to "Memory Care
 * owns Memory writes".
 *
 * A playbook whose output is `memory_update` produces a note about the run's
 * target record (e.g. a contract review filed on the file). The write goes
 * through the canonical note path (`insertSaltNote`) with the play's
 * approval as consent: `approval: ask` parks the run on the sentinel slug
 * below and the resume path writes on approval; `approval: auto` writes at
 * execution time. Either way the note is attributed to the play run via
 * sourceRef, and confidence 100 keeps an already-approved note from being
 * re-gated into "proposed" by the Memory Care threshold.
 */

/**
 * Sentinel tool slug parked in approval_context when a memory_update output
 * waits for approval. Not a Composio tool — the resume path branches on it
 * before touching the connector gate.
 */
export const MEMORY_NOTE_TOOL_SLUG = "SALT_WRITE_MEMORY_NOTE";

export interface MemoryNoteWrite {
  entityType: "person" | "organization" | "work" | "resource";
  entityId: string;
  entityLabel?: string;
  title?: string;
  content: string;
  noteKind?: EntityNoteKind;
  /** Provenance — the play run this note came from. */
  sourceRef?: string;
}

export async function writeMemoryNote(
  workspaceId: string,
  note: MemoryNoteWrite,
): Promise<void> {
  const result = await insertSaltNote(workspaceId, {
    entityType: note.entityType,
    entityId: note.entityId,
    entityName: note.entityLabel,
    title: note.title,
    content: note.content,
    noteKind: note.noteKind ?? "context",
    source: "ai_inference",
    sourceRef: note.sourceRef,
    // The play's approval is the consent; don't re-gate behind the Memory
    // Care threshold (a "proposed" note after the user already approved
    // would read as the approval being ignored).
    confidence: 100,
  });

  if (result.error) {
    throw new Error(`Failed to write memory note: ${result.error}`);
  }
}
