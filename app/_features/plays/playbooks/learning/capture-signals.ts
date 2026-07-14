/**
 * Playbook Learning Signals
 *
 * Captures learning signals from playbook runs for improvement proposals.
 * @deprecated This module is being phased out in favor of v2 playbooks.
 */

export interface PlaybookLearningSignal {
  workspaceId: string;
  blueprintSlug: string;
  templateId?: string | null;
  playRunId?: string | null;
  signalType:
    | "approved"
    | "dismissed"
    | "edited"
    | "failed"
    | "guard_skipped"
    | "timed_out";
  delta?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface BlueprintMeta {
  slug: string;
  blueprint_slug: string;
  name: string;
  version: number;
  playerSlug?: string;
}

/**
 * Capture a learning signal from a playbook run.
 * @deprecated Use v2 playbook signals instead.
 */
export async function capturePlaybookLearningSignal(
  _signal: PlaybookLearningSignal
): Promise<void> {
  // Stub - v1 learning signals are deprecated
  // Signals are now captured via v2 playbook routing
}

/**
 * Load blueprint metadata for a template.
 * @deprecated Use v2 discovery instead.
 */
export async function loadTemplateBlueprintMeta(
  _templateId: string,
  _workspaceId?: string
): Promise<BlueprintMeta | null> {
  // Stub - returns null as v1 blueprints are deprecated
  return null;
}
