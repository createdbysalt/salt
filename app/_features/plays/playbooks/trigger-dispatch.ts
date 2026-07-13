import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { PlaybookBlueprintRow, PlaybookTriggerSignal } from "./types";
import { isValidSignalKey, getSignalDefinition } from "./signal-registry";
import { loadAuthoredPlaybookBlueprintRows } from "./load-authored-playbook-blueprints";
import { discoverV2Playbooks, getPlaybookBySlug } from "./schema/v2/discovery";
import type { LearningEntityType } from "@/app/_lib/memory-tools";

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
 * Includes both v1 authored playbooks and v2 playbook packages.
 */
export function buildSignalTriggerIndex(): Map<string, PlaybookBlueprintRow[]> {
  const index = new Map<string, PlaybookBlueprintRow[]>();

  // Add v1 authored playbooks
  const v1Blueprints = loadAuthoredPlaybookBlueprintRows();

  for (const blueprint of v1Blueprints) {
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

  // Add v2 playbook packages
  const v2Discovery = discoverV2Playbooks();
  for (const parsed of v2Discovery.allPlaybooks) {
    const def = parsed.definition;

    // Collect all triggers (single or array)
    const allTriggers = [
      ...(def.trigger ? [def.trigger] : []),
      ...(def.triggers || []),
    ];

    // Filter to signal-type triggers only
    const signalTriggers = allTriggers.filter((t) => t.type === "signal");
    if (signalTriggers.length === 0) continue;

    // Support both single signal and signals array within each trigger
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
        `[trigger-dispatch] v2 Playbook "${def.slug}" has no signals defined`,
      );
      continue;
    }

    // Register for each signal
    for (const signalKey of signalKeys) {
      if (!isValidSignalKey(signalKey)) {
        console.warn(
          `[trigger-dispatch] v2 Playbook "${def.slug}" has invalid signal key: ${signalKey}`,
        );
        continue;
      }

      // Convert v2 definition to v1 blueprint row format for compatibility
      const now = new Date().toISOString();
      const blueprintRow: PlaybookBlueprintRow = {
        slug: def.slug,
        name: def.name,
        kind: def.layer === "learn" ? "profile" : "acting",
        player_slug: def.section, // Section-based grouping (players retired)
        description: def.description,
        when_to_use: null,
        trigger: { type: "signal", signal: signalKey },
        procedure_md: "",
        // v2 playbooks use their own execution model, not v1 steps
        definition: { version: 1, steps: [] },
        fill_rules: null,
        required_actions: [],
        required_toolkits: [],
        value_model: null, // v2 playbooks use their own value model
        version: 1,
        status: "active",
        created_at: now,
        updated_at: now,
        workspace_id: null,
        origin: "salt",
      };

      const existing = index.get(signalKey) ?? [];
      // Avoid duplicates if v1 and v2 both define same slug
      if (!existing.some(b => b.slug === def.slug)) {
        existing.push(blueprintRow);
      }
      index.set(signalKey, existing);
    }
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

interface PlaybookScriptInput {
  packagePath: string;
  workspaceId: string;
  signal: string;
  entityType: LearningEntityType;
  entityId: string;
  entityLabel?: string;
}

interface PlaybookScriptResult {
  scriptExecutionId: string;
  rulesEvaluated: number;
  rulesMatched: number;
  updates: Array<{
    field: string;
    value: string;
    action: string;
    confidence: number;
  }>;
}

/**
 * Run a playbook package script.
 *
 * This dynamically imports the scripts/run.ts from a playbook package
 * and executes it with the signal context.
 */
async function runPlaybookPackageScript(
  input: PlaybookScriptInput
): Promise<PlaybookScriptResult> {
  const scriptPath = `${input.packagePath}/scripts/run`;

  try {
    const scriptModule = await import(scriptPath);

    if (typeof scriptModule.run !== "function") {
      throw new Error(`Playbook script at ${scriptPath} does not export a run function`);
    }

    const result = await scriptModule.run({
      workspaceId: input.workspaceId,
      signal: input.signal,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
    });

    return {
      scriptExecutionId: `script_${Date.now()}_${input.entityId.slice(0, 8)}`,
      rulesEvaluated: result.rulesEvaluated ?? 0,
      rulesMatched: result.rulesMatched ?? 0,
      updates: result.updates ?? [],
    };
  } catch (error) {
    console.error(`[trigger-dispatch] Script execution failed for ${input.packagePath}:`, error);
    throw error;
  }
}

/**
 * Dispatch a signal to matching playbooks.
 *
 * For acting playbooks: creates a queued play_run (proposal) for human approval.
 * For keeper/profile playbooks with scripts: runs the script directly.
 * For keeper/profile playbooks without scripts: returns info only (records-engine handles execution).
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
      // Check if this is a v2 playbook package with a script
      const v2Playbook = getPlaybookBySlug(blueprint.slug);
      if (v2Playbook?.hasScript && v2Playbook.packagePath) {
        // Run the playbook package script
        try {
          const scriptResult = await runPlaybookPackageScript({
            packagePath: v2Playbook.packagePath,
            workspaceId: context.workspaceId,
            signal: context.signalKey,
            entityType: context.entitySurface as LearningEntityType,
            entityId: context.entityId,
            entityLabel: context.entityLabel,
          });

          results.push({
            success: true,
            playbookSlug: blueprint.slug,
            playRunId: scriptResult.scriptExecutionId,
          });
        } catch (error) {
          results.push({
            success: false,
            playbookSlug: blueprint.slug,
            error: error instanceof Error ? error.message : "Script execution failed",
          });
        }
        continue;
      }

      // No script - legacy profile playbook, skip (records-engine handles separately)
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
