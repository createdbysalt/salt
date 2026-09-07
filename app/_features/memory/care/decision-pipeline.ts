/**
 * Memory Care decision pipeline — the single shared gate every capability
 * emits proposals into.
 *
 * Replaces the retired playbook execution-router + confidence-gate. Routes
 * each proposal by tiered confidence bars:
 *
 * - apply  → aggregated confidence clears the tier bar. The caller performs
 *            the entity write; the pipeline records the salt_learning,
 *            resolves evidence, and logs a Handled activity entry.
 * - watch  → below the bar. Evidence is parked in `entity_evidence` and a
 *            Watching activity entry is logged. No approval queue, no
 *            play_runs — the user can nudge from Memory → Filter.
 * - refuse → never-touch field (money). Hard rule: no write, no evidence,
 *            no queue.
 *
 * P3/P8 — Correction read-forward: before accumulating anything, the pipeline
 * checks the correction blocklist for this entity+field. If the proposed
 * value was previously corrected as wrong ("Not this"), the proposal is
 * refused outright — no evidence, no Watching card, no re-apply. Corrections
 * expire after CORRECTION_BLOCK_TTL_MONTHS; manual user writes bypass the
 * pipeline entirely, so a person re-accepting a dismissed value always wins.
 *
 * Protection invariant: the actual entity write still goes through
 * `app/_lib/memory-tools` (or the records-engine field writers, which record
 * provenance). This pipeline decides; the tools write.
 */

import "server-only";

import {
  accumulateEvidence,
  getAggregatedConfidence,
  resolveEvidence,
  type LearningEntityType,
} from "@/app/_lib/learning";
import {
  classifyFieldTier,
  decideTierOutcome,
  isAlwaysAutoField,
  isNeverTouchField,
  tierBar,
  type MemoryFieldTier,
} from "@/app/_lib/learning/field-tiers";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  generateEvidenceSummary,
  recordSaltLearning,
} from "@/app/_features/me/actions/salt-learnings";
import { getCareThreshold } from "./settings";
import { getSignalSourceWeight } from "./reflection";
import {
  findBlockingCorrection,
  getCorrectionBlocklist,
} from "@/app/_features/memory/queries/corrections";
import type { CareDecision, CareProposal } from "./types";

export interface CareFieldBar {
  tier: MemoryFieldTier;
  /** Bar to pass as `minThreshold` to memoryUpdateField. Infinity = refuse. */
  bar: number;
  alwaysAuto: boolean;
}

/**
 * Compute the tier and bar for a field without emitting anything. Used by
 * capabilities that route writes through `memoryUpdateField` (which
 * aggregates and applies internally) — pass `bar` as `minThreshold`.
 */
export async function getCareFieldBar(
  workspaceId: string,
  entityType: string,
  field: string,
  proposedValue?: unknown,
  currentValue?: unknown
): Promise<CareFieldBar> {
  if (isAlwaysAutoField(entityType, field)) {
    return { tier: "standard", bar: 0, alwaysAuto: true };
  }
  const tier = classifyFieldTier(entityType, field, proposedValue, currentValue);
  if (tier === "never_touch") {
    return { tier, bar: Number.POSITIVE_INFINITY, alwaysAuto: false };
  }
  const threshold = await getCareThreshold(workspaceId);
  return { tier, bar: tierBar(tier, threshold), alwaysAuto: false };
}

function toLearningEntityType(entityType: string): LearningEntityType {
  const mapping: Record<string, LearningEntityType> = {
    person: "person",
    organization: "organization",
    work: "work",
    meeting: "meeting",
    file: "resource",
    resource: "resource",
    me: "me",
    billing: "billing",
    billing_record: "billing",
    operator: "me",
    workspace: "me",
  };
  return mapping[entityType] ?? "person";
}

async function logCareActivity(
  proposal: CareProposal,
  entry: {
    action: "applied" | "accumulated";
    title: string;
    detail: string;
    confidence: number;
    bar: number;
    evidenceId?: string;
  }
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("activity_entries").insert({
      workspace_id: proposal.workspaceId,
      action: entry.action,
      title: entry.title,
      detail: entry.detail,
      metadata: {
        source: "memory-care",
        capability: proposal.capability,
        entity_type: proposal.entityType,
        entity_id: proposal.entityId,
        entity_label: proposal.entityLabel ?? null,
        field: proposal.field,
        proposed_value: proposal.proposedValue,
        confidence: entry.confidence,
        bar: entry.bar,
        evidence_id: entry.evidenceId ?? null,
        rule_id: proposal.ruleId ?? null,
      },
    });
  } catch (error) {
    // Activity logging must never break the pipeline
    console.error("[memory-care] Failed to log activity:", error);
  }
}

/**
 * Route a care proposal through the tiered pipeline.
 *
 * On "apply" the pipeline records transparency artifacts (salt_learning,
 * evidence resolution, Handled activity) and returns — the CALLER performs
 * the entity write, since write paths differ per caller (records-engine
 * field writers vs memoryUpdateField).
 */
