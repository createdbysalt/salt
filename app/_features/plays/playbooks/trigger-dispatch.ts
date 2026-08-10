import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { isValidSignalKey } from "./signal-registry";
import { discoverV2Playbooks, getPlaybookBySlug } from "./schema/v2/discovery";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";
import {
  buildExecutionContextV2,
  executePlaybookV2,
} from "./schema/v2/executor";
import { resolveWorkspaceActor } from "@/app/_features/plays/services/workspace-actor";
import {
  recordInlineToolExecutions,
  collectExecutedToolSlugs,
} from "@/app/_features/plays/services/record-inline-executions";
import { recordPlaybookRun } from "./run-recording";

/**
 * Minimal playbook info needed for trigger dispatch.
 */
export interface PlaybookTriggerInfo {
  slug: string;
  name: string;
  description: string;
  layer: "learn" | "act";
  section: string;
  /** When declared, the playbook only fires for this entity surface. */
  surface?: string;
}

export interface SignalTriggerContext {
  workspaceId: string;
  signalKey: string;
  entityId: string;
  entitySurface:
    | "person"
    | "organization"
    | "work"
    | "billing"
    | "meeting"
    | "resource"
    // Workspace-scoped events (e.g. connector_connected) carry the workspace
    // id as entityId so dispatch dedup is once-per-workspace per cooldown.
    | "workspace";
  entityLabel?: string;
  evidence?: Record<string, unknown>;
}

export interface DispatchResult {
  success: boolean;
  playbookSlug: string;
  playRunId?: string;
  error?: string;
  skipped?: string;
}

/**
 * Build a lookup of signal key → playbooks that trigger on that signal.
 */
export function buildSignalTriggerIndex(): Map<string, PlaybookTriggerInfo[]> {
  const index = new Map<string, PlaybookTriggerInfo[]>();

  const discovery = discoverV2Playbooks();
  for (const parsed of discovery.allPlaybooks) {
    const def = parsed.definition;

    const allTriggers = [
      ...(def.trigger ? [def.trigger] : []),
      ...(def.triggers || []),
    ];

    const signalTriggers = allTriggers.filter((t) => t.type === "signal");
    if (signalTriggers.length === 0) continue;

    const signalKeys: string[] = [];
    let surface: string | undefined;
    for (const trigger of signalTriggers) {
      if ("signal" in trigger && trigger.signal) {
        signalKeys.push(trigger.signal);
      }
      if ("signals" in trigger && trigger.signals && trigger.signals.length > 0) {
        signalKeys.push(...trigger.signals);
      }
      if (trigger.surface) {
        surface = trigger.surface;
      }
    }

    if (signalKeys.length === 0) {
      console.warn(
        `[trigger-dispatch] Playbook "${def.slug}" has no signals defined`,
      );
      continue;
    }

    for (const signalKey of signalKeys) {
      if (!isValidSignalKey(signalKey)) {
        console.warn(
          `[trigger-dispatch] Playbook "${def.slug}" has invalid signal key: ${signalKey}`,
        );
        continue;
      }

      const playbookInfo: PlaybookTriggerInfo = {
        slug: def.slug,
        name: def.name,
        description: def.description,
        layer: def.layer,
        section: def.section,
        surface,
      };

      const existing = index.get(signalKey) ?? [];
      if (!existing.some((p) => p.slug === def.slug)) {
        existing.push(playbookInfo);
      }
      index.set(signalKey, existing);
    }
  }

  return index;
}

/**
 * Find playbooks that should fire for a given signal key.
 */
export function findPlaybooksForSignal(signalKey: string): PlaybookTriggerInfo[] {
  const index = buildSignalTriggerIndex();
  return index.get(signalKey) ?? [];
}

/**
 * Check if a playbook is enabled in the workspace.
 *
 * Playbooks are enabled by default. Users can disable them via the toggle
 * which writes to profile_playbook_settings.
 */
export async function isPlaybookEnabled(
  workspaceId: string,
  playbookSlug: string,
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: setting } = await admin
    .from("profile_playbook_settings")
    .select("enabled")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", playbookSlug)
    .maybeSingle();

  // No setting = enabled by default
  // Setting exists = use its value
  return setting?.enabled ?? true;
}


