import "server-only";

/**
 * Gate Pipeline Orchestration (Captures V2 Phase 2).
 *
 * Explicit connector rules run before the heuristic gates (Connector Rules
 * & Learning, P2): deny > allow > heuristics. Then the three-gate model:
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
  runPreIngestGateDetailed,
  extractDomainFromEmail,
  extractHeadersFromEnvelope,
} from "./pre-ingest-gate";
import {
  DEFAULT_GATE_POLICY,
  type ResolvedGatePolicy,
} from "./gate-policy";
import { runKnownEntityGate } from "./known-entity-gate";
import {
  runAdmissionGate,
  checkCalendarRelationship,
  checkPaymentRelationship,
  checkFileSharing,
} from "./admission-gate";
import { checkRules } from "../rules-manager";
import { extractFeedbackEntityForEnvelope } from "../../adapters/feedback-entity";
import { ruleMatchCandidatesForEnvelope } from "../../adapters/rule-match-candidates";
import { loadEntityReputation } from "../entity-profiles";
import { getCategoryForConnector } from "@/app/_lib/composio/enrichment/registry";
import { extractAdmissionSignals } from "./admission-signals";
import { classifyColdInboundIntent, intentEarnsAdmission } from "./cold-intent";
import { getCustomizePromptBlock } from "@/app/_features/memory/customize/queries";
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
  /**
   * Lane 1 discriminator: pay for a cold-inbound intent read so a genuine
   * inquiry from an unknown sender earns REAL-TIME admission instead of
   * waiting in the held pool for the discovery cron. Real-time paths
   * (webhook) set this; backfills never do — historical mail is not urgent
   * and the discovery pass already covers held senders.
   */
  coldIntentRead?: boolean;
  /**
   * Workspace gate policy (Customize surfaces, S3). Callers load it via
   * `getCaptureGatePolicy`; omitted = defaults (current behavior).
   */
  gatePolicy?: ResolvedGatePolicy;
}

