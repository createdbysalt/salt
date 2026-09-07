/**
 * CREATE Decision Processor
 *
 * Processes CREATE decisions from the Record Capture Criteria Engine.
 *
 * Proposals route into pending_evidence via
 * memory/evidence/route-intake-proposal.ts — never play_runs. Memory is
 * fully autonomous: the accumulated evidence score is the only gate, and
 * crossing the entity's auto bar creates the record directly.
 */

import { routeIntakeProposal } from "@/app/_features/memory/evidence/route-intake-proposal";
import { recordDecisionOutcome } from "../intelligence/record-capture-outcome";
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
   * vocabulary. The primary signal's weight drives score accumulation.
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
  });

  if (routed.outcome === "created") {
    await recordDecisionOutcome(decisionId, "auto_applied", undefined, routed.recordId);
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
