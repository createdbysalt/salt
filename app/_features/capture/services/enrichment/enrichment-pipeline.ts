/**
 * Capture Enrichment Pipeline
 *
 * Orchestrates enrichment of capture events:
 * 1. Extract signals from envelope
 * 2. Match to Memory records
 * 3. Compute play-fit scores
 * 4. Generate suggested actions
 * 5. Store in enriched_metadata column
 */

import type { CaptureEnvelope } from "../../adapters/types";
import type {
  EnrichedMetadata,
  SenderContext,
  RecipientsContext,
  ThreadContext,
  AttachmentMeta,
  SuggestedAction,
  RecordCaptureDecisionMeta,
  EmailClassificationMeta,
} from "./types";
import {
  classifyEmail,
  type EmailClassificationInput,
  type ClassificationContext,
  type SenderReputation,
} from "../email-classification";
import { EMPTY_ENRICHED_METADATA } from "./types";
import { extractCaptureSignals } from "./signal-extractor";
import { findMatchingRecords } from "./record-matcher";
import { computePlayFitScores } from "./play-fit-scorer";
import {
  evaluateRecordCapture,
  buildRecordCaptureInput,
  type RecordCaptureDecision,
} from "./record-capture-criteria";
import type { AdmissionSignal } from "../../types/gate-result";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import { loadSenderReputation } from "../sender-reputation";

import type { CaptureSenderKind } from "../../types/sender-profiles";
import { logRecordCaptureDecision } from "../intelligence/record-capture-outcome";
import { processCreateDecision } from "./create-decision-processor";
import {
  dispatchCaptureSignals,
  shouldDispatchCaptureSignals,
} from "./dispatch-capture-signals";

interface EnrichmentContext {
  workspaceId: string;
  userEmail: string | null;
  captureId: string | null;
  /** Admission gate signals (from gate_result) */
  admissionSignals?: AdmissionSignal[];
  admissionScore?: number;
  /** Sender classification from capture_sender_profiles */
  senderClassification?: CaptureSenderKind | "unknown";
}

/**
 * Convert criteria engine decision to metadata format.
 */
function toRecordCaptureDecisionMeta(
  decision: RecordCaptureDecision
): RecordCaptureDecisionMeta {
  const base: RecordCaptureDecisionMeta = {
    tier: decision.tier,
    reason: decision.reason,
  };

  if (decision.tier === "create") {
    base.confidence = decision.confidence;
  } else if (decision.tier === "watch") {
    base.watch_type = decision.watchType;
    base.watch_target = decision.target;
    base.initial_signals = decision.initialSignals;
  }

  return base;
}

/**
 * Extract sender context from envelope.
 */
function extractSenderContext(envelope: CaptureEnvelope): SenderContext | undefined {
  const fromParticipant = envelope.participants.find((p) => p.role === "from");
  if (!fromParticipant) return undefined;

  const extracted = envelope.extracted as Record<string, unknown>;

  return {
    email: fromParticipant.email,
    name: fromParticipant.name,
    classification: "unknown",
    confidence: 50,
    relationship_strength: "new",
  };
}

/**
 * Extract recipients context from envelope.
 */
function extractRecipientsContext(envelope: CaptureEnvelope): RecipientsContext | undefined {
  const extracted = envelope.extracted as Record<string, unknown>;

  const to = (extracted.to as string[]) ?? [];
  const cc = (extracted.cc as string[]) ?? [];
  const bcc = (extracted.bcc as string[]) ?? [];

  if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
    const toParticipants = envelope.participants
      .filter((p) => p.role === "to")
      .map((p) => p.email)
      .filter((e): e is string => e !== null);

    const ccParticipants = envelope.participants
      .filter((p) => p.role === "cc")
      .map((p) => p.email)
      .filter((e): e is string => e !== null);

    return {
      to: toParticipants,
      cc: ccParticipants,
      bcc: [],
    };
  }

  return { to, cc, bcc };
}

/**
 * Extract thread context from envelope.
 */
function extractThreadContext(envelope: CaptureEnvelope): ThreadContext | undefined {
  const extracted = envelope.extracted as Record<string, unknown>;

  return {
    is_reply: (extracted.is_reply as boolean) ?? false,
    thread_id: envelope.threadId,
    message_count: extracted.message_count as number | undefined,
    in_reply_to: extracted.in_reply_to as string | undefined,
  };
}

/**
 * Extract attachment metadata from envelope.
 */
function extractAttachments(envelope: CaptureEnvelope): AttachmentMeta[] {
  const extracted = envelope.extracted as Record<string, unknown>;
  const attachments = extracted.attachments as AttachmentMeta[] | undefined;
  return attachments ?? [];
}

