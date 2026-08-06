import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { resolveModel } from "@/app/_lib/ai/models";
import type { LlmSpendContext } from "@/app/_lib/ai/gpt";
import { generateRecordNarrative } from "@/app/_lib/ai/record-summary-ai";
import type {
  AssembledNarrativeSignals,
  RecordKind,
  RecordNarrativeTable,
} from "./assemble";
import {
  readFreshNarrative,
  type CachedRecordNarrativeRow,
  type FreshRecordNarrative,
} from "../utils/record-narrative-cache";

export interface RecordNarrativeRecomputeInput {
  table: RecordNarrativeTable;
  recordId: string;
  kind: RecordKind;
  /** Who the model spend is attributed to, for provider and ledger both. */
  spend: LlmSpendContext;
  signals: AssembledNarrativeSignals;
}

function logError(message: string, error: unknown, meta?: Record<string, string>): void {
  if (meta) {
    console.error("[record-narrative]", message, meta, error);
  } else {
    console.error("[record-narrative]", message, error);
  }
}

/**
 * Generate the AI narrative for one record and persist it to the cache columns.
 * No-ops when there's insufficient substrate or the model returns nothing, so
 * the deterministic builder stays in charge for sparse records.
 */
export async function recomputeRecordNarrative(
  input: RecordNarrativeRecomputeInput,
): Promise<void> {
  if (!input.signals.hasSubstrate) return;

  const narrative = await generateRecordNarrative({
    kind: input.kind,
    name: input.signals.name,
    facts: input.signals.facts,
    untrustedContext: input.signals.untrustedContext,
    spend: input.spend,
  });

  if (!narrative) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from(input.table)
    .update({
      ai_summary: narrative.summary,
      ai_worth_attention: narrative.worthAttention.reason,
      ai_worth_attention_play: narrative.worthAttention.suggestedPlay,
      ai_summary_inputs_hash: input.signals.inputsHash,
      ai_summary_model: resolveModel("recordSummary"),
      ai_summary_generated_at: new Date().toISOString(),
    })
    .eq("id", input.recordId);

  if (error) {
    logError("cache write failed", error, { table: input.table, recordId: input.recordId });
  }
}

/**
 * Fire-and-forget regeneration (mirrors scheduleWorkHealthRecompute). Safe to
 * call from a server component render path; failures are logged, never thrown.
 */
export function scheduleRecordNarrativeRecompute(
  input: RecordNarrativeRecomputeInput,
): void {
  void recomputeRecordNarrative(input).catch((error) => {
    logError("scheduled recompute failed", error, {
      table: input.table,
      recordId: input.recordId,
    });
  });
}

/**
 * Read path used by detail queries/routes: returns the cached narrative when
 * fresh, otherwise schedules a background regeneration (when substrate allows)
 * and returns null so the caller falls back to the deterministic builder for
 * this render. The freshly generated value appears on the next load.
 */
export function resolveRecordNarrative(
  input: RecordNarrativeRecomputeInput & { cache: CachedRecordNarrativeRow | null },
): FreshRecordNarrative | null {
  const fresh = readFreshNarrative(input.cache, input.signals.inputsHash);
  if (fresh) return fresh;

  if (input.signals.hasSubstrate) {
    scheduleRecordNarrativeRecompute({
      table: input.table,
      recordId: input.recordId,
      kind: input.kind,
      spend: input.spend,
      signals: input.signals,
    });
  }

  return null;
}
