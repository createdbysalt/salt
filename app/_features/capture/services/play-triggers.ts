/**
 * Play Triggers Service
 *
 * Dispatches entity signals extracted from captures to playbooks that
 * declare those signals as triggers (see `playbooks/trigger-dispatch.ts`).
 *
 * The legacy hardcoded TRIGGER_PATTERNS path (processCaptureTriggers /
 * processRecentCaptureTriggers) was removed 2026-08-07: it had no callers
 * and inserted play_runs without playbook attribution, violating the plays
 * canon ("a play is a playbook run"). Patterns are authored as playbooks
 * with `trigger: { type: "signal", signal: "..." }` definitions.
 */

import { processEntitySignals, updateCaptureWithDispatchResults } from "@/app/_features/plays/playbooks/trigger-dispatch";

/**
 * Process playbook-declared signal triggers for a person entity.
 *
 * Call this when person signals are extracted/updated to dispatch to any
 * playbooks that declare those signals as triggers.
 */
export async function processPersonSignalTriggers(input: {
  workspaceId: string;
  personId: string;
  personLabel: string;
  signals: Record<string, boolean | number | string | undefined>;
  captureId?: string;
  sourceUrl?: string;
}): Promise<{ success: boolean; playsCreated: number; signalsDispatched: string[] }> {
  const result = await processEntitySignals({
    workspaceId: input.workspaceId,
    entitySurface: "person",
    entityId: input.personId,
    entityLabel: input.personLabel,
    signals: input.signals,
    evidence: {
      capture_id: input.captureId,
      source_url: input.sourceUrl,
    },
  });

  // Update capture with dispatch results so UI shows which plays were triggered
  if (input.captureId && result.results.length > 0) {
    await updateCaptureWithDispatchResults(input.captureId, result.results);
  }

  const playsCreated = result.results.filter((r) => r.success && r.playRunId).length;

  return {
    success: true,
    playsCreated,
    signalsDispatched: result.dispatched,
  };
}

/**
 * Process playbook-declared signal triggers for a billing entity.
 */
export async function processBillingSignalTriggers(input: {
  workspaceId: string;
  billingId: string;
  billingLabel: string;
  signals: Record<string, boolean | number | string | undefined>;
  captureId?: string;
}): Promise<{ success: boolean; playsCreated: number; signalsDispatched: string[] }> {
  const result = await processEntitySignals({
    workspaceId: input.workspaceId,
    entitySurface: "billing",
    entityId: input.billingId,
    entityLabel: input.billingLabel,
    signals: input.signals,
    evidence: {
      capture_id: input.captureId,
    },
  });

  // Update capture with dispatch results so UI shows which plays were triggered
  if (input.captureId && result.results.length > 0) {
    await updateCaptureWithDispatchResults(input.captureId, result.results);
  }

  const playsCreated = result.results.filter((r) => r.success && r.playRunId).length;

  return {
    success: true,
    playsCreated,
    signalsDispatched: result.dispatched,
  };
}

/**
 * Process playbook-declared signal triggers for a meeting entity.
 */
export async function processMeetingSignalTriggers(input: {
  workspaceId: string;
  meetingId: string;
  meetingLabel: string;
  signals: Record<string, boolean | number | string | undefined>;
  captureId?: string;
}): Promise<{ success: boolean; playsCreated: number; signalsDispatched: string[] }> {
  const result = await processEntitySignals({
    workspaceId: input.workspaceId,
    entitySurface: "meeting",
    entityId: input.meetingId,
    entityLabel: input.meetingLabel,
    signals: input.signals,
    evidence: {
      capture_id: input.captureId,
    },
  });

  // Update capture with dispatch results so UI shows which plays were triggered
  if (input.captureId && result.results.length > 0) {
    await updateCaptureWithDispatchResults(input.captureId, result.results);
  }

  const playsCreated = result.results.filter((r) => r.success && r.playRunId).length;

  return {
    success: true,
    playsCreated,
    signalsDispatched: result.dispatched,
  };
}
