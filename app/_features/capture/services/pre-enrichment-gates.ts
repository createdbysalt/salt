import "server-only";

/**
 * Pre-enrichment gates (capture-pipeline repair, Phase 6).
 *
 * Pointer-only webhook payloads (Outlook sends `{id, event_type}`) trigger a
 * paid Composio fetch before the capture pipeline can see any content. These
 * are the cheap checks that run BEFORE that fetch:
 *
 *   1. Dedupe — a replayed/re-tried delivery of an already-ingested message
 *      must not pay for a second fetch (the insert-time unique constraint
 *      still guards the write path; this guard protects the spend).
 *   2. Daily capture budget — over-budget workspaces ingest the minimal
 *      envelope as noise (see capture-budget.ts) instead of paying to
 *      hydrate it.
 *
 * Sender-based gates (blocklist, pre-ingest heuristics) cannot run here —
 * the payload carries no sender. They run after hydration as before.
 */

import type { createAdminClient } from "@/app/_lib/supabase/admin";
import type { CaptureSourceType } from "../types";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function captureAlreadyIngested(
  admin: AdminClient,
  workspaceId: string,
  sourceType: CaptureSourceType,
  externalId: string,
): Promise<boolean> {
  try {
    const { data, error } = await admin
      .from("capture_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("source_type", sourceType)
      .eq("source_external_id", externalId)
      .limit(1);

    if (error) {
      // Fail open: a broken dedupe check must never block ingestion — the
      // insert-time unique constraint is the real guard.
      console.error(
        "[pre-enrichment] dedupe check failed for %s/%s:",
        sourceType,
        externalId,
        error.message,
      );
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error("[pre-enrichment] dedupe check threw", {
      sourceType,
      externalId,
      error,
    });
    return false;
  }
}