export async function runGatePipeline(input: GatePipelineInput): Promise<GatePipelineResult> {
  const { workspaceId, userEmail, envelope } = input;
  const gatePolicy = input.gatePolicy ?? DEFAULT_GATE_POLICY;

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

  // Connector rules run first (Connector Rules & Learning, P2). Precedence:
  // explicit deny > explicit allow > heuristics. A deny drops; an allow
  // admits at full prominence (signal), bypassing pre-ingest heuristics,
  // the known-entity lookup, admission scoring, and the memory-first hold.
  const feedbackEntity = await extractFeedbackEntityForEnvelope(envelope);
  const ruleCheck = await checkRules(workspaceId, {
    provider: envelope.sourceType,
    entity: feedbackEntity,
    patternCandidates: senderName ? [senderName] : [],
    entityCandidates: ruleMatchCandidatesForEnvelope(envelope),
  });

  if (ruleCheck.verdict === "deny") {
    result.gateResults.rules = {
      action: "drop",
      gate: "rules",
      reason: ruleCheck.rule?.reason ?? "Blocked by workspace rule",
      category: "blocked",
    };
    result.finalAction = "drop";
    result.shouldIngest = false;
    return result;
  }

  if (ruleCheck.verdict === "allow") {
    result.gateResults.rules = {
      action: "signal",
      gate: "rules",
      reason: ruleCheck.rule?.reason ?? "Allowed by workspace rule",
    };
    result.finalAction = "signal";
    result.shouldIngest = true;
    return result;
  }
  result.passedGates.push("rules");

  const preIngestInput: PreIngestGateInput = {
    senderEmail,
    senderDomain,
    headers: extractHeadersFromEnvelope(envelope.raw),
    labels: (envelope.extracted as Record<string, unknown>)?.labels as string[] | undefined,
  };

  const preIngest = runPreIngestGateDetailed(preIngestInput, gatePolicy);
  result.gateResults.preIngest = preIngest.drop;

  if (preIngest.drop) {
    result.finalAction = "drop";
    result.shouldIngest = false;
    return result;
  }
  result.passedGates.push("pre-ingest");

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

  // Learned reputation for the capture's entity (P6): corrections and
  // admission outcomes accrue here, and this read repairs the dead end
  // where reputation_score was written but never read by any decision path.
  let entityReputation: number | null = null;
  if (feedbackEntity) {
    try {
      const category = await getCategoryForConnector(envelope.sourceType);
      if (category) {
        const reputation = await loadEntityReputation(workspaceId, {
          provider: envelope.sourceType,
          category,
          entity: feedbackEntity,
        });
        entityReputation = reputation?.score ?? null;
      }
    } catch (error) {
      console.error("[gate-pipeline] entity reputation lookup failed:", error);
    }
  }

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
    entityReputation,
  };

  const admissionResult = await runAdmissionGate(admissionInput);
  result.gateResults.admission = admissionResult;
  result.passedGates.push("admission");

  // Memory-first: unknown-sender inbound email never reaches the stream —
  // candidate and noise alike go to the held pool. The admission result is
  // kept on the row so discovery can score held senders without re-running
  // the relationship checks. Hard drops already returned above.
  //
  // Lane 1 exception (the discriminator): on real-time paths, a paid intent
  // read runs on this pre-ingest survivor. A genuine inquiry earns immediate
  // admission — the booking email must not wait for the discovery cron. The
  // read's outcome is recorded either way so Activity can answer "why didn't
  // Salt catch this?" and misses are queryable (failure mode #1 telemetry).
  //
  // Gate policy (S3) governs this hold:
  // - strangers = dropped: explicit workspace choice to never see stranger
  //   mail — drop before paying for a cold-intent read.
  // - strangers = let_in: no hold; stranger mail lands at full prominence.
  // - automatedSenders = let_in: an automated detection the workspace chose
  //   to let in bypasses the hold (receipts land at full prominence).
  if (isHoldableEmail(envelope)) {
    if (gatePolicy.email.strangers === "dropped") {
      result.gateResults.policy = {
        action: "drop",
        gate: "policy",
        reason: "Workspace policy: mail from strangers is dropped",
        category: "blocked",
      };
      result.finalAction = "drop";
      result.shouldIngest = false;
      return result;
    }

    const bypassHold =
      gatePolicy.email.strangers === "let_in" ||
      (preIngest.suppressed !== null &&
        gatePolicy.email.automatedSenders === "let_in");

    if (!bypassHold) {
      if (input.coldIntentRead) {
        const extracted = envelope.extracted as Record<string, unknown>;
        // Track A (Phase M4): the workspace's person/work customizations
        // steer the paid intent read. Loaded only on this path; a read
        // failure yields null and the read proceeds without them.
        const customizeContext = await getCustomizePromptBlock(workspaceId, [
          "person",
          "work",
        ]).catch(() => null);
        const intent = await classifyColdInboundIntent({
          workspaceId,
          senderEmail,
          senderName,
          subject: (extracted?.subject as string | null) ?? envelope.title,
          snippet: (extracted?.snippet as string | null) ?? null,
          customizeContext,
        });
        result.coldIntent = intent;

        if (intentEarnsAdmission(intent)) {
          const intentSignal = {
            type: "intent_inquiry" as const,
            weight: 40,
            evidence: intent.reason,
          };
          result.gateResults.admission =
            admissionResult.action === "candidate"
              ? {
                  ...admissionResult,
                  confidence: Math.min(100, admissionResult.confidence + 40),
                  signals: [...admissionResult.signals, intentSignal],
                  reason: `${admissionResult.reason}; genuine inquiry: ${intent.reason}`,
                }
              : {
                  action: "candidate",
                  gate: "admission",
                  confidence: Math.round(intent.confidence * 100),
                  signals: [intentSignal],
                  reason: `Genuine inquiry: ${intent.reason}`,
                };
          result.finalAction = "candidate";
          result.shouldIngest = true;
          return result;
        }
      }

      result.finalAction = "held";
      result.shouldIngest = true;
      return result;
    }
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
export {
  checkCalendarRelationship,
  checkPaymentRelationship,
  checkFileSharing,
} from "./admission-gate";
