import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { isValidSignalKey, getSignalDefinition } from "./signal-registry";
import { discoverV2Playbooks, getPlaybookBySlug } from "./schema/v2/discovery";
import { runCareForSignal } from "@/app/_features/memory/care/scheduler";

/**
 * Minimal playbook info needed for trigger dispatch.
 */
export interface PlaybookTriggerInfo {
  slug: string;
  name: string;
  description: string;
  layer: "learn" | "act";
  section: string;
}

export interface SignalTriggerContext {
  workspaceId: string;
  signalKey: string;
  entityId: string;
  entitySurface: "person" | "organization" | "work" | "billing" | "meeting" | "file";
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
    for (const trigger of signalTriggers) {
      if ("signal" in trigger && trigger.signal) {
        signalKeys.push(trigger.signal);
      }
      if ("signals" in trigger && trigger.signals && trigger.signals.length > 0) {
        signalKeys.push(...trigger.signals);
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

    // Act-layer playbook: create queued play_run
    const signalDef = getSignalDefinition(context.signalKey);
    const title = `${playbook.name} — ${context.entityLabel ?? context.entityId}`;
    const preview = signalDef
      ? `Triggered by: ${signalDef.description}`
      : `Signal: ${context.signalKey}`;

    const { data: run, error: insertError } = await admin
      .from("play_runs")
      .insert({
        workspace_id: context.workspaceId,
        state: "queued",
        title,
        preview,
        target_type: context.entitySurface,
        target_id: context.entityId,
        target_label: context.entityLabel ?? context.entityId,
        trigger_source: "signal",
        trigger_evidence: {
          signal_key: context.signalKey,
          entity_surface: context.entitySurface,
          entity_id: context.entityId,
          ...context.evidence,
        },
        context_inputs: {
          [`${context.entitySurface}_id`]: context.entityId,
        },
      })
      .select("id")
      .single();

    if (insertError || !run) {
      results.push({
        success: false,
        playbookSlug: playbook.slug,
        error: insertError?.message ?? "Insert failed",
      });
      continue;
    }

    results.push({
      success: true,
      playbookSlug: playbook.slug,
      playRunId: run.id as string,
    });
  }

  return results;
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

  const currentMetadata = (capture.enriched_metadata as Record<string, unknown>) ?? {};
  const currentDispatched = (currentMetadata.plays_dispatched as unknown[]) ?? [];

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
  entitySurface: "person" | "organization" | "work" | "billing" | "meeting" | "file";
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
