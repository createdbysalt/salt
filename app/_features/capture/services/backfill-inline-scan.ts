import "server-only";

/**
 * Inline backfill analysis (Sources plan 3.4, retention decision b).
 *
 * The Gmail backfill fetches pages with `include_payload: true`, so the full
 * body rides along with the page fetch at no extra Composio cost. For each
 * admitted capture we run the shared scan pipeline (`processCaptureForScan`)
 * on an in-memory row whose extracted_data carries the transient body, then
 * discard it — the persisted capture stays a thin envelope (outcome metadata
 * is merged into the stored row by id, never written from the in-memory row).
 *
 * Why inline: without it, the daily scan re-analyzes these captures from
 * 500-char snippets, and signature parsing / LLM classification never see the
 * full body. Inline analysis gets full-body quality at connect time and
 * stamps the outcome so the daily scan skips the capture afterwards — same
 * LLM spend, earlier and better, zero extra Composio calls.
 *
 * Bounded by INLINE_SCAN_CAP per backfill run (bootstrap ingests up to 500;
 * the cap keeps connect-time cost/latency predictable). Hydration is disabled
 * in the pipeline context — the body is already here, and rows without one
 * fall back to snippet analysis exactly like the daily scan.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { CaptureEnvelope } from "../adapters/types";
import type { ExtractedData } from "../types";
import { extractCaptureEmailFields } from "./extract-capture-email";
import { createLlmCall } from "./capture-intelligence-cron";
import {
  createScanPipelineContext,
  processCaptureForScan,
  type CaptureEventRow,
} from "./intelligence/daily-scan";

/** Max captures analyzed inline per backfill run. */
export const INLINE_SCAN_CAP = 25;

export interface AdmittedBackfillCapture {
  captureId: string;
  envelope: CaptureEnvelope;
  /** Raw page row — the full Gmail message when fetched with include_payload. */
  row: unknown;
}

export interface InlineScanSummary {
  scanned: number;
  findingsCreated: number;
  peopleResolved: number;
  errors: string[];
}

/**
 * LLM billing needs a user id; use the workspace owner, same as the
 * intelligence cron. No owner → skip inline analysis (the daily scan will
 * pick the captures up later).
 */
async function resolveWorkspaceOwnerId(
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      `[backfill-inline-scan] Failed to resolve owner for ${workspaceId}:`,
      error.message
    );
    return null;
  }
  return data?.user_id ?? null;
}

/**
 * Analyze admitted backfill captures inline on their transient bodies.
 * Inbound first (buying intent / reply-needed signals), capped per run.
 */
export async function runInlineBackfillScan(
  workspaceId: string,
  admitted: AdmittedBackfillCapture[]
): Promise<InlineScanSummary> {
  const summary: InlineScanSummary = {
    scanned: 0,
    findingsCreated: 0,
    peopleResolved: 0,
    errors: [],
  };
  if (admitted.length === 0) return summary;

  const supabase = createAdminClient();
  const ownerId = await resolveWorkspaceOwnerId(supabase, workspaceId);
  if (!ownerId) {
    summary.errors.push("No workspace owner found — inline analysis skipped");
    return summary;
  }

  const ctx = await createScanPipelineContext({
    workspaceId,
    userId: ownerId,
    llmCall: createLlmCall(workspaceId, ownerId),
    enableHydration: false,
    supabase,
  });

  const ordered = [...admitted].sort(
    (a, b) =>
      Number(a.envelope.extracted.isSentByUser === true) -
      Number(b.envelope.extracted.isSentByUser === true)
  );

  for (const item of ordered.slice(0, INLINE_SCAN_CAP)) {
    // Transient body from the full-payload page row; lives only in this
    // in-memory extracted_data and is discarded when the loop iteration ends.
    const body =
      extractCaptureEmailFields(item.row as Record<string, unknown> | null)?.body_text ?? null;

    const rawEmail: CaptureEventRow = {
      id: item.captureId,
      source_type: "gmail",
      source_external_id: item.envelope.externalId,
      raw_payload: item.envelope.raw,
      extracted_data: {
        ...item.envelope.extracted,
        ...(body ? { body_text: body } : {}),
      } as unknown as ExtractedData,
    };

    await processCaptureForScan(ctx, rawEmail);
    summary.scanned++;
  }

  summary.findingsCreated = ctx.result.findingsCreated;
  summary.peopleResolved = ctx.result.peopleResolved;
  summary.errors.push(...ctx.result.errors);
  return summary;
}
