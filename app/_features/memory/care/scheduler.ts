/**
 * Memory Care scheduler — the single entry point for running care
 * capabilities, replacing the retired system-playbook script registry.
 *
 * Entry points:
 * - `runDueCareCapabilities(now)` — cron (playbook-schedules route)
 * - `runCareForSignal(...)` — signal dispatch (trigger-dispatch)
 * - `runCareCapability(...)` — on-demand (Sync & Scan)
 *
 * Every run respects per-capability enablement (Memory → Rules) and records
 * an activity entry with `source: "memory-care"` (Memory surfaces only —
 * Plays Activity excludes these).
 */

import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { cronMatchesHour } from "@/app/_features/plays/playbooks/schedule-matcher";
import { isCareCapabilityEnabled } from "./settings";
import { runRecordsCapability, runRecordsForWorkspace } from "./capabilities/records";
import { runHygieneCapability } from "./capabilities/hygiene";
import { runConnectionsCapability } from "./capabilities/connections";
import { runNotesCapability } from "./capabilities/notes";
import {
  CARE_CAPABILITY_META,
  type CareCapability,
  type CareRunContext,
  type CareRunResult,
} from "./types";
import { runPendingReflections, runFullReflectionScan } from "./reflection";

// =============================================================================
// Schedules (ported from the retired _meta playbook definitions)
// =============================================================================

const CARE_SCHEDULES: Array<{ capability: CareCapability; cron: string }> = [
  { capability: "notes", cron: "0 2 * * 0" }, // Sunday 2am
  { capability: "hygiene", cron: "0 3 * * 0" }, // Sunday 3am
  { capability: "connections", cron: "0 6 * * 1" }, // Monday 6am
];

// =============================================================================
// Signal → capability map (ported from the retired _meta definitions)
// =============================================================================

const CARE_SIGNAL_MAP: Record<string, CareCapability[]> = {
  // Records: fill rules react to extracted entity learnings
  entity_learning_extracted: ["records"],
  // Records: Phase 4 person field producers (connector payloads carry the
  // extracted value in evidence.signalValues — see
  // capture/services/producers/person-field-producer.ts)
  person_name_extracted: ["records"],
  person_email_extracted: ["records"],
  person_phone_extracted: ["records"],
  person_title_extracted: ["records"],
  person_timezone_detected: ["records"],
  person_billing_email_extracted: ["records"],
  // Records: CRM org + deal producers (Track A) — account fields and deal
  // stage arrive as extraction values in evidence.signalValues.
  org_name_extracted: ["records"],
  org_industry_inferred: ["records"],
  org_subindustry_inferred: ["records"],
  org_website_found: ["records"],
  org_billing_email_extracted: ["records"],
  work_stage_inferred: ["records"],
  billing_party_email_match: ["records"],
  // Hygiene: data-quality signals
  person_duplicate_email: ["hygiene"],
  person_duplicate_phone: ["hygiene"],
  org_duplicate_domain: ["hygiene"],
  billing_duplicate_number: ["hygiene"],
  file_duplicate_hash: ["hygiene"],
  meeting_duplicate_time_attendees: ["hygiene"],
  person_no_activity_90d: ["hygiene"],
  org_no_activity_90d: ["hygiene"],
  work_stale_active: ["hygiene"],
  person_missing_email: ["hygiene"],
  person_orphan: ["hygiene"],
  // Connections: inference + health signals
  capture_email_received: ["connections"],
  capture_email_sent: ["connections"],
  capture_meeting_completed: ["connections"],
  capture_message_received: ["connections"],
  billing_payment_matched: ["connections"],
  file_shared: ["connections"],
  connection_inferred: ["connections"],
  connection_strengthened: ["connections"],
  relationship_at_risk: ["connections"],
  // Notes: quality sweeps react to note lifecycle
  capture_processed: ["notes"],
  note_created: ["notes"],
  note_flagged: ["notes"],
  preference_detected: ["notes"],
  context_extracted: ["notes"],
};

/** Signals that trigger at least one care capability. */
export function getCareSignalKeys(): string[] {
  return Object.keys(CARE_SIGNAL_MAP);
}

/**
 * Read producer-carried signal values out of a dispatch's evidence payload.
 * Producers place them under `signalValues` (see
 * capture/services/producers/person-field-producer.ts).
 */