/**
 * Generate suggested actions based on signals, matches, and play-fit scores.
 */
function generateSuggestedActions(
  signals: string[],
  _linkedRecords: { surface: string; entity_id: string }[],
  envelope: CaptureEnvelope,
  playFitScores: Record<string, { score: number; reason: string }>
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  // Noise-classified email gets exactly one suggestion: dismiss it. Never
  // route noise to plays or prompt a reply.
  if (signals.includes("email_classified_noise")) {
    return [
      {
        action: "dismiss_noise",
        confidence: 85,
        reason: "Classified as noise",
      },
    ];
  }

  // Add route_to_play actions for high-scoring plays
  const sortedPlays = Object.entries(playFitScores)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 2); // Top 2 plays

  for (const [slug, fit] of sortedPlays) {
    if (fit.score >= 50) {
      actions.push({
        action: "route_to_play",
        play_slug: slug,
        confidence: fit.score,
        reason: fit.reason,
      });
    }
  }

  // Ask Salt action for emails that need attention
  if (signals.includes("capture_email_received") && !signals.includes("is_automated_sender")) {
    const promptHint = signals.includes("is_reply")
      ? "Draft a reply to this email"
      : "What should I do with this email?";

    actions.push({
      action: "ask_salt",
      prompt_hint: promptHint,
      confidence: signals.includes("is_reply") ? 75 : 70,
      reason: signals.includes("is_reply")
        ? "Reply in thread - likely needs response"
        : "Email from contact - may need response",
    });
  }

  // Dismiss noise for automated/marketing
  if (signals.includes("is_automated_sender") || signals.includes("is_marketing_email")) {
    actions.push({
      action: "dismiss_noise",
      confidence: 80,
      reason: "Automated or marketing email",
    });
  }

  return actions.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
}

/**
 * Evaluate record capture decision from enrichment context.
 * Returns undefined if admission signals are not available.
 */
function evaluateRecordCaptureDecision(
  context: EnrichmentContext,
  linkedRecords: { surface: string; entity_id: string; confidence: number }[],
  senderContext: SenderContext | undefined,
  contentSignals?: string[]
): RecordCaptureDecisionMeta | undefined {
  // Skip if no admission signals (gate hasn't run or wasn't stored)
  if (!context.admissionSignals || context.admissionScore === undefined) {
    return undefined;
  }

  const input = buildRecordCaptureInput({
    admissionScore: context.admissionScore,
    admissionSignals: context.admissionSignals,
    linkedRecords: linkedRecords.map((r) => ({
      surface: r.surface as "people" | "orgs" | "work" | "billing" | "files" | "meetings" | "conversations" | "me",
      entity_id: r.entity_id,
      entity_label: "",
      match_type: "email" as const,
      confidence: r.confidence,
    })),
    senderClassification: context.senderClassification ?? "unknown",
    senderEmail: senderContext?.email ?? null,
    senderName: senderContext?.name ?? null,
    contentSignals,
  });

  const decision = evaluateRecordCapture(input);
  return toRecordCaptureDecisionMeta(decision);
}

/**
 * Check if this capture is an email source type.
 */
function isEmailCapture(sourceType: string): boolean {
  return sourceType === "gmail" || sourceType === "outlook" || sourceType === "yahoo_mail";
}

/**
 * Build email classification input from envelope.
 */
function buildEmailClassificationInput(
  envelope: CaptureEnvelope
): EmailClassificationInput | null {
  const extracted = envelope.extracted as Record<string, unknown>;
  const fromParticipant = envelope.participants.find((p) => p.role === "from");

  if (!fromParticipant?.email) return null;

  const toEmails = envelope.participants
    .filter((p) => p.role === "to")
    .map((p) => p.email)
    .filter((e): e is string => e !== null);

  const ccEmails = envelope.participants
    .filter((p) => p.role === "cc")
    .map((p) => p.email)
    .filter((e): e is string => e !== null);

  const attachments = (extracted.attachments as Array<{ name: string }>) ?? [];

  return {
    messageId: envelope.externalId,
    threadId: envelope.threadId,
    subject: envelope.title ?? "",
    bodyPreview: (extracted.body_preview as string) ?? (extracted.snippet as string) ?? "",
    fromEmail: fromParticipant.email,
    fromName: fromParticipant.name ?? null,
    toEmails,
    ccEmails,
    receivedAt: envelope.occurredAt ?? new Date().toISOString(),
    hasAttachments: attachments.length > 0,
    attachmentNames: attachments.map((a) => a.name),
    headers: (extracted.headers as Record<string, string>) ?? {},
    labels: (extracted.labels as string[]) ?? [],
    isReply: (extracted.is_reply as boolean) ?? false,
    threadDepth: (extracted.message_count as number) ?? 0,
  };
}

