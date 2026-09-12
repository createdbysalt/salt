/**
 * Route Intake Proposal (internal module — NOT a server action)
 *
 * Runs from webhook/cron contexts (no user session) with the admin client,
 * so it must never be reachable from the client. It lives outside
 * actions.ts deliberately: a "use server" directive makes every export a
 * public endpoint, and this function takes workspaceId from its caller
 * (Sources plan 6.3 / INV-3: workspace derives from the trusted pipeline
 * context here, never from a request payload).
 *
 * Also hosts the shared extracted-field helpers and the P7
 * relationship-grade signal vocabulary used by both this module and
 * actions.ts (which keeps the session-scoped, RLS-guarded actions).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import {
  toLearningDbEntityType,
  type LearningEntityType,
} from "@/app/_lib/learning";
import {
  SIGNAL_WEIGHTS,
  canonicalizeIdentifier,
  evaluateEvidence,
  logOddsToProbability,
  probabilityToLogOdds,
  type IntakeEntityType,
} from "@/app/_features/memory/care/intake";
import { autoCreateRecord } from "./auto-create-record";
import type { ExtractedFieldValue } from "./types";

function toPendingEvidenceDbType(entityType: IntakeEntityType): string {
  return toLearningDbEntityType(entityType as LearningEntityType);
}

/**
 * Flatten extracted fields to their plain string values (for merge input
 * and signal provenance rows).
 */
export function extractedFieldPlainValues(
  fields: Record<string, ExtractedFieldValue>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, field]) => Boolean(field.value))
      .map(([key, field]) => [key, field.value])
  );
}

/**
 * Default confidence for a field whose extractor offered no opinion (e.g.
 * the classifier's plain-string signal data). Direct extractions only —
 * anything derived or inferred must arrive with its own confidence.
 */
export const DEFAULT_EXTRACTED_CONFIDENCE = 80;

function clampConfidence(value: number): number {
  return Math.min(99, Math.max(1, Math.round(value)));
}

/**
 * Merge extracted fields from a new signal into existing fields.
 *
 * New data may arrive as plain strings (no extractor opinion — stamped
 * with DEFAULT_EXTRACTED_CONFIDENCE) or as full ExtractedFieldValues whose
 * confidence is preserved. Never re-stamp an incoming confidence with the
 * default: a field the criteria engine judged at 55 must not surface as
 * "80% confident".
 */
export function mergeExtractedFields(
  existing: Record<string, ExtractedFieldValue>,
  newData: Record<string, string | ExtractedFieldValue>,
  captureId?: string
): Record<string, ExtractedFieldValue> {
  const merged = { ...existing };

  for (const [key, incoming] of Object.entries(newData)) {
    const value = typeof incoming === "string" ? incoming : incoming.value;
    if (!value) continue;
    const incomingConfidence =
      typeof incoming === "string"
        ? DEFAULT_EXTRACTED_CONFIDENCE
        : clampConfidence(incoming.confidence);
    const incomingSources =
      typeof incoming === "string"
        ? []
        : incoming.sources.filter((source) => Boolean(source));

    if (merged[key]) {
      // Field already exists - update if new value matches or has higher implied confidence
      if (merged[key].value === value) {
        // Same value - add source
        const newSources = [
          ...(captureId ? [captureId] : []),
          ...incomingSources,
        ].filter((source) => !merged[key].sources.includes(source));
        if (newSources.length > 0) {
          merged[key].sources.push(...newSources);
          // Increase confidence slightly with corroboration
          merged[key].confidence = Math.min(
            99,
            merged[key].confidence + 2 * newSources.length
          );
        }
      } else {
        // Different value - only replace if we have more sources for the new one
        // (This is a simplification; in production you'd want more sophisticated conflict resolution)
        // For now, keep the existing value but note the conflict
      }
    } else {
      // New field
      merged[key] = {
        value,
        confidence: incomingConfidence,
        sources: [
          ...incomingSources,
          ...(captureId && !incomingSources.includes(captureId)
            ? [captureId]
            : []),
        ],
      };
    }
  }

  return merged;
}

/**
 * Input for routing a CREATE-tier capture proposal into pending_evidence.
 */
export interface RouteIntakeProposalInput {
  workspaceId: string;
  entityType: IntakeEntityType;
  identifier: string;
  /** Criteria-engine confidence (0-100 probability). */
  confidence: number;
  extractedFields: Record<string, ExtractedFieldValue>;
  /**
   * Signal names backing the proposal, in the intake SIGNAL_WEIGHTS
   * vocabulary. The primary signal's weight drives score accumulation.
   */
  signals: string[];
  /** Capture event that produced the proposal (provenance). */
  captureId?: string;
}

export type RouteIntakeProposalResult =
  | { outcome: "created"; evidenceId: string; recordId: string }
  | { outcome: "suggested"; evidenceId: string }
  | { outcome: "skipped"; evidenceId: string };