export async function processCareProposal(
  proposal: CareProposal
): Promise<CareDecision> {
  const entityType = toLearningEntityType(proposal.entityType);
  const entityLabel = proposal.entityLabel ?? proposal.entityType;
  const fieldLabel = proposal.field.replace(/_/g, " ");

  // Null proposals carry no information — skip quietly.
  if (proposal.proposedValue === null || proposal.proposedValue === "") {
    return {
      action: "watch",
      tier: "standard",
      aggregatedConfidence: 0,
      bar: 0,
      reason: "empty proposal",
    };
  }

  // No-op guard: the field already holds this exact value. Accumulating
  // would park a "proposal" in Watching for something already true and
  // re-notify on every care run (record_status → active on already-active
  // records, 2026-09). Nothing changes, so nothing is logged.
  if (
    proposal.currentValue != null &&
    String(proposal.currentValue) === String(proposal.proposedValue)
  ) {
    return {
      action: "apply",
      tier: "standard",
      aggregatedConfidence: proposal.confidence,
      bar: 0,
      reason: "already set — no change",
      noop: true,
    };
  }

  // Never-touch fields: hard rule, not a queue. No evidence, no activity.
  if (isNeverTouchField(entityType, proposal.field)) {
    return {
      action: "refuse",
      tier: "never_touch",
      aggregatedConfidence: proposal.confidence,
      bar: Number.POSITIVE_INFINITY,
      reason: `${proposal.field} is a never-touch field`,
    };
  }

  // P8 re-application guard: if this value was previously corrected ("Not
  // this"), refuse before anything is written — no evidence, no Watching
  // card, no re-apply. The user taught Salt; recurrence is the bug.
  const blocklist = await getCorrectionBlocklist(
    proposal.workspaceId,
    entityType,
    proposal.entityId,
    proposal.field
  );
  const blockingCorrection = findBlockingCorrection(
    blocklist,
    proposal.field,
    proposal.proposedValue
  );

  if (blockingCorrection) {
    return {
      action: "refuse",
      tier: classifyFieldTier(
        entityType,
        proposal.field,
        proposal.proposedValue,
        proposal.currentValue
      ),
      aggregatedConfidence: proposal.confidence,
      bar: Number.POSITIVE_INFINITY,
      reason: `Value previously corrected by the user (correction ${blockingCorrection.id}) — not re-proposing`,
      correctionGuardTriggered: true,
    };
  }

  // Low-risk observation fields bypass gating entirely.
  if (isAlwaysAutoField(entityType, proposal.field)) {
    return {
      action: "apply",
      tier: "standard",
      aggregatedConfidence: proposal.confidence,
      bar: 0,
      reason: "low-risk field",
    };
  }

  const tier = classifyFieldTier(
    entityType,
    proposal.field,
    proposal.proposedValue,
    proposal.currentValue
  );
  const workspaceThreshold = await getCareThreshold(proposal.workspaceId);
  const bar = tierBar(tier, workspaceThreshold);

  // Accumulate evidence first — the audit trail exists regardless of outcome.
  const { evidenceId, aggregatedConfidence: rawAggregatedConfidence } = await accumulateEvidence({
    workspaceId: proposal.workspaceId,
    entityType,
    entityId: proposal.entityId,
    fieldPath: proposal.field,
    proposedValue: proposal.proposedValue,
    confidence: proposal.confidence,
    evidenceType: proposal.evidenceType,
    evidenceDetails: {
      because: proposal.because,
      ruleId: proposal.ruleId,
      capability: proposal.capability,
      ...proposal.evidenceDetails,
    },
    sourceType: proposal.sourceType,
    sourceCaptureId: proposal.sourceCaptureId,
    playbookSlug: proposal.capability,
  });

  // P8 pattern-level learning: apply signal source weight adjustment.
  // If corrections have clustered on this source+field, confidence is reduced.
  const sourceWeight = await getSignalSourceWeight(
    proposal.workspaceId,
    proposal.sourceType,
    proposal.field
  );
  const aggregatedConfidence =
    sourceWeight < 1
      ? Math.round(rawAggregatedConfidence * sourceWeight)
      : rawAggregatedConfidence;

  const { decision } = decideTierOutcome(tier, aggregatedConfidence, workspaceThreshold);

  if (decision === "apply") {
    const allEvidence = await getAggregatedConfidence(
      proposal.workspaceId,
      entityType,
      proposal.entityId,
      proposal.field
    );
    const evidenceIds = allEvidence?.evidenceIds ?? [evidenceId];
    const sourceTypeCount = allEvidence?.sourceTypeCount ?? 1;
    const evidenceCount = allEvidence?.evidenceCount ?? 1;

    const { id: learningId } = await recordSaltLearning({
      workspaceId: proposal.workspaceId,
      entityType,
      entityId: proposal.entityId,
      entityLabel,
      fieldPath: proposal.field,
      fieldLabel,
      oldValue: proposal.currentValue,
      newValue: proposal.proposedValue,
      confidence: aggregatedConfidence,
      evidenceSummary: await generateEvidenceSummary(evidenceCount, sourceTypeCount),
      evidenceIds,
      playbookSlug: proposal.capability,
    });

    await resolveEvidence(proposal.workspaceId, evidenceIds, "applied", {
      learningId,
      appliedAt: new Date().toISOString(),
    });

    await logCareActivity(proposal, {
      action: "applied",
      title: `Updated ${fieldLabel} for ${entityLabel}`,
      detail: `${proposal.proposedValue} — ${proposal.because}`,
      confidence: aggregatedConfidence,
      bar,
      evidenceId,
    });

    return {
      action: "apply",
      tier,
      aggregatedConfidence,
      bar,
      reason: `${aggregatedConfidence}% clears the ${bar}% bar`,
      evidenceId,
      learningId,
    };
  }

  // Watch: evidence parked, visible in Memory → Filter. No approval queue.
  await logCareActivity(proposal, {
    action: "accumulated",
    title: `Watching: ${fieldLabel} for ${entityLabel}`,
    detail: `Confidence ${aggregatedConfidence}% — waiting for more signal (bar ${bar}%)`,
    confidence: aggregatedConfidence,
    bar,
    evidenceId,
  });

  return {
    action: "watch",
    tier,
    aggregatedConfidence,
    bar,
    reason: `${aggregatedConfidence}% below the ${bar}% bar`,
    evidenceId,
  };
}