/**
 * Build classification context from enrichment context.
 */
function buildClassificationContext(
  context: EnrichmentContext,
  linkedRecords: Array<{ surface: string; entity_id: string }>,
  senderProfiles: Map<string, SenderReputation>
): ClassificationContext {
  const clientEmails = new Set<string>();
  const clientDomains = new Set<string>();

  for (const record of linkedRecords) {
    if (record.surface === "people" || record.surface === "orgs") {
      // In a full implementation, we'd look up the email/domain from the entity
      // For now, we rely on sender profiles loaded elsewhere
    }
  }

  return {
    workspaceId: context.workspaceId,
    operatorEmail: context.userEmail ?? "",
    workspaceDomains: [],
    clientEmails,
    clientDomains,
    vipEmails: new Set(),
    senderProfiles,
  };
}

/**
 * Run email classification and return metadata + signals.
 */
async function runEmailClassification(
  envelope: CaptureEnvelope,
  context: EnrichmentContext,
  linkedRecords: Array<{ surface: string; entity_id: string }>
): Promise<{ meta: EmailClassificationMeta; signals: string[] } | null> {
  if (!isEmailCapture(envelope.sourceType)) return null;

  const input = buildEmailClassificationInput(envelope);
  if (!input) return null;

  // Learned sender reputation (Phase C2): the classifier keys first-contact
  // and high-engagement signals off this map — an empty map made every
  // sender look like first contact forever.
  const senderProfiles = new Map<string, SenderReputation>();
  try {
    const reputation = await loadSenderReputation(
      context.workspaceId,
      input.fromEmail
    );
    if (reputation) {
      senderProfiles.set(input.fromEmail.toLowerCase(), reputation);
    }
  } catch (error) {
    console.warn(
      "[enrichment-pipeline] sender reputation lookup failed:",
      error instanceof Error ? error.message : error
    );
  }

  const classificationContext = buildClassificationContext(
    context,
    linkedRecords,
    senderProfiles
  );
  const classification = classifyEmail(input, classificationContext);

  const meta: EmailClassificationMeta = {
    type: classification.type,
    type_confidence: classification.typeConfidence,
    category: classification.category,
    category_confidence: classification.categoryConfidence,
    priority_score: classification.priorityScore,
    priority_tier: classification.priorityTier,
    urgency_level: classification.urgencyLevel,
    urgency_markers: classification.urgencyMarkers,
    triage_action: classification.triageAction,
    signals: classification.signals,
  };

  return { meta, signals: classification.signals };
}

/**
 * Enrich a capture event with signals, linked records, and suggested actions.
 */
export async function enrichCapture(
  envelope: CaptureEnvelope,
  context: EnrichmentContext
): Promise<EnrichedMetadata> {
  const signals = extractCaptureSignals(envelope, context.userEmail);

  const linkedRecords = await findMatchingRecords(envelope, context.captureId, {
    workspaceId: context.workspaceId,
    userEmail: context.userEmail,
  });

  // Run email classification for email captures
  const emailClassificationResult = await runEmailClassification(envelope, context, linkedRecords);

  // Merge email classification signals with extracted signals
  const allSignals = emailClassificationResult
    ? [...signals, ...emailClassificationResult.signals]
    : signals;

  // Compute play-fit scores based on all signals (including classification)
  const playFitScores = computePlayFitScores(allSignals);

  const suggestedActions = generateSuggestedActions(allSignals, linkedRecords, envelope, playFitScores);

  // Evaluate record capture criteria (CREATE/WATCH/NOTHING)
  // Pass content signals from email classification to influence CREATE/WATCH/NOTHING
  const senderContext = extractSenderContext(envelope);
  const contentSignals = emailClassificationResult?.signals;
  const recordCaptureDecision = evaluateRecordCaptureDecision(
    context,
    linkedRecords,
    senderContext,
    contentSignals
  );

  const extracted = envelope.extracted as Record<string, unknown>;
  const deepLink = (extracted.deep_link as string) ?? null;

  const metadata: EnrichedMetadata = {
    sender: senderContext,
    recipients: extractRecipientsContext(envelope),
    thread: extractThreadContext(envelope),
    attachments: extractAttachments(envelope),
    signals_matched: allSignals,
    linked_records: linkedRecords,
    play_fit: playFitScores,
    plays_dispatched: [], // Populated by trigger-dispatch after enrichment
    watches_triggered: [], // Populated by known-entity-gate during ingest
    suggested_actions: suggestedActions,
    record_capture_decision: recordCaptureDecision,
    email_classification: emailClassificationResult?.meta,
    deep_link: deepLink,
    enriched_at: new Date().toISOString(),
  };

  return metadata;
}