/**
 * Route a CREATE-tier capture proposal into the evidence system.
 *
 * Memory is fully autonomous: the accumulated log-odds score is evaluated
 * against the entity's EVIDENCE_THRESHOLDS bars, and crossing the auto bar
 * creates the record directly — the threshold IS the auto-apply. There is
 * no calibration to earn and no worthiness gate; correction ("That's
 * wrong" on the Handled lane) replaces approval. Sub-bar proposals keep
 * accumulating in the background. Dismissed or already-created evidence is
 * never resurrected.
 */
export async function routeIntakeProposal(
  input: RouteIntakeProposalInput
): Promise<RouteIntakeProposalResult> {
  // Runs from webhook/cron contexts (no user session), so this uses the
  // admin client — matching auto-create-record and process-capture.
  const supabase = createAdminClient();

  const canonicalId = canonicalizeIdentifier(input.entityType, input.identifier);
  // Clamp away from the asymptotes so the stored log-odds stays finite.
  const clampedConfidence = Math.min(99, Math.max(1, Math.round(input.confidence)));
  const proposalScore = probabilityToLogOdds(clampedConfidence);

  const { data: existing } = await supabase
    .from("pending_evidence")
    .select("id, status, log_odds_score, extracted_fields")
    .eq("workspace_id", input.workspaceId)
    .eq("entity_type", toPendingEvidenceDbType(input.entityType))
    .eq("identifier", canonicalId)
    .single();

  let evidenceId: string;
  let score: number;
  // Fields carried into the birth call. On the accumulation path this is the
  // MERGED set — corroborated fields from prior signals must survive into
  // the record, not just the latest proposal's fields.
  let birthFields: Record<string, ExtractedFieldValue>;

  // Provenance + accumulation both key off the primary signal.
  const primarySignal = input.signals[0] ?? "capture_create_decision";

  if (existing) {
    // Respect terminal states: the user said no, or the record already exists.
    if (existing.status === "dismissed" || existing.status === "created") {
      return { outcome: "skipped", evidenceId: existing.id };
    }

    // Boundary cast out of the Json column; this shape is written by
    // addSignalToEvidence / routeIntakeProposal above.
    const existingFields = (existing.extracted_fields ?? {}) as unknown as Record<
      string,
      ExtractedFieldValue
    >;
    // Merge the full field values (not flattened plain strings) so the
    // criteria engine's per-field confidence survives — flattening here used
    // to re-stamp every field at the flat default.
    const mergedFields = mergeExtractedFields(
      existingFields,
      input.extractedFields,
      input.captureId
    );

    // Accumulate like addSignalToEvidence: each corroborating proposal adds
    // its signal weight, so repeat evidence (e.g. one invoice per billing
    // cycle for the same counterparty) builds toward the auto bar. Signals
    // outside the intake vocabulary fall back to the confidence-derived
    // score. Previously Math.max pinned repeat proposals at the first
    // proposal's score, making the auto tier unreachable from this path.
    const signalWeight = SIGNAL_WEIGHTS[primarySignal];
    const delta = signalWeight === undefined ? proposalScore : signalWeight;
    score = existing.log_odds_score + delta;

    await supabase
      .from("pending_evidence")
      .update({
        status: "suggested",
        log_odds_score: score,
        last_signal_at: new Date().toISOString(),
        extracted_fields: mergedFields as unknown as Json,
      })
      .eq("id", existing.id);

    evidenceId = existing.id;
    birthFields = mergedFields;
  } else {
    const { data: newEvidence, error } = await supabase
      .from("pending_evidence")
      .insert({
        workspace_id: input.workspaceId,
        entity_type: toPendingEvidenceDbType(input.entityType),
        identifier: canonicalId,
        log_odds_score: proposalScore,
        status: "suggested",
        extracted_fields: input.extractedFields as unknown as Json,
      })
      .select()
      .single();

    if (error) throw error;

    evidenceId = newEvidence.id;
    score = proposalScore;
    birthFields = input.extractedFields;
  }

  // Provenance: record what put this identifier on the suggested lane.
  await supabase.from("pending_evidence_signals").insert({
    evidence_id: evidenceId,
    signal: primarySignal,
    weight: SIGNAL_WEIGHTS[primarySignal] ?? 0,
    capture_id: input.captureId ?? null,
    extracted_data: extractedFieldPlainValues(input.extractedFields),
  });

  // The threshold is the only gate: over the entity's auto bar, the record
  // is born. On failure (e.g. missing name, operator refusal), fall back to
  // the suggested lane — the row keeps accumulating and the next signal
  // retries.
  if (evaluateEvidence(input.entityType, score) === "auto") {
    const created = await autoCreateRecord({
      workspaceId: input.workspaceId,
      evidenceId,
      entityType: input.entityType,
      identifier: canonicalId,
      // Birth confidence reflects the ACCUMULATED score (the thing that
      // crossed the bar), not the latest proposal's raw confidence —
      // matching addSignalToEvidence's birth call.
      confidence: logOddsToProbability(score),
      extractedFields: birthFields,
      signalCount: Math.max(input.signals.length, 1),
      captureId: input.captureId,
    });
    if (created.ok) {
      return { outcome: "created", evidenceId, recordId: created.recordId };
    }
  }

  return { outcome: "suggested", evidenceId };
}