/**
 * Dispatch a signal to matching playbooks.
 *
 * For act-layer playbooks: creates a queued play_run (proposal) for human approval.
 * For learn-layer playbooks with scripts: runs the script directly.
 * For learn-layer playbooks without scripts: returns info only (records-engine handles).
 *
 * Only dispatches to enabled playbooks.
 */
export async function dispatchSignalTrigger(
  context: SignalTriggerContext,
): Promise<DispatchResult[]> {
  // Memory Care capabilities subscribe to signals directly (they are not
  // playbooks and never create play_runs).
  const careOutcomes = await runCareForSignal({
    workspaceId: context.workspaceId,
    signalKey: context.signalKey,
    entityType: context.entitySurface,
    entityId: context.entityId,
    entityLabel: context.entityLabel,
    evidence: context.evidence,
  });

  const results: DispatchResult[] = careOutcomes.map(({ capability, result }) => ({
    success: result.success,
    playbookSlug: `memory-care:${capability}`,
    error: result.error,
    skipped: result.skipped,
  }));

  const matchingPlaybooks = findPlaybooksForSignal(context.signalKey);

  if (matchingPlaybooks.length === 0) {
    return results;
  }

  const admin = createAdminClient();

  for (const playbook of matchingPlaybooks) {
    // Surface-scoped triggers (e.g. a person-only playbook on a signal that
    // also fires for organizations) don't fire for other surfaces.
    if (playbook.surface && playbook.surface !== context.entitySurface) {
      results.push({
        success: true,
        playbookSlug: playbook.slug,
        skipped: "surface_mismatch",
      });
      continue;
    }

    const enabled = await isPlaybookEnabled(context.workspaceId, playbook.slug);

    if (!enabled) {
      results.push({
        success: false,
        playbookSlug: playbook.slug,
        skipped: "disabled",
      });
      continue;
    }

    if (playbook.layer === "learn") {
      // Learn-layer memory maintenance is owned by Memory Care capabilities
      // (dispatched above), not by playbooks.
      results.push({
        success: true,
        playbookSlug: playbook.slug,
        skipped: "learn_layer",
      });
      continue;
    }

    results.push(await executeSignalPlaybook(playbook, context, admin));
  }

  return results;
}

/**
 * A refiring signal (the every-2h scan) must not re-draft while a recent run
 * for the same playbook + entity + signal exists, open or not. Without this
 * the scanner creates a new card per entity per scan.
 */
const SIGNAL_RUN_COOLDOWN_HOURS = 72;

type AdminClient = ReturnType<typeof createAdminClient>;

async function findRecentSignalRun(
  admin: AdminClient,
  input: {
    workspaceId: string;
    playbookSlug: string;
    signalKey: string;
    entitySurface: string;
    entityId: string;
  }
): Promise<string | null> {
  const cutoff = new Date(
    Date.now() - SIGNAL_RUN_COOLDOWN_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data } = await admin
    .from("play_runs")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("source_context->>playbook_slug", input.playbookSlug)
    .eq("trigger_evidence->>signal_key", input.signalKey)
    .eq("target_type", input.entitySurface)
    .eq("target_id", input.entityId)
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();

  return (data?.id as string) ?? null;
}

/**
 * Act-layer signal path: run the playbook through the v2 executor with the
 * entity context so the step chain actually runs (fetch → classify → draft)
 * and declared gates pause for approval. Replaces the pre-Phase-4 behavior of
 * inserting a bare announcement row with no execution behind it.
 */
