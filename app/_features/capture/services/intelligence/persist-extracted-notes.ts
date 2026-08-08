/**
 * Persist Extracted Notes — Create Salt notes from extraction results
 *
 * Takes note extraction output and creates notes via the Memory Care
 * entity-notes pipeline, applying all classification, routing, and pinning
 * rules.
 */

import { createSaltNote } from "@/app/_features/memory/actions/create-salt-note";
import {
  checkQualityGate,
  type QualityGateInput,
} from "@/app/_features/memory/utils/note-quality-gate";
import { processEntitySignals } from "@/app/_features/plays/playbooks/trigger-dispatch";
import type { NoteExtractionResult, NoteExtractionInput } from "./note-extractor";
import type { EntityType } from "@/app/_features/memory/queries/entity-notes";
import type { EntityNoteKind } from "@/app/_features/memory/types/taxonomies";

type SupportedNoteEntityType = "person" | "organization" | "work";

function isSupportedEntityType(type: EntityType): type is SupportedNoteEntityType {
  return type === "person" || type === "organization" || type === "work";
}

function toEntityNoteKind(kind: string): EntityNoteKind {
  if (kind === "general") return "fact"; // Default general to fact for Salt notes
  return kind as EntityNoteKind;
}

interface PersistNotesInput {
  extractionResult: NoteExtractionResult;
  source: "ai_capture" | "ai_inference";
  sourceRef: string;
  sourceType: "email" | "meeting" | "call" | "document";
  entityNames: Map<string, string>; // entityId -> entityName for provenance
  /**
   * Enables playbook signal emission (note_created, preference_detected,
   * context_extracted, note_flagged) for created notes when provided.
   */
  workspaceId?: string;
}

interface PersistNotesResult {
  created: number;
  proposed: number;
  skipped: number;
  errors: string[];
}

/**
 * Persist extracted notes to the database via createSaltNote.
 * Returns counts of created/proposed notes and any errors.
 * Runs quality gates before creating each note.
 * Notes routed to unsupported entity types (meeting, billing) are skipped.
 */
export async function persistExtractedNotes(
  input: PersistNotesInput
): Promise<PersistNotesResult> {
  const { extractionResult, source, sourceRef, sourceType, entityNames } = input;
  const result: PersistNotesResult = {
    created: 0,
    proposed: 0,
    skipped: 0,
    errors: [],
  };

  const persistedNotes: Array<{
    entityType: SupportedNoteEntityType;
    entityId: string;
    noteKind: EntityNoteKind;
  }> = [];

  for (const note of extractionResult.notes) {
    // Skip notes routed to unsupported entity types
    if (!isSupportedEntityType(note.targetEntityType)) {
      result.skipped++;
      continue;
    }

    // Run quality gate checks
    const gateInput: QualityGateInput = {
      content: note.content,
      noteKind: toEntityNoteKind(note.noteKind),
      confidence: note.confidence,
      entityType: note.targetEntityType,
      entityId: note.targetEntityId,
      sourceType,
    };

    const gateResult = checkQualityGate(gateInput);
    if (!gateResult.create) {
      result.skipped++;
      continue;
    }

    const entityName = entityNames.get(note.targetEntityId) ?? "Unknown";

    const createResult = await createSaltNote({
      entityType: note.targetEntityType,
      entityId: note.targetEntityId,
      entityName,
      content: note.content,
      noteKind: toEntityNoteKind(note.noteKind),
      source,
      sourceRef,
      confidence: note.confidence,
    });

    if (createResult.success) {
      if (createResult.status === "confirmed") {
        result.created++;
      } else {
        result.proposed++;
      }
      persistedNotes.push({
        entityType: note.targetEntityType,
        entityId: note.targetEntityId,
        noteKind: toEntityNoteKind(note.noteKind),
      });
    } else {
      result.errors.push(
        `Failed to create note for ${entityName}: ${createResult.error}`
      );
    }
  }

  // Emit the Notes playbook's trigger signals for created notes.
  // Fire-and-forget: signal dispatch must never break note persistence.
  if (input.workspaceId && persistedNotes.length > 0) {
    emitNoteSignals(input.workspaceId, persistedNotes, sourceRef).catch(
      (error) => {
        console.error("[persist-extracted-notes] Signal emission failed:", error);
      }
    );
  }

  return result;
}

/**
 * Dispatch note lifecycle signals per target entity so playbooks that
 * declare them as triggers (Notes) run.
 */
async function emitNoteSignals(
  workspaceId: string,
  persistedNotes: Array<{
    entityType: SupportedNoteEntityType;
    entityId: string;
    noteKind: EntityNoteKind;
  }>,
  sourceRef: string
): Promise<void> {
  // Aggregate kinds per entity so each entity is dispatched once.
  const byEntity = new Map<
    string,
    { entityType: SupportedNoteEntityType; entityId: string; kinds: Set<EntityNoteKind> }
  >();
  for (const note of persistedNotes) {
    const key = `${note.entityType}:${note.entityId}`;
    const entry = byEntity.get(key);
    if (entry) {
      entry.kinds.add(note.noteKind);
    } else {
      byEntity.set(key, {
        entityType: note.entityType,
        entityId: note.entityId,
        kinds: new Set([note.noteKind]),
      });
    }
  }

  for (const entry of byEntity.values()) {
    await processEntitySignals({
      workspaceId,
      entitySurface: entry.entityType,
      entityId: entry.entityId,
      signals: {
        note_created: true,
        preference_detected: entry.kinds.has("preference"),
        context_extracted: entry.kinds.has("context"),
        note_flagged: entry.kinds.has("flag"),
      },
      evidence: { source_ref: sourceRef },
    });
  }
}

/**
 * Full extraction + persistence pipeline.
 * Extracts notes from content, runs quality gates, and persists in one call.
 */
export async function extractAndPersistNotes(
  extractionInput: NoteExtractionInput,
  entityNames: Map<string, string>,
  workspaceId?: string
): Promise<PersistNotesResult> {
  // Import here to avoid circular dependency
  const { extractNotes } = await import("./note-extractor");

  const extractionResult = extractNotes(extractionInput);

  if (extractionResult.notes.length === 0) {
    return { created: 0, proposed: 0, skipped: 0, errors: [] };
  }

  return persistExtractedNotes({
    extractionResult,
    source: "ai_capture",
    sourceRef: extractionInput.sourceId,
    sourceType: extractionInput.sourceType,
    entityNames,
    workspaceId,
  });
}

/**
 * Map entity type to lookup table for name resolution.
 */
export function entityTypeToTable(type: EntityType): string {
  switch (type) {
    case "person":
      return "people";
    case "organization":
      return "organizations";
    case "work":
      return "work";
    case "meeting":
      return "meetings";
    case "billing":
      return "billing_records";
  }
}
