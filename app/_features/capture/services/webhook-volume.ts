import "server-only";

/**
 * Webhook volume metrics (capture-pipeline repair, Phase 6).
 *
 * Rolls up the Phase 0 webhook_outcome telemetry plus capture_events inserts
 * into a per-provider volume picture over a trailing window. Surfaced in the
 * capture-reconciliation cron response so the scheduled-job output (GitHub
 * Actions step summary on staging, Vercel logs on prod) doubles as the
 * volume monitor — no new infra.
 *
 * Bounded reads: both queries cap at ROW_CEILING rows; a window that
 * produces more is already a incident-grade volume spike, and the partial
 * rollup still shows it.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";

const ROW_CEILING = 10000;

export interface WebhookOutcomeVolume {
  triggerSlug: string;
  outcome: string;
  count: number;
}

export interface CaptureVolume {
  sourceType: string;
  count: number;
}

export interface WebhookVolumeMetrics {
  windowHours: number;
  /** Non-success webhook outcomes per trigger slug (Phase 0 telemetry). */
  outcomes: WebhookOutcomeVolume[];
  /** capture_events rows per provider. */
  captures: CaptureVolume[];
  /** True when a source query hit the row ceiling (volume spike). */
  truncated: boolean;
}

export async function getWebhookVolumeMetrics(
  windowHours = 24,
): Promise<WebhookVolumeMetrics> {
  const admin = createAdminClient();
  const cutoff = new Date(
    Date.now() - windowHours * 60 * 60 * 1000,
  ).toISOString();

  const outcomeCounts = new Map<string, number>();
  const captureCounts = new Map<string, number>();
  let truncated = false;

  const { data: outcomeRows, error: outcomeError } = await admin
    .from("connector_sync_events")
    .select("subject_slug, detail")
    .eq("kind", "webhook_outcome")
    .gte("created_at", cutoff)
    .limit(ROW_CEILING);

  if (outcomeError) {
    console.error(
      "[webhook-volume] outcome query failed:",
      outcomeError.message,
    );
  } else {
    truncated = truncated || (outcomeRows?.length ?? 0) >= ROW_CEILING;
    for (const row of outcomeRows ?? []) {
      const detail = row.detail as { outcome?: unknown } | null;
      const outcome =
        typeof detail?.outcome === "string" ? detail.outcome : "unknown";
      const key = `${row.subject_slug}${outcome}`;
      outcomeCounts.set(key, (outcomeCounts.get(key) ?? 0) + 1);
    }
  }

  const { data: captureRows, error: captureError } = await admin
    .from("capture_events")
    .select("source_type")
    .gte("created_at", cutoff)
    .limit(ROW_CEILING);

  if (captureError) {
    console.error(
      "[webhook-volume] capture query failed:",
      captureError.message,
    );
  } else {
    truncated = truncated || (captureRows?.length ?? 0) >= ROW_CEILING;
    for (const row of captureRows ?? []) {
      const sourceType = row.source_type as string;
      captureCounts.set(
        sourceType,
        (captureCounts.get(sourceType) ?? 0) + 1,
      );
    }
  }

  const outcomes: WebhookOutcomeVolume[] = [...outcomeCounts.entries()]
    .map(([key, count]) => {
      const separatorIndex = key.indexOf(" ");
      return {
        triggerSlug: key.slice(0, separatorIndex),
        outcome: key.slice(separatorIndex + 1),
        count,
      };
    })
    .sort((a, b) => b.count - a.count);

  const captures: CaptureVolume[] = [...captureCounts.entries()]
    .map(([sourceType, count]) => ({ sourceType, count }))
    .sort((a, b) => b.count - a.count);

  return { windowHours, outcomes, captures, truncated };
}
