import "server-only";

/**
 * Gate Pipeline Orchestration (Captures V2 Phase 2).
 *
 * Runs the three-gate filtering model:
 * 1. Pre-ingest: Block obvious noise (no DB, fast)
 * 2. Known-entity: Fast-track to known People/Orgs (indexed DB lookup)
 * 3. Admission: Score unknown senders (relationship checks)
 *
 * Pipeline short-circuits on any decisive result.
 */

import type { CaptureEnvelope } from "../../adapters/types";
import type {
  GatePipelineResult,
  PreIngestGateInput,
  KnownEntityGateInput,
  AdmissionGateInput,
} from "../../types/gate-result";
import {
  runPreIngestGate,
  extractDomainFromEmail,
  extractHeadersFromEnvelope,
} from "./pre-ingest-gate";
import { runKnownEntityGate, checkPriorInteraction } from "./known-entity-gate";
import {
  runAdmissionGate,
  checkCalendarRelationship,
  checkPaymentRelationship,
  checkFileSharing,
} from "./admission-gate";
import { isBlocked } from "../blocklist-manager";
import { extractAdmissionSignals } from "./admission-signals";
import { EMAIL_SCAN_SOURCE_TYPES } from "../../adapters/categories/email";

/**
 * Memory-first email policy: inbound email that passes admission but has no
 * Memory match is held (thin row, hidden from the stream) instead of ingested
 * at full prominence. Only email is held — other capture sources (billing,
 * calendar, storage…) are account-scoped, not sender-scoped, so an unknown
 * "sender" there is meaningless. Mail the user sent is never held: outbound
 * mail powers the reply-driven promotion loop.
 */
function isHoldableEmail(envelope: CaptureEnvelope): boolean {
  if (envelope.captureType !== "message") return false;
  if (!EMAIL_SCAN_SOURCE_TYPES.includes(envelope.sourceType)) return false;
  const extracted = envelope.extracted as Record<string, unknown>;
  return extracted?.isSentByUser !== true;
}

export interface GatePipelineInput {
  workspaceId: string;
  userEmail: string | null;
  envelope: CaptureEnvelope;
}

export async function runGatePipeline(input: GatePipelineInput): Promise<GatePipelineResult> {
  const { workspaceId, userEmail, envelope } = input;

  const senderParticipant = envelope.participants.find((p) => p.role === "from");
  const senderEmail = senderParticipant?.email ?? null;
  const senderName = senderParticipant?.name ?? null;
  const senderDomain = extractDomainFromEmail(senderEmail);

  const result: GatePipelineResult = {
    finalAction: "candidate",
    gateResults: {},
    passedGates: [],
    shouldIngest: true,
  };

  const preIngestInput: PreIngestGateInput = {
    senderEmail,
    senderDomain,
    headers: extractHeadersFromEnvelope(envelope.raw),
    labels: (envelope.extracted as Record<string, unknown>)?.labels as string[] | undefined,
  };

  const preIngestResult = runPreIngestGate(preIngestInput);
  result.gateResults.preIngest = preIngestResult;

  if (preIngestResult) {
    result.finalAction = "drop";
    result.shouldIngest = false;
    return result;
  }
  result.passedGates.push("pre-ingest");

  // Workspace-specific blocklist check (runs after fast pre-ingest, before entity lookup)
  const blocklistCheck = await isBlocked(workspaceId, {
    domain: senderDomain ?? undefined,
    email: senderEmail ?? undefined,
    senderName: senderName ?? undefined,
  });

  if (blocklistCheck.blocked) {
    result.gateResults.blocklist = {
      action: "drop",
      gate: "blocklist",
      reason: blocklistCheck.reason ?? "Blocked by workspace blocklist",
      category: "blocked",
    };
    result.finalAction = "drop";
    result.shouldIngest = false;
    return result;
  }
  result.passedGates.push("blocklist");

  const knownEntityInput: KnownEntityGateInput = {
    workspaceId,
    senderEmail,
    senderDomain,
    senderName,
  };

  const knownEntityResult = await runKnownEntityGate(knownEntityInput);
  result.gateResults.knownEntity = knownEntityResult;

  if (knownEntityResult) {
    result.finalAction = "signal";
    result.targetEntity = knownEntityResult.target;
    result.passedGates.push("known-entity");
    return result;
  }
  result.passedGates.push("known-entity");

  const { threadId, youInitiated, isReply } = extractAdmissionSignals(
    envelope.extracted as Record<string, unknown>
  );

  let hasCalendarMeeting = false;
  let hasPayment = false;
  let hasSharedFile = false;

  if (senderEmail) {
    const [calendar, payment, file] = await Promise.all([
      checkCalendarRelationship(workspaceId, senderEmail),
      checkPaymentRelationship(workspaceId, senderEmail),
      checkFileSharing(workspaceId, senderEmail),
    ]);
    hasCalendarMeeting = calendar;
    hasPayment = payment;
    hasSharedFile = file;
  }

  const admissionInput: AdmissionGateInput = {
    workspaceId,
    userEmail,
    senderEmail,
    threadId,
    isReply,
    youInitiated,
    hasCalendarMeeting,
    hasPayment,
    hasSharedFile,
  };

  const admissionResult = await runAdmissionGate(admissionInput);
  result.gateResults.admission = admissionResult;
  result.passedGates.push("admission");

  // Memory-first: unknown-sender inbound email never reaches the stream —
  // candidate and noise alike go to the held pool. The admission result is
  // kept on the row so discovery can score held senders without re-running
  // the relationship checks. Hard drops already returned above.
  if (isHoldableEmail(envelope)) {
    result.finalAction = "held";
    result.shouldIngest = true;
    return result;
  }

  if (admissionResult.action === "noise") {
    result.finalAction = "noise";
    result.shouldIngest = true;
  } else {
    result.finalAction = "candidate";
    result.shouldIngest = true;
  }

  return result;
}

export { runPreIngestGate, runKnownEntityGate, runAdmissionGate };
export { extractDomainFromEmail, extractHeadersFromEnvelope } from "./pre-ingest-gate";
export { checkPriorInteraction } from "./known-entity-gate";
export {
  checkCalendarRelationship,
  checkPaymentRelationship,
  checkFileSharing,
} from "./admission-gate";
