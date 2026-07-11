/**
 * Confidence Gate for Keeper Profile Fields
 *
 * Integrates the execution router into the profile engine.
 * Routes field mutations through three paths:
 * - auto_execute: Write immediately, record in salt_learnings
 * - accumulate: Store evidence, skip write
 * - approval_required: Create play run for user approval
 */

import {
  determineExecutionPath,
  type ExecutionPath,
} from "../execution-router";
import {
  accumulateEvidence,
  getAggregatedConfidence,
  type KeeperEntityType,
} from "../evidence-accumulator";
import {
  recordSaltLearning,
  generateEvidenceSummary,
} from "@/app/_features/me/actions/salt-learnings";
import { resolveEvidence } from "../evidence-accumulator";
import type { ProfileFieldResult, ProfileEntityType } from "./types";

export interface ConfidenceGateInput {
  workspaceId: string;
  entityType: ProfileEntityType;
  entityId: string;
  entityLabel: string;
  field: string;
  proposedValue: string | null;
  currentValue: unknown;
  result: ProfileFieldResult;
  sourceType: string;
  sourceCaptureId?: string;
  playbookSlug?: string;
}

export interface ConfidenceGateOutput {
  path: ExecutionPath["path"];
  shouldWrite: boolean;
  shouldCreatePlayRun: boolean;
  aggregatedConfidence: number;
  evidenceId?: string;
  learningId?: string;
}

/**
 * Map ProfileEntityType to KeeperEntityType.
 * ProfileEntityType has more variants (operator, workspace, billing_record)
 * that map to keeper-compatible types.
 */
function toKeeperEntityType(entityType: ProfileEntityType): KeeperEntityType {
  const mapping: Record<string, KeeperEntityType> = {
    person: "person",
    organization: "organization",
    work: "work",
    meeting: "meeting",
    file: "file",
    me: "me",
    billing: "billing",
    billing_record: "billing",
    operator: "me",
    workspace: "me",
  };
  return mapping[entityType] ?? "person";
}

/**
 * Map evidence type from profile result source
 */
function inferEvidenceType(
  source: string,
): "email_match" | "llm_inference" | "behavioral_signal" {
  if (source === "rule") return "llm_inference";
  if (source === "email") return "email_match";
  return "behavioral_signal";
}

/**
 * Route a profile field mutation through the confidence gate.
 *
 * Returns instructions on what to do:
 * - shouldWrite: true → proceed with entity table update
 * - shouldCreatePlayRun: true → create play run for approval
 * - If neither, evidence was accumulated (waiting for more signal)
 */
export async function gateProfileFieldMutation(
  input: ConfidenceGateInput,
): Promise<ConfidenceGateOutput> {
  const keeperEntityType = toKeeperEntityType(input.entityType);

  // Skip null values — nothing to do
  if (!input.proposedValue) {
    return {
      path: "accumulate",
      shouldWrite: false,
      shouldCreatePlayRun: false,
      aggregatedConfidence: 0,
    };
  }

  // First, accumulate the evidence (even if we end up auto-executing)
  const evidenceType = inferEvidenceType(input.result.source);
  const { evidenceId, aggregatedConfidence } = await accumulateEvidence({
    workspaceId: input.workspaceId,
    entityType: keeperEntityType,
    entityId: input.entityId,
    fieldPath: input.field,
    proposedValue: input.proposedValue,
    confidence: input.result.confidence,
    evidenceType,
    evidenceDetails: {
      because: input.result.because,
      ruleId: input.result.ruleId,
      ...input.result.evidence,
    },
    sourceType: input.sourceType,
    sourceCaptureId: input.sourceCaptureId,
    playbookSlug: input.playbookSlug,
  });

  // Determine execution path based on aggregated confidence
  const executionPath = await determineExecutionPath({
    workspaceId: input.workspaceId,
    entityType: keeperEntityType,
    entityId: input.entityId,
    fieldPath: input.field,
    proposedValue: input.proposedValue,
    currentValue: input.currentValue,
    aggregatedConfidence,
  });

  if (executionPath.path === "auto_execute") {
    // Get all evidence IDs to resolve them
    const allEvidence = await getAggregatedConfidence(
      input.workspaceId,
      keeperEntityType,
      input.entityId,
      input.field,
    );
    const evidenceIds = allEvidence?.evidenceIds ?? [evidenceId];
    const sourceTypeCount = allEvidence?.sourceTypeCount ?? 1;
    const evidenceCount = allEvidence?.evidenceCount ?? 1;

    // Record in salt_learnings for transparency
    const { id: learningId } = await recordSaltLearning({
      workspaceId: input.workspaceId,
      entityType: keeperEntityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      fieldPath: input.field,
      fieldLabel: input.field.replace(/_/g, " "),
      oldValue: input.currentValue,
      newValue: input.proposedValue,
      confidence: aggregatedConfidence,
      evidenceSummary: await generateEvidenceSummary(
        evidenceCount,
        sourceTypeCount,
      ),
      evidenceIds,
      playbookSlug: input.playbookSlug,
    });

    // Mark evidence as resolved
    await resolveEvidence(
      input.workspaceId,
      evidenceIds,
      "applied",
      { learningId, appliedAt: new Date().toISOString() },
    );

    return {
      path: "auto_execute",
      shouldWrite: true,
      shouldCreatePlayRun: false,
      aggregatedConfidence,
      evidenceId,
      learningId,
    };
  }

  if (executionPath.path === "approval_required") {
    // Resolve evidence as needing approval (will be re-evaluated after approval)
    await resolveEvidence(
      input.workspaceId,
      [evidenceId],
      "superseded",
      { reason: executionPath.reason, queuedForApproval: true },
    );

    return {
      path: "approval_required",
      shouldWrite: false,
      shouldCreatePlayRun: true,
      aggregatedConfidence,
      evidenceId,
    };
  }

  // Path is "accumulate" — evidence stored, waiting for more signal
  return {
    path: "accumulate",
    shouldWrite: false,
    shouldCreatePlayRun: false,
    aggregatedConfidence,
    evidenceId,
  };
}

/**
 * Check if a field should bypass the confidence gate entirely.
 * Used for timestamp fields, counters, and other low-stakes updates.
 */
export function shouldBypassConfidenceGate(
  entityType: ProfileEntityType,
  field: string,
): boolean {
  // Use Record<string, ...> to allow the ProfileEntityType union plus potential extras
  const bypassFields: Record<string, string[]> = {
    person: ["last_contacted_at", "contact_count", "email_count"],
    organization: ["last_contacted_at", "contact_count"],
    work: ["last_activity_at", "updated_at"],
    meeting: ["start_time", "end_time", "attendees", "location"],
    file: ["last_modified_at", "size_bytes", "version"],
    operator: [],
    workspace: [],
    billing_record: ["due_date", "created_at"],
  };

  return bypassFields[entityType]?.includes(field) ?? false;
}
