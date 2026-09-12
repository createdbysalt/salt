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
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { fromLearningDbEntityType } from "@/app/_lib/learning";

/**
 * Capture signals that flow to playbook triggers. Everything else in
 * signals_matched (classification, noise markers, play-fit inputs) stays
 * metadata-only.
 */
const DISPATCHABLE_SIGNALS = new Set([
  "capture_email_received",
  "capture_email_sent",
  "capture_meeting_completed",
  "capture_message_received",
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
  "person" | "organization" | "work" | "billing" | "meeting" | "resource"
> = {
  people: "person",
  orgs: "organization",
  work: "work",
  billing: "billing",
  meetings: "meeting",
  files: "resource",
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
  /**
   * Capture participant emails (user's own address already excluded). When
   * no records are linked, pending_evidence candidates matched by these
   * emails still get the signal via Memory Care — unknown senders are
   * otherwise invisible to Care until their record is born.
   */
  participantEmails?: string[];
}

export interface DispatchCaptureSignalsResult {
  dispatched: string[];
  entitiesNotified: number;
  /** Pending-evidence candidates that received the signal (no linked records). */
  candidatesNotified: number;
}

/** Cap on pending candidates dispatched per capture — pathological
 *  group threads shouldn't fan out unbounded Care runs. */
const MAX_PENDING_CANDIDATES_PER_CAPTURE = 10;

export async function dispatchCaptureSignals(
  input: DispatchCaptureSignalsInput
): Promise<DispatchCaptureSignalsResult> {
  const normalized = new Set<string>();
  for (const signal of input.signals) {
    const key = SIGNAL_ALIASES[signal] ?? signal;
    if (DISPATCHABLE_SIGNALS.has(key)) normalized.add(key);
  }

  // DM-gated alias: the extractor emits message_received for every messaging
  // capture, but only a direct message is a person-to-person touchpoint the
  // connections capability should react to. Channel chatter stays metadata.
  if (
    input.signals.includes("message_received") &&
    input.signals.includes("is_direct_message")
  ) {
    normalized.add("capture_message_received");
  }

  if (normalized.size === 0) {
    return { dispatched: [], entitiesNotified: 0, candidatesNotified: 0 };
  }

  const signalRecord: Record<string, boolean> = {};
  for (const key of normalized) signalRecord[key] = true;

  const dispatched = new Set<string>();
  let entitiesNotified = 0;
  let candidatesNotified = 0;
  const allResults: Awaited<
    ReturnType<typeof processEntitySignals>
  >["results"] = [];

  // No linked records: the capture's participants may still match
  // pending_evidence candidates (not-yet-born entities). Dispatch to Memory
  // Care with the candidate ref so connections/records capabilities can
  // strengthen or dismiss the candidate — unknown senders are otherwise
  // invisible to Care until birth.
  if (input.linkedRecords.length === 0) {
    const candidates = await findPendingCandidates(
      input.workspaceId,
      input.participantEmails ?? [],
    );
    for (const candidate of candidates) {
      try {
        const result = await processEntitySignals({
          workspaceId: input.workspaceId,
          entitySurface: candidate.entitySurface,
          entityId: candidate.id,
          entityLabel: candidate.identifier,
          signals: signalRecord,
          evidence: { capture_id: input.captureId },
          pendingEvidenceId: candidate.id,
        });
        if (result.dispatched.length > 0) {
          candidatesNotified++;
          result.dispatched.forEach((s) => dispatched.add(s));
        }
        allResults.push(...result.results);
      } catch (error) {
        console.error(
          `[dispatch-capture-signals] Pending-candidate dispatch failed for ${candidate.id}:`,
          error
        );
      }
    }

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

    return { dispatched: [...dispatched], entitiesNotified, candidatesNotified };
  }

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

  return { dispatched: [...dispatched], entitiesNotified, candidatesNotified };
}

interface PendingCandidate {
  id: string;
  identifier: string;
  entitySurface: "person" | "organization" | "work" | "billing" | "meeting" | "resource";
}

/**
 * Pending_evidence candidates whose identifier matches a capture
 * participant. Person identifiers are canonical emails (care/intake
 * canonicalizeIdentifier); org identifiers are domains, so an exact-email
 * match only ever lands on person rows. Watching + suggested only —
 * dismissed candidates stay dismissed.
 */
async function findPendingCandidates(
  workspaceId: string,
  participantEmails: string[],
): Promise<PendingCandidate[]> {
  const emails = [
    ...new Set(
      participantEmails
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0),
    ),
  ];
  if (emails.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pending_evidence")
    .select("id, entity_type, identifier")
    .eq("workspace_id", workspaceId)
    .in("identifier", emails)
    .in("status", ["watching", "suggested"])
    .limit(MAX_PENDING_CANDIDATES_PER_CAPTURE);

  if (error) {
    console.warn(
      "[dispatch-capture-signals] pending-candidate lookup failed:",
      error.message,
    );
    return [];
  }

  const candidates: PendingCandidate[] = [];
  for (const row of data ?? []) {
    const entityType = fromLearningDbEntityType(row.entity_type);
    if (!entityType || entityType === "me") continue;
    candidates.push({
      id: row.id,
      identifier: row.identifier,
      entitySurface: entityType,
    });
  }
  return candidates;
}

/** Suppress dispatch for captures the enrichment marked as noise. */
export function shouldDispatchCaptureSignals(signals: string[]): boolean {
  return !signals.some(
    (s) => s === "is_automated_sender" || s === "is_marketing_email"
  );
}
