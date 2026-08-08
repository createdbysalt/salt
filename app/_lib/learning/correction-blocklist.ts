import "server-only";

/**
 * Correction blocklist — the read side of "Not this".
 *
 * When a user dismisses a Watching proposal or corrects an auto-apply, a
 * `correction_events` row records the wrong value. This module answers the
 * question every emitter and the decision pipeline must ask before proposing
 * a value again: "did the user already say never this?"
 *
 * Corrections are binding for CORRECTION_BLOCK_TTL_MONTHS (guards against
 * unbounded blocklists and against blocking a value that later becomes
 * true). Manual user writes bypass the blocklist — a person re-accepting a
 * previously dismissed value always wins.
 *
 * Uses the admin client because callers are background contexts (cron scans,
 * webhook-triggered pipelines) with no user session; every query is
 * explicitly workspace-scoped.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

/** Default TTL — founder plan failure-mode 3 mitigation. */
export const CORRECTION_BLOCK_TTL_MONTHS = 6;

export interface CorrectionBlockEntry {
  id: string;
  fieldPath: string;
  wrongValue: unknown;
  reason: string | null;
  createdAt: string;
}

export async function getCorrectionBlocklist(
  workspaceId: string,
  entityType: string,
  entityId: string,
  fieldPath?: string
): Promise<CorrectionBlockEntry[]> {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - CORRECTION_BLOCK_TTL_MONTHS);

  let query = admin
    .from("correction_events")
    .select("id, field_path, wrong_value, correction_reason, created_at")
    .eq("workspace_id", workspaceId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  if (fieldPath) {
    query = query.eq("field_path", fieldPath);
  }

  const { data, error } = await query;

  if (error) {
    // Fail open on read errors: a broken blocklist read must not take the
    // whole care pipeline down. The pipeline's tier bars still gate writes.
    console.error("[corrections] Failed to load blocklist:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    fieldPath: row.field_path,
    wrongValue: row.wrong_value,
    reason: row.correction_reason,
    createdAt: row.created_at,
  }));
}

/**
 * Extract a meta-candidate targetId from a proposed value that may be a raw
 * object or a JSON string (UI dismissals store the display string).
 */
function targetIdOf(value: unknown): string | null {
  let candidate: unknown = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const id = (candidate as Record<string, unknown>).targetId;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function normalize(value: unknown): string {
  // UI dismissals store the proposed value as a display string; emitters
  // propose raw values. Compare both shapes.
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/**
 * Find the correction that blocks re-proposing `value` for `fieldPath`,
 * or null when the value is clear to propose.
 *
 * Matching semantics per field shape:
 * - `_merge_candidate` / `_link_candidate`: same target entity blocks,
 *   regardless of the changing metadata around it (signal, confidence).
 * - `_archive_candidate`: any dismissal blocks — "keep this record active"
 *   isn't value-specific (the payload's day counts always change).
 * - everything else: exact value match.
 */
export function findBlockingCorrection(
  blocklist: CorrectionBlockEntry[],
  fieldPath: string,
  value: unknown
): CorrectionBlockEntry | null {
  const entries = blocklist.filter((entry) => entry.fieldPath === fieldPath);
  if (entries.length === 0) return null;

  if (fieldPath === "_archive_candidate") {
    return entries[0] ?? null;
  }

  if (fieldPath === "_merge_candidate" || fieldPath === "_link_candidate") {
    const proposedTarget = targetIdOf(value);
    if (!proposedTarget) return null;
    return (
      entries.find((entry) => targetIdOf(entry.wrongValue) === proposedTarget) ??
      null
    );
  }

  const proposed = normalize(value);
  return (
    entries.find((entry) => normalize(entry.wrongValue) === proposed) ?? null
  );
}
