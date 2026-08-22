/**
 * CREATE Decision Processor
 *
 * Processes CREATE decisions from the Record Capture Criteria Engine.
 *
 * Plays canon Phase 2: proposals route into pending_evidence via
 * memory/evidence/route-intake-proposal.ts — never play_runs.
 * Records are created directly only when calibration is earned (P6) AND
 * the proposal carries a relationship-grade signal (P7); everything else
 * lands as status='suggested' and keeps accumulating in the background.
 */

import { routeIntakeProposal } from "@/app/_features/memory/evidence/route-intake-proposal";
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
  /**
   * Signal names backing the decision, in the intake SIGNAL_WEIGHTS
   * vocabulary, used for the P7 worthiness check under eviction. Callers
   * that cannot supply them fail closed: the proposal routes to the
   * suggested lane instead of auto-creating a record.
   */
  signals?: string[];
}

interface ProcessCreateDecisionResult {
  autoApplied: boolean;
  createdRecordId: string | null;
}

/**
 * Process a CREATE decision: route the proposal into pending_evidence.
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
    return { autoApplied: false, createdRecordId: null };
  }

  // Convert MemoryProposal to extracted fields format
  const extractedFields = buildExtractedFields(primaryProposal, senderEmail, senderName, senderDomain);

  const routed = await routeIntakeProposal({
    workspaceId,
    entityType: proposalSurfaceToEntityType(primaryProposal.surface),
    identifier: senderEmail ?? senderDomain ?? "unknown",
    confidence: decision.confidence,
    extractedFields,
    signals: input.signals ?? [],
    captureId: captureEventId,
    autoApply,
  });

  if (routed.outcome === "created") {
    await recordDecisionOutcome(decisionId, "auto_applied", undefined, routed.recordId);

    // Update calibration snapshot (track auto-applies)
    await updateCalibrationSnapshot(workspaceId);

    return { autoApplied: true, createdRecordId: routed.recordId };
  }

  return { autoApplied: false, createdRecordId: null };
}

/**
 * Convert proposal surface to entity type.
 */
function proposalSurfaceToEntityType(
  surface: MemoryProposal["surface"]
): "person" | "organization" | "work" | "meeting" | "resource" | "billing" {
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
      return "resource";
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