async function executeSignalPlaybook(
  playbook: PlaybookTriggerInfo,
  context: SignalTriggerContext,
  admin: AdminClient
): Promise<DispatchResult> {
  const parsed = getPlaybookBySlug(playbook.slug);
  if (!parsed) {
    return {
      success: false,
      playbookSlug: playbook.slug,
      error: "Playbook definition not found",
    };
  }

  const recentRunId = await findRecentSignalRun(admin, {
    workspaceId: context.workspaceId,
    playbookSlug: playbook.slug,
    signalKey: context.signalKey,
    entitySurface: context.entitySurface,
    entityId: context.entityId,
  });
  if (recentRunId) {
    return {
      success: true,
      playbookSlug: playbook.slug,
      skipped: "cooldown",
    };
  }

  const userId = await resolveWorkspaceActor(context.workspaceId);
  if (!userId) {
    return {
      success: false,
      playbookSlug: playbook.slug,
      error: "No workspace member to act as",
    };
  }

  const start = Date.now();

  try {
    const execContext = await buildExecutionContextV2(
      context.workspaceId,
      userId,
      {
        type: "signal",
        signalKey: context.signalKey,
        entityId: context.entityId,
        entitySurface: context.entitySurface,
        entityLabel: context.entityLabel,
      },
      parsed.definition.voice
    );

    const execResult = await executePlaybookV2(parsed.definition, execContext);

    await recordPlaybookRun(
      playbook.slug,
      {
        workspaceId: context.workspaceId,
        trigger: "signal",
        signal: context.signalKey,
      },
      {
        success: execResult.status === "success" || execResult.status === "paused",
        error: execResult.status === "error" ? execResult.reason : undefined,
        skipped: execResult.status === "skipped" ? execResult.reason : undefined,
        summary:
          execResult.status === "success"
            ? `Produced ${execResult.outputCount ?? 0} output(s)`
            : execResult.reason,
        data: {
          status: execResult.status,
          outputCount:
            execResult.outputCount ??
            (execResult.status === "paused" ? 1 : 0),
          playRunIds: execResult.playRunIds,
        },
      },
      Date.now() - start
    );

    if (execResult.status === "skipped") {
      return {
        success: true,
        playbookSlug: playbook.slug,
        skipped: execResult.reason ?? "skipped",
      };
    }

    if (execResult.status === "error") {
      return {
        success: false,
        playbookSlug: playbook.slug,
        error: execResult.reason ?? "Execution failed",
      };
    }

    // Tools that executed inline (gates cleared) get their own metered
    // auto_handled record — paused runs anchor their metering to the resume.
    const inlineTools = collectExecutedToolSlugs(execResult.stepResults);
    await recordInlineToolExecutions({
      workspaceId: context.workspaceId,
      playbookSlug: playbook.slug,
      title: `${playbook.name} — ${context.entityLabel ?? context.entityId}`,
      preview: `Ran ${inlineTools.length} step(s) without approval`,
      triggerSignal: context.signalKey,
      evidence: {
        signal_key: context.signalKey,
        entity_surface: context.entitySurface,
        entity_id: context.entityId,
        ...context.evidence,
      },
      toolSlugs: inlineTools,
    });

    const playRunId =
      execResult.status === "paused"
        ? execResult.pausedAt?.playRunId
        : execResult.playRunIds?.[0];

    return {
      success: true,
      playbookSlug: playbook.slug,
      playRunId,
    };
  } catch (error) {
    return {
      success: false,
      playbookSlug: playbook.slug,
      error: error instanceof Error ? error.message : "Execution failed",
    };
  }
}

/**
 * Update a capture's enriched_metadata.plays_dispatched with dispatch results.
 * Call this after dispatchSignalTrigger to record which plays were triggered.
 */
