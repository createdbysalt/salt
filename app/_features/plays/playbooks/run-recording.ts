/**
 * Playbook run recording.
 *
 * Records playbook executions in activity_entries so playbook detail pages
 * (Activity feed, run recency) reflect real runs. Used by the schedule cron
 * for act-layer playbooks (e.g. Daily Briefing) executed through the v2 step
 * executor.
 *
 * Memory Care capabilities record their own runs via
 * `app/_features/memory/care/scheduler.ts` (`source: "memory-care"`).
 * Those rows are excluded from Plays Activity.
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";

export type PlaybookRunTrigger = "signal" | "schedule" | "manual";

export interface PlaybookRunContext {
  workspaceId: string;
  trigger: PlaybookRunTrigger;
  signal?: string;
}

export interface PlaybookRunResult {
  success: boolean;
  summary?: string;
  error?: string;
  skipped?: string;
  data?: Record<string, unknown>;
}

const PLAYBOOK_DISPLAY_NAMES: Record<string, string> = {
  "daily-briefing": "Daily Briefing",
};

function didMeaningfulWork(result: PlaybookRunResult): boolean {
  if (!result.success || result.skipped) return false;
  const data = result.data ?? {};
  const counters = ["emitted", "updates", "rulesMatched", "outputCount"] as const;
  return counters.some(
    (key) => typeof data[key] === "number" && (data[key] as number) > 0
  );
}

/**
 * Record a playbook execution in activity_entries.
 *
 * Signal-triggered runs are only recorded when they did meaningful work to
 * avoid flooding activity on every capture; scheduled/manual runs are always
 * recorded.
 */
export async function recordPlaybookRun(
  slug: string,
  ctx: PlaybookRunContext,
  result: PlaybookRunResult,
  durationMs: number
): Promise<void> {
  if (ctx.trigger === "signal" && !didMeaningfulWork(result)) return;
  if (result.skipped) return;

  const name = PLAYBOOK_DISPLAY_NAMES[slug] ?? slug.replace(/-/g, " ");

  try {
    const admin = createAdminClient();
    await admin.from("activity_entries").insert({
      workspace_id: ctx.workspaceId,
      action: "ran",
      title: result.success ? `${name} ran` : `${name} failed`,
      detail: result.summary ?? result.error ?? null,
      metadata: {
        playbook_slug: slug,
        player_slug: "playbook",
        auto_executed: true,
        trigger: ctx.trigger,
        signal: ctx.signal,
        success: result.success,
        duration_ms: durationMs,
        ...result.data,
      },
    });
  } catch (error) {
    // Run recording must never break execution
    console.error(`[run-recording] Failed to record run for ${slug}:`, error);
  }
}
