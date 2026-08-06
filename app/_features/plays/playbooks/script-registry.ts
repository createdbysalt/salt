/**
 * Static playbook script registry (Turbopack-safe).
 *
 * Dynamic `import(scriptPath)` fails under Turbopack, so every learn-layer
 * playbook script is statically imported here and keyed by playbook slug.
 * All execution paths (signal dispatch, schedule cron, Sync & Scan) resolve
 * scripts through this registry.
 *
 * Adding a playbook script:
 * 1. Create `v2/_meta/<package>/scripts/run.ts` exporting a `run` function.
 * 2. Import it here and add an adapter entry to PLAYBOOK_SCRIPTS.
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { LearningEntityType } from "@/app/_lib/memory-tools";
import { run as runMemoryHygiene } from "./v2/_meta/hygiene/scripts/run";
import {
  run as runMemoryRecords,
  runForWorkspace as runMemoryRecordsForWorkspace,
} from "./v2/_meta/memory-records/scripts/run";
import { run as runConnections } from "./v2/_meta/connections/scripts/run";
import { run as runNotes } from "./v2/_meta/notes/scripts/run";

// ============================================================================
// Contract
// ============================================================================

export type PlaybookScriptTrigger = "signal" | "schedule" | "manual";

export interface PlaybookScriptContext {
  workspaceId: string;
  trigger: PlaybookScriptTrigger;
  /** Signal key when trigger === "signal". */
  signal?: string;
  /** Triggering entity, when the signal is entity-scoped. */
  entityType?: LearningEntityType;
  entityId?: string;
  entityLabel?: string;
  /** Extra evidence/payload from the trigger. */
  triggerData?: Record<string, unknown>;
}

export interface PlaybookScriptResult {
  success: boolean;
  /** Human-readable outcome, shown in activity. */
  summary?: string;
  error?: string;
  /** Set when the script chose not to run (not an error). */
  skipped?: string;
  /** Script-specific counters for logging/verification. */
  data?: Record<string, unknown>;
}

export type PlaybookScriptRunFn = (
  ctx: PlaybookScriptContext,
) => Promise<PlaybookScriptResult>;

// ============================================================================
// Registry
// ============================================================================

export const PLAYBOOK_SCRIPTS: Record<string, PlaybookScriptRunFn> = {
  "memory-hygiene": async (ctx) => {
    const result = await runMemoryHygiene({
      workspaceId: ctx.workspaceId,
      triggerSignal: ctx.signal,
      triggerData: ctx.triggerData,
    });
    return {
      success: result.success,
      summary: result.summary,
      error: result.error,
      data: result.data,
    };
  },

  "memory-records": async (ctx) => {
    // Entity-scoped signal: evaluate fill rules for that entity only.
    if (ctx.entityType && ctx.entityId) {
      const result = await runMemoryRecords({
        workspaceId: ctx.workspaceId,
        signal: ctx.signal ?? "manual",
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        entityLabel: ctx.entityLabel,
      });
      return {
        success: true,
        summary: `Evaluated ${result.rulesEvaluated} rules, matched ${result.rulesMatched}, ${result.updates.length} update(s)`,
        data: {
          rulesEvaluated: result.rulesEvaluated,
          rulesMatched: result.rulesMatched,
          updates: result.updates.length,
        },
      };
    }

    // Scheduled / on-demand: sweep recently active people and orgs.
    const result = await runMemoryRecordsForWorkspace({
      workspaceId: ctx.workspaceId,
      signal: ctx.signal,
    });
    return {
      success: true,
      summary: `Scanned ${result.entitiesEvaluated} records, matched ${result.rulesMatched} rules, ${result.updates.length} update(s)`,
      data: {
        entitiesEvaluated: result.entitiesEvaluated,
        rulesMatched: result.rulesMatched,
        updates: result.updates.length,
      },
    };
  },

  connections: async (ctx) => {
    const result = await runConnections({
      workspaceId: ctx.workspaceId,
      triggerSignal: ctx.signal,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      entityLabel: ctx.entityLabel,
      triggerData: ctx.triggerData,
    });
    return {
      success: result.success,
      summary: result.summary,
      error: result.error,
      skipped: result.skipped,
      data: result.data,
    };
  },

  notes: async (ctx) => {
    const result = await runNotes({
      workspaceId: ctx.workspaceId,
      triggerSignal: ctx.signal,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      entityLabel: ctx.entityLabel,
      triggerData: ctx.triggerData,
    });
    return {
      success: result.success,
      summary: result.summary,
      error: result.error,
      skipped: result.skipped,
      data: result.data,
    };
  },
};

export function hasPlaybookScript(slug: string): boolean {
  return slug in PLAYBOOK_SCRIPTS;
}

export function getPlaybookScript(slug: string): PlaybookScriptRunFn | null {
  return PLAYBOOK_SCRIPTS[slug] ?? null;
}

export function getRegisteredScriptSlugs(): string[] {
  return Object.keys(PLAYBOOK_SCRIPTS);
}

// ============================================================================
// Execution + run recording
// ============================================================================

const PLAYBOOK_DISPLAY_NAMES: Record<string, string> = {
  "memory-hygiene": "Memory Hygiene",
  "memory-records": "Memory Records",
  connections: "Connections",
  notes: "Notes",
  "daily-briefing": "Daily Briefing",
};

function didMeaningfulWork(result: PlaybookScriptResult): boolean {
  if (!result.success || result.skipped) return false;
  const data = result.data ?? {};
  const counters = ["emitted", "updates", "rulesMatched"] as const;
  return counters.some(
    (key) => typeof data[key] === "number" && (data[key] as number) > 0,
  );
}

/**
 * Record a script execution in activity_entries so the playbook detail page
 * (Activity feed, run recency) reflects real runs.
 *
 * Signal-triggered runs are only recorded when they did meaningful work to
 * avoid flooding activity on every capture; scheduled/manual runs are always
 * recorded.
 */
export async function recordPlaybookScriptRun(
  slug: string,
  ctx: PlaybookScriptContext,
  result: PlaybookScriptResult,
  durationMs: number,
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
        player_slug: "keeper",
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
    console.error(`[script-registry] Failed to record run for ${slug}:`, error);
  }
}

/**
 * Execute a playbook script by slug with error containment and run recording.
 * This is the single entry point used by trigger dispatch, the schedule cron,
 * and on-demand (Sync & Scan) runs.
 */
export async function executePlaybookScript(
  slug: string,
  ctx: PlaybookScriptContext,
): Promise<PlaybookScriptResult> {
  const script = getPlaybookScript(slug);
  if (!script) {
    return { success: false, skipped: "no_script" };
  }

  const startedAt = Date.now();
  let result: PlaybookScriptResult;

  try {
    result = await script(ctx);
  } catch (error) {
    result = {
      success: false,
      error: error instanceof Error ? error.message : "Script execution failed",
    };
  }

  await recordPlaybookScriptRun(slug, ctx, result, Date.now() - startedAt);

  return result;
}
