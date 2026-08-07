/**
 * Capture Signal Dispatch
 *
 * The enrichment pipeline computes `signals_matched` for badges and
 * play-fit scoring, but historically never dispatched them — playbooks
 * declaring capture signals as triggers (Connections, Notes) never ran.
 *
 * This module forwards the dispatchable subset of matched signals to
 * `processEntitySignals` for each linked Memory record, which routes them
 * to any playbook that declares the signal as a trigger.
 */

import {
  processEntitySignals,
  updateCaptureWithDispatchResults,
} from "@/app/_features/plays/playbooks/trigger-dispatch";

/**
 * Capture signals that flow to playbook triggers. Everything else in
 * signals_matched (classification, noise markers, play-fit inputs) stays
 * metadata-only.
 */
const DISPATCHABLE_SIGNALS = new Set([
  "capture_email_received",
  "capture_email_sent",
  "capture_meeting_completed",
  "billing_payment_matched",
  "file_shared",
  "capture_processed",
]);

/** Extractor variants normalized to the signal keys playbooks declare. */
const SIGNAL_ALIASES: Record<string, string> = {
  file_shared_with_me: "file_shared",
};

const SURFACE_TO_ENTITY: Record<
  string,
  "person" | "organization" | "work" | "billing" | "meeting" | "file"
> = {
  people: "person",
  orgs: "organization",
  work: "work",
  billing: "billing",
  meetings: "meeting",
  files: "file",
};

export interface DispatchCaptureSignalsInput {
  workspaceId: string;
  captureId: string;
  /** signals_matched from enriched metadata. */
  signals: string[];
  /** linked_records from enriched metadata. */
  linkedRecords: Array<{
    surface: string;
    entity_id: string;
    entity_label?: string;
  }>;
}

export interface DispatchCaptureSignalsResult {
  dispatched: string[];
  entitiesNotified: number;
}

export async function dispatchCaptureSignals(
  input: DispatchCaptureSignalsInput
): Promise<DispatchCaptureSignalsResult> {
  const normalized = new Set<string>();
  for (const signal of input.signals) {
    const key = SIGNAL_ALIASES[signal] ?? signal;
    if (DISPATCHABLE_SIGNALS.has(key)) normalized.add(key);
  }

  if (normalized.size === 0 || input.linkedRecords.length === 0) {
    return { dispatched: [], entitiesNotified: 0 };
  }

  const signalRecord: Record<string, boolean> = {};
  for (const key of normalized) signalRecord[key] = true;

  const dispatched = new Set<string>();
  let entitiesNotified = 0;
  const allResults: Awaited<
    ReturnType<typeof processEntitySignals>
  >["results"] = [];

  // Dedupe linked records per entity so a capture matched to the same
  // record twice only dispatches once.
  const seen = new Set<string>();
  for (const record of input.linkedRecords) {
    const entitySurface = SURFACE_TO_ENTITY[record.surface];
    if (!entitySurface) continue;

    const dedupeKey = `${entitySurface}:${record.entity_id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    try {
      const result = await processEntitySignals({
        workspaceId: input.workspaceId,
        entitySurface,
        entityId: record.entity_id,
        entityLabel: record.entity_label,
        signals: signalRecord,
        evidence: { capture_id: input.captureId },
      });

      if (result.dispatched.length > 0) {
        entitiesNotified++;
        result.dispatched.forEach((s) => dispatched.add(s));
      }
      allResults.push(...result.results);
    } catch (error) {
      console.error(
        `[dispatch-capture-signals] Dispatch failed for ${dedupeKey}:`,
        error
      );
    }
  }

  // Surface triggered plays on the capture (UI shows plays_dispatched).
  if (allResults.length > 0) {
    try {
      await updateCaptureWithDispatchResults(input.captureId, allResults);
    } catch (error) {
      console.error(
        "[dispatch-capture-signals] Failed to record dispatch results:",
        error
      );
    }
  }

  return { dispatched: [...dispatched], entitiesNotified };
}

/** Suppress dispatch for captures the enrichment marked as noise. */
export function shouldDispatchCaptureSignals(signals: string[]): boolean {
  return !signals.some(
    (s) => s === "is_automated_sender" || s === "is_marketing_email"
  );
}