function readSignalValues(
  triggerData: Record<string, unknown> | undefined
): Record<string, boolean | number | string> | undefined {
  const values = triggerData?.signalValues;
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return undefined;
  }
  const out: Record<string, boolean | number | string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function signalHasCareCapability(signalKey: string): boolean {
  return signalKey in CARE_SIGNAL_MAP;
}

// =============================================================================
// Execution
// =============================================================================

async function executeCapability(
  capability: CareCapability,
  ctx: CareRunContext
): Promise<CareRunResult> {
  switch (capability) {
    case "records":
      if (ctx.entityType && ctx.entityId) {
        const result = await runRecordsCapability({
          workspaceId: ctx.workspaceId,
          signal: ctx.triggerSignal ?? "scheduled_scan",
          entityType: ctx.entityType as never,
          entityId: ctx.entityId,
          entityLabel: ctx.entityLabel,
          signalValues: readSignalValues(ctx.triggerData),
        });
        return {
          success: true,
          summary: `${result.rulesMatched} rule(s) matched, ${result.updates.length} update(s)`,
          data: {
            rulesEvaluated: result.rulesEvaluated,
            rulesMatched: result.rulesMatched,
            updates: result.updates.length,
          },
        };
      }
      {
        const result = await runRecordsForWorkspace({
          workspaceId: ctx.workspaceId,
          signal: ctx.triggerSignal,
        });
        return {
          success: true,
          summary: `Evaluated ${result.entitiesEvaluated} records, ${result.rulesMatched} rule(s) matched`,
          data: {
            entitiesEvaluated: result.entitiesEvaluated,
            rulesMatched: result.rulesMatched,
            updates: result.updates.length,
          },
        };
      }
    case "hygiene":
      return runHygieneCapability(ctx);
    case "connections":
      return runConnectionsCapability(ctx);
    case "notes":
      return runNotesCapability(ctx);
  }
}

function didMeaningfulWork(result: CareRunResult): boolean {
  if (!result.success || result.skipped) return false;
  const data = result.data ?? {};
  const counters = ["emitted", "updates", "rulesMatched", "merged", "archived"] as const;
  return counters.some(
    (key) => typeof data[key] === "number" && (data[key] as number) > 0
  );
}

/**
 * Record a capability run in activity_entries so Memory surfaces reflect
 * real runs. Signal-triggered runs are only recorded when they did
 * meaningful work to avoid flooding activity on every capture.
 */
export async function recordCareRun(
  capability: CareCapability,
  ctx: CareRunContext & { trigger: "signal" | "schedule" | "manual" },
  result: CareRunResult,
  durationMs: number
): Promise<void> {
  if (ctx.trigger === "signal" && !didMeaningfulWork(result)) return;
  if (result.skipped) return;

  const name = CARE_CAPABILITY_META[capability].name;

  try {
    const admin = createAdminClient();
    await admin.from("activity_entries").insert({
      workspace_id: ctx.workspaceId,
      action: "ran",
      title: result.success
        ? `Memory Care: ${name} ran`
        : `Memory Care: ${name} failed`,
      detail: result.summary ?? result.error ?? null,
      metadata: {
        source: "memory-care",
        capability,
        auto_executed: true,
        trigger: ctx.trigger,
        signal: ctx.triggerSignal,
        success: result.success,
        duration_ms: durationMs,
        ...result.data,
      },
    });
  } catch (error) {
    // Run recording must never break execution
    console.error(`[memory-care] Failed to record run for ${capability}:`, error);
  }
}

/**
 * Run a single capability for a workspace, respecting enablement.
 */
export async function runCareCapability(
  capability: CareCapability,
  ctx: CareRunContext & { trigger: "signal" | "schedule" | "manual" }
): Promise<CareRunResult> {
  const enabled = await isCareCapabilityEnabled(ctx.workspaceId, capability);
  if (!enabled) {
    return { success: true, skipped: "disabled" };
  }

  const startTime = Date.now();
  try {
    const result = await executeCapability(capability, ctx);
    await recordCareRun(capability, ctx, result, Date.now() - startTime);
    return result;
  } catch (error) {
    const failure: CareRunResult = {
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
    };
    await recordCareRun(capability, ctx, failure, Date.now() - startTime);
    return failure;
  }
}

/**
 * Dispatch a signal to the care capabilities that subscribe to it.
 */
