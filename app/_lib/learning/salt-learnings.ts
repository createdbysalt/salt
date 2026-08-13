/**
 * Salt learnings — the Handled audit trail core.
 *
 * A `salt_learnings` row is one applied write Salt made to Memory; Memory →
 * Activity → Handled renders from it, and "That's wrong" rolls it back.
 * This module lives in `_lib` (not a feature) so the protected memory
 * tools — which also live in `_lib` — can record learnings without a
 * lib → feature import. The server-action surface in
 * `app/_features/me/actions/salt-learnings.ts` delegates here.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { toLearningDbEntityType } from "./entity-type";
import type { LearningEntityType } from "./types";

export interface RecordSaltLearningInput {
  workspaceId: string;
  entityType: LearningEntityType;
  entityId: string;
  entityLabel: string;
  fieldPath: string;
  fieldLabel?: string;
  oldValue?: unknown;
  newValue: unknown;
  confidence: number;
  evidenceSummary: string;
  evidenceIds?: string[];
  playbookSlug?: string;
  playRunId?: string;
}

/**
 * Record that Salt applied a mutation. Called after a successful apply by
 * the decision pipeline, the system-plays executor, the protected memory
 * tools, and record birth (auto-create).
 */
export async function recordSaltLearning(
  input: RecordSaltLearningInput,
): Promise<{ id: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("salt_learnings")
    .insert({
      workspace_id: input.workspaceId,
      entity_type: toLearningDbEntityType(input.entityType),
      entity_id: input.entityId,
      entity_label: input.entityLabel,
      field_path: input.fieldPath,
      field_label: input.fieldLabel ?? null,
      // oldValue/newValue arrive as unknown from callers; the DB columns are
      // jsonb, so narrow at the write boundary only.
      old_value: (input.oldValue ?? null) as Json,
      new_value: input.newValue as Json,
      confidence: input.confidence,
      evidence_summary: input.evidenceSummary,
      evidence_ids: input.evidenceIds ?? null,
      playbook_slug: input.playbookSlug ?? null,
      play_run_id: input.playRunId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

/**
 * Generate a human-readable evidence summary.
 * "Seen in 3 emails across 2 conversations"
 */
export function generateEvidenceSummary(
  evidenceCount: number,
  sourceTypeCount: number,
  sourceTypes?: string[],
): string {
  if (evidenceCount === 1) {
    const source = sourceTypes?.[0] ?? "source";
    return `Seen once in ${source}`;
  }

  if (sourceTypeCount === 1) {
    const source = sourceTypes?.[0] ?? "source";
    return `Seen ${evidenceCount} times in ${source}`;
  }

  const sourceLabel =
    sourceTypeCount === 2
      ? "2 different sources"
      : `${sourceTypeCount} different sources`;

  return `Seen ${evidenceCount} times across ${sourceLabel}`;
}
