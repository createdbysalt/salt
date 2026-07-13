/**
 * Inline Signal Emission
 *
 * Emits signals immediately when entities are created/updated.
 * Used in CRUD operations to make Salt reactive instead of poll-based.
 *
 * Fire-and-forget: these functions do NOT block the calling operation.
 * Errors are logged but don't propagate to the caller.
 */

import { isValidSignalKey, getSignalDefinition } from "./signals";
import {
  dispatchSignalTrigger,
  type SignalTriggerContext,
} from "@/app/_features/plays/playbooks/trigger-dispatch";
import type { SignalSurface } from "./types";

export interface EmitEntitySignalInput {
  workspaceId: string;
  surface: SignalSurface;
  entityId: string;
  signal: string;
  entityLabel?: string;
  evidence?: Record<string, unknown>;
}

export interface EmitEntitySignalResult {
  emitted: boolean;
  dispatchedCount: number;
  error?: string;
}

/**
 * Emit a signal for an entity change (create, update, state change).
 *
 * This is fire-and-forget by default - it dispatches to playbooks
 * asynchronously without blocking the calling operation.
 *
 * @example
 * ```ts
 * // In a create action - fire and forget
 * emitEntitySignal({
 *   workspaceId,
 *   surface: "person",
 *   entityId: person.id,
 *   signal: "person_created",
 *   entityLabel: person.name,
 *   evidence: { source: "manual_create", email: person.email },
 * });
 * ```
 */
export function emitEntitySignal(input: EmitEntitySignalInput): void {
  emitEntitySignalAsync(input).catch((error) => {
    console.error("[emit-signal] Failed to emit signal:", error);
  });
}

/**
 * Emit a signal and await the result.
 * Use when you need to know if the signal was dispatched.
 */
export async function emitEntitySignalAsync(
  input: EmitEntitySignalInput
): Promise<EmitEntitySignalResult> {
  const { workspaceId, surface, entityId, signal, entityLabel, evidence } =
    input;

  if (!isValidSignalKey(signal)) {
    const error = `Invalid signal key: ${signal}`;
    console.warn(`[emit-signal] ${error}`);
    return { emitted: false, dispatchedCount: 0, error };
  }

  const signalDef = getSignalDefinition(signal);
  if (!signalDef?.canTriggerActing) {
    return { emitted: true, dispatchedCount: 0 };
  }

  const entitySurface = surfaceToEntitySurface(surface);
  if (!entitySurface) {
    const error = `Invalid surface for dispatch: ${surface}`;
    console.warn(`[emit-signal] ${error}`);
    return { emitted: false, dispatchedCount: 0, error };
  }

  const context: SignalTriggerContext = {
    workspaceId,
    signalKey: signal,
    entityId,
    entitySurface,
    entityLabel,
    evidence: {
      emitted_at: new Date().toISOString(),
      emission_type: "inline",
      ...evidence,
    },
  };

  try {
    const results = await dispatchSignalTrigger(context);
    const successfulCount = results.filter((r) => r.success && r.playRunId).length;

    if (successfulCount > 0 && process.env.NODE_ENV === "development") {
      console.warn(
        `[emit-signal] Dispatched ${successfulCount} playbook(s) for ${signal} on ${surface}:${entityId}`
      );
    }

    return { emitted: true, dispatchedCount: successfulCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[emit-signal] Dispatch failed for ${signal}:`, error);
    return { emitted: false, dispatchedCount: 0, error: message };
  }
}

/**
 * Emit multiple signals for an entity in one call.
 * Useful when an update triggers multiple signals.
 *
 * @example
 * ```ts
 * // Work updated with a blocker
 * emitEntitySignals({
 *   workspaceId,
 *   surface: "work",
 *   entityId: work.id,
 *   signals: ["work_updated", "work_is_blocked"],
 *   entityLabel: work.title,
 * });
 * ```
 */
export function emitEntitySignals(input: {
  workspaceId: string;
  surface: SignalSurface;
  entityId: string;
  signals: string[];
  entityLabel?: string;
  evidence?: Record<string, unknown>;
}): void {
  for (const signal of input.signals) {
    emitEntitySignal({
      workspaceId: input.workspaceId,
      surface: input.surface,
      entityId: input.entityId,
      signal,
      entityLabel: input.entityLabel,
      evidence: input.evidence,
    });
  }
}

function surfaceToEntitySurface(
  surface: SignalSurface
): SignalTriggerContext["entitySurface"] | null {
  switch (surface) {
    case "person":
      return "person";
    case "organization":
      return "organization";
    case "work":
      return "work";
    case "billing":
      return "billing";
    case "meeting":
      return "meeting";
    case "file":
      return "file";
    case "note":
    case "operator":
      return null;
    default:
      return null;
  }
}