/**
 * Enrich and persist enriched_metadata for a capture event.
 */
export async function enrichAndPersist(
  captureEventId: string,
  envelope: CaptureEnvelope,
  context: Omit<EnrichmentContext, "captureId">
): Promise<EnrichedMetadata> {
  const fullContext = {
    ...context,
    captureId: captureEventId,
  };

  const metadata = await enrichCapture(envelope, fullContext);

  // Persist the enriched metadata (EnrichedMetadata is an interface, so it
  // needs a boundary cast into the Json column)
  const supabase = createAdminClient();
  await supabase
    .from("capture_events")
    .update({ enriched_metadata: metadata as unknown as Json })
    .eq("id", captureEventId);

  // Dispatch capture signals to playbook triggers (Connections, Notes, ...)
  // for each linked record. With no linked records, pending_evidence
  // candidates matched by participant email still get the signal via Memory
  // Care (Memory Sourcing Overhaul, Phase 4). Fire-and-forget: dispatch
  // must never block or fail ingest.
  if (shouldDispatchCaptureSignals(metadata.signals_matched)) {
    const userEmail = context.userEmail?.toLowerCase() ?? null;
    dispatchCaptureSignals({
      workspaceId: context.workspaceId,
      captureId: captureEventId,
      signals: metadata.signals_matched,
      linkedRecords: metadata.linked_records,
      participantEmails: envelope.participants
        .map((p) => p.email)
        .filter(
          (email): email is string =>
            Boolean(email) && email!.toLowerCase() !== userEmail,
        ),
    }).catch((err) => {
      console.warn(
        "[enrichment-pipeline] Capture signal dispatch failed for %s:",
        captureEventId,
        err instanceof Error ? err.message : err
      );
    });
  }

  // Log decision for calibration (async, non-blocking)
  if (metadata.record_capture_decision && context.admissionSignals) {
    const senderContext = metadata.sender;
    const decision = metadata.record_capture_decision;

    // Reconstruct the full decision for logging (include content signals)
    const contentSignals = metadata.email_classification?.signals;
    const input = buildRecordCaptureInput({
      admissionScore: context.admissionScore ?? 0,
      admissionSignals: context.admissionSignals,
      linkedRecords: metadata.linked_records.map((r) => ({
        surface: r.surface,
        entity_id: r.entity_id,
        entity_label: r.entity_label,
        match_type: r.match_type,
        confidence: r.confidence,
      })),
      senderClassification: context.senderClassification ?? "unknown",
      senderEmail: senderContext?.email ?? null,
      senderName: senderContext?.name ?? null,
      contentSignals,
    });

    const fullDecision = evaluateRecordCapture(input);

    // Log decision for calibration
    const decisionId = await logRecordCaptureDecision({
      workspaceId: context.workspaceId,
      captureEventId,
      decision: fullDecision,
      admissionScore: context.admissionScore,
      admissionSignals: context.admissionSignals,
      hadLinkedRecords: metadata.linked_records.length > 0,
      senderClassification: context.senderClassification,
      senderEmail: senderContext?.email,
      senderDomain: input.senderDomain,
    });

    // Process CREATE decisions - create plays for approval queue
    if (fullDecision.tier === "create" && decisionId) {
      processCreateDecision({
        workspaceId: context.workspaceId,
        captureEventId,
        decision: fullDecision,
        decisionId,
        senderEmail: senderContext?.email ?? null,
        senderName: senderContext?.name ?? null,
        senderDomain: input.senderDomain,
      }).catch((err) => {
        console.warn(
          "[enrichment-pipeline] Failed to process CREATE decision for %s:",
          captureEventId,
          err instanceof Error ? err.message : err
        );
      });
    }
  }

  return metadata;
}

/** Narrow a Json column value to the envelope's record shape. */
function jsonToRecord(value: Json | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/**
 * Re-enrich an existing capture event (e.g., when new signals become available).
 */
export async function reenrichCapture(
  captureEventId: string,
  workspaceId: string,
  userEmail: string | null
): Promise<EnrichedMetadata | null> {
  const supabase = createAdminClient();

  const { data: capture } = await supabase
    .from("capture_events")
    .select("id, source_type, raw_payload, extracted_data")
    .eq("id", captureEventId)
    .single();

  if (!capture) return null;

  const envelope: CaptureEnvelope = {
    sourceType: capture.source_type,
    captureType: "message",
    externalId: captureEventId,
    title: null,
    occurredAt: null,
    participants: [],
    threadId: null,
    extracted: jsonToRecord(capture.extracted_data),
    raw: jsonToRecord(capture.raw_payload),
    noise: null,
  };

  return enrichAndPersist(captureEventId, envelope, { workspaceId, userEmail });
}
