/**
 * Emit Learning Signal — Dispatch entity_learning_extracted to trigger playbooks
 *
 * Called by the note extraction pipeline when note-worthy learnings are found.
 * Routes through the playbook trigger dispatch system.
 */

import "server-only";

import { dispatchSignalTrigger } from "@/app/_features/plays/playbooks/trigger-dispatch";
import type { EntityType } from "@/app/_features/memory/queries/entity-notes";

export interface LearningSignalInput {
  workspaceId: string;
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  sourceType: "email" | "meeting" | "call" | "document" | "chat";
  sourceId: string;
  learnings: Array<{
    content: string;
    noteKind: string;
    confidence: number;
  }>;
}

export interface LearningSignalResult {
  dispatched: boolean;
  playRunIds: string[];
  errors: string[];
}

/**
 * Emit the entity_learning_extracted signal for a set of extracted learnings.
 * The playbook trigger dispatch system routes this to keeper-entity-notes
 * (if adopted and active in the workspace).
 */
export async function emitLearningSignal(
  input: LearningSignalInput
): Promise<LearningSignalResult> {
  const {
    workspaceId,
    entityType,
    entityId,
    entityLabel,
    sourceType,
    sourceId,
    learnings,
  } = input;

  const entitySurface = mapEntityTypeToSurface(entityType);

  const results = await dispatchSignalTrigger({
    workspaceId,
    signalKey: "entity_learning_extracted",
    entityId,
    entitySurface,
    entityLabel,
    evidence: {
      source_type: sourceType,
      source_id: sourceId,
      learning_count: learnings.length,
      learnings: learnings.map((l) => ({
        preview: l.content.slice(0, 100),
        kind: l.noteKind,
        confidence: l.confidence,
      })),
    },
  });

  const playRunIds = results
    .filter((r) => r.success && r.playRunId)
    .map((r) => r.playRunId!);

  const errors = results
    .filter((r) => !r.success && r.error)
    .map((r) => r.error!);

  return {
    dispatched: playRunIds.length > 0,
    playRunIds,
    errors,
  };
}

function mapEntityTypeToSurface(
  entityType: EntityType
): "person" | "organization" | "work" | "billing" | "meeting" | "file" {
  switch (entityType) {
    case "person":
      return "person";
    case "organization":
      return "organization";
    case "work":
      return "work";
    case "billing":
      return "billing";
    case "meeting":
      return "meeting";
    default:
      return "person";
  }
}
