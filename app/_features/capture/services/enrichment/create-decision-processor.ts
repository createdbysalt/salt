/**
 * CREATE Decision Processor
 *
 * Processes CREATE decisions from the Record Capture Criteria Engine
 * and creates play_runs for the approval queue.
 *
 * Supports auto-apply when workspace has earned it through calibration.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { createIntakePlayRun } from "@/app/_features/plays/services/create-intake-play-run";
import {
  shouldAutoApply,
  recordDecisionOutcome,
  updateCalibrationSnapshot,
} from "../intelligence/record-capture-outcome";
import type { CreateDecision } from "./record-capture-criteria";
import type { MemoryProposal } from "../../types/memory-proposals";

interface ProcessCreateDecisionInput {
  workspaceId: string;
  captureEventId: string;
  decision: CreateDecision;
  decisionId: string;
  senderEmail: string | null;
  senderName: string | null;
  senderDomain: string | null;
}

interface ProcessCreateDecisionResult {
  playRunId: string | null;
  autoApplied: boolean;
  createdRecordId: string | null;
}

/**
 * Process a CREATE decision and create a play for the approval queue.
 */
export async function processCreateDecision(
  input: ProcessCreateDecisionInput
): Promise<ProcessCreateDecisionResult> {
  const { workspaceId, captureEventId, decision, decisionId, senderEmail, senderName, senderDomain } = input;

  // Check if we should auto-apply this proposal
  const autoApply = await shouldAutoApply(workspaceId, decision.confidence);

  // Process each proposal in the decision
  // For simplicity, we take the first (highest priority) proposal
  const primaryProposal = decision.proposals[0];
  if (!primaryProposal) {
    return { playRunId: null, autoApplied: false, createdRecordId: null };
  }

  // Convert MemoryProposal to extracted fields format
  const extractedFields = buildExtractedFields(primaryProposal, senderEmail, senderName, senderDomain);

  // Create the play run
  const result = await createIntakePlayRun({
    workspaceId,
    evidenceId: captureEventId, // Use capture event ID as evidence reference
    entityType: proposalSurfaceToEntityType(primaryProposal.surface),
    identifier: senderEmail ?? senderDomain ?? "unknown",
    confidence: decision.confidence,
    extractedFields,
    signalCount: 1, // Single capture
    autoCreate: autoApply,
  });

  if (!result.ok) {
    console.error("[create-decision-processor] Failed to create play:", result.error);
    return { playRunId: null, autoApplied: false, createdRecordId: null };
  }

  // Record the outcome
  if (autoApply && result.autoHandled) {
    await recordDecisionOutcome(
      decisionId,
      "auto_applied",
      undefined,
      result.createdRecordId
    );

    // Update calibration snapshot (track auto-applies)
    await updateCalibrationSnapshot(workspaceId);
  }

  return {
    playRunId: result.playRunId,
    autoApplied: result.autoHandled,
    createdRecordId: result.createdRecordId ?? null,
  };
}

/**
 * Convert proposal surface to entity type.
 */
function proposalSurfaceToEntityType(
  surface: MemoryProposal["surface"]
): "person" | "organization" | "work" | "meeting" | "file" | "billing" {
  switch (surface) {
    case "people":
      return "person";
    case "orgs":
      return "organization";
    case "work":
      return "work";
    case "meetings":
      return "meeting";
    case "files":
      return "file";
    case "billing":
      return "billing";
    default:
      return "person";
  }
}

/**
 * Build extracted fields from proposal hints.
 */
function buildExtractedFields(
  proposal: MemoryProposal,
  senderEmail: string | null,
  senderName: string | null,
  senderDomain: string | null
): Record<string, { value: string; confidence: number; sources: string[] }> {
  const fields: Record<string, { value: string; confidence: number; sources: string[] }> = {};

  // Add name from hint or sender
  const name = proposal.hint.name ?? senderName;
  if (name) {
    fields.name = { value: name, confidence: proposal.confidence, sources: [] };
  }

  // Add email for person proposals
  if (proposal.surface === "people" && senderEmail) {
    fields.email = { value: senderEmail, confidence: proposal.confidence, sources: [] };
  }

  // Add domain for org proposals
  if (proposal.surface === "orgs") {
    const domain = proposal.hint.domain ?? senderDomain;
    if (domain) {
      fields.domain = { value: domain, confidence: proposal.confidence, sources: [] };
    }
  }

  return fields;
}
