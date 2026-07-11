import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { PlaybookBlueprintRow, PlaybookTriggerSignal } from "./types";
import { isValidSignalKey, getSignalDefinition } from "./signal-registry";
import { loadAuthoredPlaybookBlueprintRows } from "./load-authored-playbook-blueprints";

export interface SignalTriggerMatch {
  blueprint: PlaybookBlueprintRow;
  signalKey: string;
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
 * Only includes playbooks with valid signal triggers from the registry.
 */
export function buildSignalTriggerIndex(): Map<string, PlaybookBlueprintRow[]> {
  const index = new Map<string, PlaybookBlueprintRow[]>();
  const blueprints = loadAuthoredPlaybookBlueprintRows();

  for (const blueprint of blueprints) {
    const trigger = blueprint.trigger;
    if (!trigger || trigger.type !== "signal") continue;

    const signalTrigger = trigger as PlaybookTriggerSignal;
    const signalKey = signalTrigger.signal;

    if (!isValidSignalKey(signalKey)) {
      console.warn(
        `[trigger-dispatch] Playbook "${blueprint.slug}" has invalid signal key: ${signalKey}`,
      );
      continue;
    }

    const existing = index.get(signalKey) ?? [];
    existing.push(blueprint);
    index.set(signalKey, existing);
  }

  return index;
}

/**
 * Find playbooks that should fire for a given signal key.
 */
export function findPlaybooksForSignal(signalKey: string): PlaybookBlueprintRow[] {
  const index = buildSignalTriggerIndex();
  return index.get(signalKey) ?? [];
}

/**
 * Check if a playbook is adopted in the workspace.
 */
async function isPlaybookAdopted(
  workspaceId: string,
  playbookSlug: string,
): Promise<{ adopted: boolean; templateId?: string; isActive?: boolean }> {
  const admin = createAdminClient();

  const { data: template } = await admin
    .from("play_templates")
    .select("id, is_active")
    .eq("workspace_id", workspaceId)
    .eq("blueprint_slug", playbookSlug)
    .maybeSingle();

  if (!template) {
    return { adopted: false };
  }

  return {
    adopted: true,
    templateId: template.id as string,
    isActive: template.is_active as boolean,
  };
}

/**
 * Dispatch a signal to matching playbooks.
 *
 * For acting playbooks: creates a queued play_run (proposal) for human approval.
 * For keeper/profile playbooks: returns info only (records-engine handles execution).
 *
 * Only dispatches to adopted + active playbooks.
 */
export async function dispatchSignalTrigger(
  context: SignalTriggerContext,
): Promise<DispatchResult[]> {
  const matchingPlaybooks = findPlaybooksForSignal(context.signalKey);

  if (matchingPlaybooks.length === 0) {
    return [];
  }

  const results: DispatchResult[] = [];
  const admin = createAdminClient();

  for (const blueprint of matchingPlaybooks) {
    const adoption = await isPlaybookAdopted(context.workspaceId, blueprint.slug);

    if (!adoption.adopted) {
      results.push({
        success: false,
        playbookSlug: blueprint.slug,
        skipped: "not_adopted",
      });
      continue;
    }

    if (!adoption.isActive) {
      results.push({
        success: false,
        playbookSlug: blueprint.slug,
        skipped: "inactive",
      });
      continue;
    }

    if (blueprint.kind === "profile") {
      results.push({
        success: true,
        playbookSlug: blueprint.slug,
        skipped: "profile_kind",
      });
      continue;
    }

    const signalDef = getSignalDefinition(context.signalKey);
    const title = `${blueprint.name} — ${context.entityLabel ?? context.entityId}`;
    const preview = signalDef
      ? `Triggered by: ${signalDef.description}`
      : `Signal: ${context.signalKey}`;

    const { data: run, error: insertError } = await admin
      .from("play_runs")
      .insert({
        workspace_id: context.workspaceId,
        template_id: adoption.templateId,
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
        playbookSlug: blueprint.slug,
        error: insertError?.message ?? "Insert failed",
      });
      continue;
    }

    results.push({
      success: true,
      playbookSlug: blueprint.slug,
      playRunId: run.id as string,
    });
  }

  return results;
}

/**
 * Get all signal keys that have at least one playbook trigger.
 * Useful for knowing which signals to watch for.
 */
export function getActiveSignalTriggers(): string[] {
  const index = buildSignalTriggerIndex();
  return Array.from(index.keys());
}

/**
 * Check if a signal key has any playbook triggers defined.
 */
export function hasPlaybookForSignal(signalKey: string): boolean {
  return findPlaybooksForSignal(signalKey).length > 0;
}

/**
 * Process a batch of signals for an entity.
 * Returns all signals that had playbook triggers dispatched.
 *
 * @param workspaceId - The workspace ID
 * @param entitySurface - The entity surface (person, organization, etc.)
 * @param entityId - The entity ID
 * @param entityLabel - Human-readable entity label
 * @param signals - Object of signal keys to boolean values (true = signal is active)
 * @param evidence - Optional evidence to attach to play_runs
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