export async function updateCaptureWithDispatchResults(
  captureId: string,
  results: DispatchResult[]
): Promise<void> {
  const successfulDispatches = results.filter(
    (r) => r.success && r.playRunId && !r.skipped
  );

  if (successfulDispatches.length === 0) return;

  const admin = createAdminClient();

  // Fetch current enriched_metadata
  const { data: capture } = await admin
    .from("capture_events")
    .select("enriched_metadata")
    .eq("id", captureId)
    .single();

  if (!capture) return;

  const currentMetadata = (capture.enriched_metadata ?? {}) as Record<string, Json>;
  const currentDispatched = Array.isArray(currentMetadata.plays_dispatched)
    ? currentMetadata.plays_dispatched
    : [];

  // Add new dispatches
  const newDispatches = successfulDispatches.map((r) => ({
    play_slug: r.playbookSlug,
    play_name: r.playbookSlug.replace(/-/g, " "),
    play_run_id: r.playRunId!,
    state: "queued",
    dispatched_at: new Date().toISOString(),
  }));

  // Merge avoiding duplicates
  const existingRunIds = new Set(
    currentDispatched
      .filter((d): d is { play_run_id: string } => typeof d === "object" && d !== null && "play_run_id" in d)
      .map((d) => d.play_run_id)
  );
  const uniqueNewDispatches = newDispatches.filter(
    (d) => !existingRunIds.has(d.play_run_id)
  );

  if (uniqueNewDispatches.length === 0) return;

  await admin
    .from("capture_events")
    .update({
      enriched_metadata: {
        ...currentMetadata,
        plays_dispatched: [...currentDispatched, ...uniqueNewDispatches],
      },
    })
    .eq("id", captureId);
}

/**
 * Get all signal keys that have at least one playbook trigger.
 */
export function getActiveSignalTriggers(): string[] {
  const index = buildSignalTriggerIndex();
  return Array.from(index.keys());
}

const DEFAULT_ACT_THRESHOLD = 70;
const DEFAULT_LEARN_THRESHOLD = 85;

/**
 * Get the confidence threshold for a playbook.
 */
export function getPlaybookThreshold(playbookSlug: string): number {
  const playbook = getPlaybookBySlug(playbookSlug);

  if (playbook) {
    const def = playbook.definition;

    const allTriggers = [
      ...(def.trigger ? [def.trigger] : []),
      ...(def.triggers || []),
    ];

    for (const trigger of allTriggers) {
      if (trigger.type === "signal" && "confidence_threshold" in trigger) {
        const threshold = (trigger as { confidence_threshold?: number }).confidence_threshold;
        if (typeof threshold === "number") {
          return threshold;
        }
      }
    }

    return def.layer === "act" ? DEFAULT_ACT_THRESHOLD : DEFAULT_LEARN_THRESHOLD;
  }

  return DEFAULT_ACT_THRESHOLD;
}

/**
 * Build a map of playbook slug → confidence threshold.
 */
export function buildPlaybookThresholdIndex(): Map<string, number> {
  const index = new Map<string, number>();
  const triggerIndex = buildSignalTriggerIndex();

  const slugs = new Set<string>();
  for (const playbooks of triggerIndex.values()) {
    for (const pb of playbooks) {
      slugs.add(pb.slug);
    }
  }

  for (const slug of slugs) {
    index.set(slug, getPlaybookThreshold(slug));
  }

  return index;
}

/**
 * Check if a signal key has any playbook triggers defined.
 */
export function hasPlaybookForSignal(signalKey: string): boolean {
  return findPlaybooksForSignal(signalKey).length > 0;
}

/**
 * Process a batch of signals for an entity.
 */
export async function processEntitySignals(input: {
  workspaceId: string;
  entitySurface: "person" | "organization" | "work" | "billing" | "meeting" | "resource";
  entityId: string;
  entityLabel?: string;
  signals: Record<string, boolean | number | string | undefined>;
  evidence?: Record<string, unknown>;
}): Promise<{
  dispatched: string[];
  results: DispatchResult[];
}> {
  const { workspaceId, entitySurface, entityId, entityLabel, signals, evidence } = input;

  const dispatched: string[] = [];
  const results: DispatchResult[] = [];

  for (const [signalKey, value] of Object.entries(signals)) {
    if (!value) continue;
    if (typeof value === "boolean" && !value) continue;

    if (!hasPlaybookForSignal(signalKey)) continue;

    const signalResults = await dispatchSignalTrigger({
      workspaceId,
      signalKey,
      entityId,
      entitySurface,
      entityLabel,
      evidence: {
        ...evidence,
        signal_value: value,
      },
    });

    const successfulDispatches = signalResults.filter(
      (r) => r.success && r.playRunId,
    );

    if (successfulDispatches.length > 0) {
      dispatched.push(signalKey);
    }

    results.push(...signalResults);
  }

  return { dispatched, results };
}
