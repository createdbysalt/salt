/**
 * Read-side freshness logic for the cached AI record narrative.
 *
 * Pure + runtime-agnostic: given the cached columns from a record row and the
 * hash of the record's current signals, decide whether the cache is still
 * usable. A cached narrative is fresh only when:
 *   1. it has a summary,
 *   2. its stored inputs hash matches the current signals, and
 *   3. it was generated within the TTL window.
 *
 * When not fresh, callers should fall back to the deterministic builder and
 * (when substrate allows) trigger regeneration.
 */

/** Shape of the AI cache columns added in 20260627110000_record_ai_summary.sql. */
export interface CachedRecordNarrativeRow {
  ai_summary: string | null;
  ai_worth_attention: string | null;
  ai_worth_attention_play: string | null;
  ai_summary_inputs_hash: string | null;
  ai_summary_model: string | null;
  ai_summary_generated_at: string | null;
}

export interface FreshRecordNarrative {
  summary: string;
  worthAttention: { reason: string; suggestedPlay: string };
  model: string | null;
  generatedAt: string;
}

/** Default cache lifetime before a narrative is considered stale. */
export const RECORD_NARRATIVE_TTL_MS = 24 * 60 * 60 * 1000;

export function readFreshNarrative(
  row: CachedRecordNarrativeRow | null | undefined,
  currentInputsHash: string,
  opts?: { ttlMs?: number; now?: number },
): FreshRecordNarrative | null {
  if (!row) return null;

  const summary = row.ai_summary?.trim();
  if (!summary) return null;

  if (!row.ai_summary_inputs_hash || row.ai_summary_inputs_hash !== currentInputsHash) {
    return null;
  }

  if (!row.ai_summary_generated_at) return null;
  const generatedMs = new Date(row.ai_summary_generated_at).getTime();
  if (Number.isNaN(generatedMs)) return null;

  const ttlMs = opts?.ttlMs ?? RECORD_NARRATIVE_TTL_MS;
  const now = opts?.now ?? Date.now();
  if (now - generatedMs > ttlMs) return null;

  return {
    summary,
    worthAttention: {
      reason: row.ai_worth_attention?.trim() ?? "",
      suggestedPlay: row.ai_worth_attention_play?.trim() ?? "",
    },
    model: row.ai_summary_model,
    generatedAt: row.ai_summary_generated_at,
  };
}