export async function runCareForSignal(context: {
  workspaceId: string;
  signalKey: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  evidence?: Record<string, unknown>;
}): Promise<Array<{ capability: CareCapability; result: CareRunResult }>> {
  const capabilities = CARE_SIGNAL_MAP[context.signalKey];
  if (!capabilities || capabilities.length === 0) return [];

  const outcomes: Array<{ capability: CareCapability; result: CareRunResult }> = [];
  for (const capability of capabilities) {
    const result = await runCareCapability(capability, {
      workspaceId: context.workspaceId,
      trigger: "signal",
      triggerSignal: context.signalKey,
      entityType: context.entityType,
      entityId: context.entityId,
      entityLabel: context.entityLabel,
      triggerData: context.evidence,
    });
    outcomes.push({ capability, result });
  }
  return outcomes;
}

/** Care capabilities whose schedule fires during the given hour. */
export function findDueCareCapabilities(
  now: Date
): Array<{ capability: CareCapability; cron: string }> {
  return CARE_SCHEDULES.filter((s) => cronMatchesHour(s.cron, now));
}

/**
 * Cron entry: run every due care capability across all active workspaces.
 */
export async function runDueCareCapabilities(now: Date): Promise<{
  due: CareCapability[];
  runs: number;
  failures: number;
  skipped: number;
}> {
  const due = findDueCareCapabilities(now);
  if (due.length === 0) {
    return { due: [], runs: 0, failures: 0, skipped: 0 };
  }

  const admin = createAdminClient();
  const { data: workspaces, error } = await admin
    .from("workspaces")
    .select("id")
    .is("deleted_at", null)
    .limit(100);

  if (error || !workspaces) {
    throw new Error(`Failed to list workspaces: ${error?.message ?? "unknown"}`);
  }

  let runs = 0;
  let failures = 0;
  let skipped = 0;

  for (const { capability } of due) {
    for (const workspace of workspaces) {
      const result = await runCareCapability(capability, {
        workspaceId: workspace.id,
        trigger: "schedule",
      });
      if (result.skipped) {
        skipped++;
      } else if (result.success) {
        runs++;
      } else {
        failures++;
        console.error(
          `[memory-care] ${capability} failed for workspace ${workspace.id}: ${result.error}`
        );
      }
    }
  }

  return { due: due.map((d) => d.capability), runs, failures, skipped };
}

// =============================================================================
// P8 Reflection Pass Integration
// =============================================================================

/**
 * Run pending reflection passes for a workspace.
 * Called after correction events are recorded to process any triggers
 * that have crossed the threshold.
 */
export async function runPendingReflectionsForWorkspace(
  workspaceId: string
): Promise<{ triggersProcessed: number; weightsAdjusted: number }> {
  try {
    const result = await runPendingReflections(workspaceId);
    return {
      triggersProcessed: result.triggersProcessed,
      weightsAdjusted: result.totalWeightsAdjusted,
    };
  } catch (error) {
    console.error(`[memory-care] Reflection pass failed for ${workspaceId}:`, error);
    return { triggersProcessed: 0, weightsAdjusted: 0 };
  }
}

/**
 * Cron entry: run weekly reflection scan across all active workspaces.
 * This catches low-activity workspaces that may not hit the trigger threshold
 * but have accumulated corrections over time.
 *
 * Runs: Sunday 4am (between hygiene at 3am and connections on Monday 6am)
 */
export async function runWeeklyReflectionScan(): Promise<{
  workspacesScanned: number;
  categoriesAnalyzed: number;
  weightsAdjusted: number;
}> {
  const admin = createAdminClient();
  const { data: workspaces, error } = await admin
    .from("workspaces")
    .select("id")
    .is("deleted_at", null)
    .limit(100);

  if (error || !workspaces) {
    console.error(`[memory-care] Failed to list workspaces for reflection: ${error?.message}`);
    return { workspacesScanned: 0, categoriesAnalyzed: 0, weightsAdjusted: 0 };
  }

  let totalCategories = 0;
  let totalWeights = 0;

  for (const workspace of workspaces) {
    try {
      const result = await runFullReflectionScan(workspace.id);
      totalCategories += result.categoriesAnalyzed;
      totalWeights += result.weightsAdjusted;
    } catch (error) {
      console.error(
        `[memory-care] Reflection scan failed for workspace ${workspace.id}:`,
        error
      );
    }
  }

  console.log(
    `[memory-care] Weekly reflection scan: ${workspaces.length} workspaces, ` +
      `${totalCategories} categories, ${totalWeights} weights adjusted`
  );

  return {
    workspacesScanned: workspaces.length,
    categoriesAnalyzed: totalCategories,
    weightsAdjusted: totalWeights,
  };
}
