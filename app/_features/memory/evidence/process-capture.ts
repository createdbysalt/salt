/**
 * Process Capture for Evidence
 *
 * Called after a capture is ingested to detect signals and accumulate evidence.
 * This is the main integration point with the capture pipeline.
 *
 * Internal module, not a server action: it runs in webhook/cron contexts
 * with the admin client and must not be client-reachable (Sources plan 6.3
 * / INV-3).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { Json } from "@/app/_lib/supabase/database.types";
import {
  classifyEmailCapture,
  classifyMeetingCapture,
  type DetectedSignal,
  type EmailCaptureData,
  type MeetingCaptureData,
} from "./classifier";
import { addSignalToEvidence } from "./actions";
import { routeIntakeProposal } from "./route-intake-proposal";
import {
  logOddsToProbability,
  probabilityToLogOdds,
  SIGNAL_WEIGHTS,
} from "@/app/_features/memory/care/intake";
import { shouldAutoApply } from "@/app/_features/capture/services/intelligence/record-capture-outcome";
import type { AddSignalResult, ExtractedFieldValue } from "./types";

function toRecord(value: Json | null): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

/**
 * Process a capture event and accumulate evidence for potential new records.
 *
 * Returns the signals detected and the actions taken (watch/suggest/auto/dismiss).
 */
export async function processCaptureForEvidence(
  captureId: string
): Promise<{
  processed: boolean;
  signalsDetected: number;
  results: AddSignalResult[];
}> {
  const admin = createAdminClient();

  // Get the capture
  const { data: capture, error } = await admin
    .from("capture_events")
    .select(
      "id, workspace_id, capture_type, source_type, source_external_id, extracted_data, raw_payload"
    )
    .eq("id", captureId)
    .single();

  if (error || !capture) {
    return { processed: false, signalsDetected: 0, results: [] };
  }

  const workspaceId = capture.workspace_id;
  const captureType = capture.capture_type;
  const extracted = toRecord(capture.extracted_data);
  const raw = toRecord(capture.raw_payload);

  let signals: Awaited<ReturnType<typeof classifyEmailCapture>> = [];

  // Classify based on capture type. Email adapters emit message/thread
  // captures (there is no "email" capture_type), so gate on the mail sources.
  const isEmailSource =
    capture.source_type === "gmail" || capture.source_type === "outlook";

  if (isEmailSource && (captureType === "message" || captureType === "thread")) {
    const emailData = extractEmailData(extracted, raw);
    if (emailData) {
      signals = await classifyEmailCapture(workspaceId, emailData, captureId);
    }
  } else if (captureType === "meeting") {
    const meetingData = extractMeetingData(extracted, raw, {
      externalId:
        capture.source_external_id ??
        (raw.eventId as string | undefined) ??
        (raw.bookingId as string | undefined),
      provider: capture.source_type,
    });
    if (meetingData) {
      signals = await classifyMeetingCapture(workspaceId, meetingData, captureId);
    }
  }

  if (signals.length === 0) {
    return { processed: true, signalsDetected: 0, results: [] };
  }

  // Add each signal to evidence. Meeting-entity signals route through
  // routeIntakeProposal (P6 calibration gate, same as CREATE decisions);
  // every other entity type keeps the accumulate-only path.
  const results: AddSignalResult[] = [];
  for (const signal of signals) {
    if (signal.entityType === "meeting") {
      results.push(await routeMeetingSignal(workspaceId, signal, captureId));
      continue;
    }
    const result = await addSignalToEvidence({
      workspaceId,
      entityType: signal.entityType,
      identifier: signal.identifier,
      signal: signal.signal,
      captureId,
      extractedData: signal.extractedData,
    });
    results.push(result);
  }

  return {
    processed: true,
    signalsDetected: signals.length,
    results,
  };
}

/**
 * Route a meeting-entity signal into the intake tier: the signal's weight
 * becomes the proposal confidence, and the workspace's earned calibration
 * (shouldAutoApply) decides between direct creation and the suggested lane.
 */
async function routeMeetingSignal(
  workspaceId: string,
  signal: DetectedSignal,
  captureId: string
): Promise<AddSignalResult> {
  const confidence = logOddsToProbability(SIGNAL_WEIGHTS[signal.signal] ?? 0);
  const autoApply = await shouldAutoApply(workspaceId, confidence);

  const extractedFields: Record<string, ExtractedFieldValue> = {};
  for (const [key, value] of Object.entries(signal.extractedData)) {
    extractedFields[key] = { value, confidence, sources: [captureId] };
  }

  const routed = await routeIntakeProposal({
    workspaceId,
    entityType: signal.entityType,
    identifier: signal.identifier,
    confidence,
    extractedFields,
    signals: [signal.signal],
    captureId,
    autoApply,
  });

  return {
    evidenceId: routed.evidenceId,
    newScore: probabilityToLogOdds(confidence),
    previousScore: 0,
    action:
      routed.outcome === "created"
        ? "auto"
        : routed.outcome === "suggested"
          ? "suggest"
          : "watch",
    isNew: false,
  };
}

/**
 * Batch process multiple captures for evidence.
 */
export async function batchProcessCapturesForEvidence(
  captureIds: string[]
): Promise<{
  processed: number;
  signalsDetected: number;
  suggested: number;
}> {
  let processed = 0;
  let signalsDetected = 0;
  let suggested = 0;

  for (const captureId of captureIds) {
    const result = await processCaptureForEvidence(captureId);
    if (result.processed) {
      processed++;
      signalsDetected += result.signalsDetected;
      suggested += result.results.filter((r) => r.action === "suggest").length;
    }
  }

  return { processed, signalsDetected, suggested };
}

// =============================================================================
// DATA EXTRACTION HELPERS
// =============================================================================

function extractEmailData(
  extracted: Record<string, unknown>,
  raw: Record<string, unknown>
): EmailCaptureData | null {
  // Try extracted data first
  const from =
    (extracted.from as string) ||
    (extracted.sender as string) ||
    (raw.from as string) ||
    (raw.sender as string);

  if (!from) return null;

  const to = normalizeRecipients(
    extracted.to || extracted.recipients || raw.to || raw.recipients
  );
  const cc = normalizeRecipients(extracted.cc || raw.cc);

  return {
    from,
    to,
    cc: cc.length > 0 ? cc : undefined,
    subject: (extracted.subject as string) || (raw.subject as string),
    body: (extracted.body as string) || (raw.body as string),
    signature: (extracted.signature as string) || (raw.signature as string),
    hasAttachments:
      Boolean(extracted.attachments) ||
      Boolean(raw.attachments) ||
      (Array.isArray(extracted.attachments) && extracted.attachments.length > 0),
    isReply:
      Boolean(extracted.is_reply) ||
      Boolean(raw.is_reply) ||
      (typeof extracted.subject === "string" &&
        extracted.subject.toLowerCase().startsWith("re:")),
    threadId: (extracted.thread_id as string) || (raw.thread_id as string),
  };
}

function extractMeetingData(
  extracted: Record<string, unknown>,
  raw: Record<string, unknown>,
  provenance: { externalId?: string; provider?: string } = {}
): MeetingCaptureData | null {
  const title =
    (extracted.title as string) ||
    (extracted.summary as string) ||
    (raw.title as string) ||
    (raw.summary as string);

  if (!title) return null;

  const attendees = normalizeRecipients(
    extracted.attendees || raw.attendees || []
  );
  // Calendar adapters emit organizer_email; `organizer` covers legacy shapes.
  const organizer =
    (extracted.organizer_email as string) ||
    (extracted.organizer as string) ||
    (raw.organizer_email as string) ||
    (raw.organizer as string) ||
    "";
  const startTime =
    (extracted.start_time as string) ||
    (extracted.start as string) ||
    (raw.start_time as string) ||
    (raw.start as string) ||
    "";

  return {
    title,
    attendees,
    organizer,
    startTime,
    endTime:
      (extracted.end_time as string) ||
      (extracted.end as string) ||
      (raw.end_time as string) ||
      (raw.end as string),
    location: (extracted.location as string) || (raw.location as string),
    // Calendar adapters emit meeting_link; meeting_url/hangoutLink are legacy.
    meetingUrl:
      (extracted.meeting_link as string) ||
      (extracted.meeting_url as string) ||
      (extracted.hangoutLink as string) ||
      (raw.meeting_link as string) ||
      (raw.meeting_url as string) ||
      (raw.hangoutLink as string),
    externalId: provenance.externalId,
    provider: provenance.provider,
  };
}

function normalizeRecipients(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "string") return v;
        if (typeof v === "object" && v !== null && "email" in v) {
          return (v as { email: string }).email;
        }
        return null;
      })
      .filter((v): v is string => v !== null);
  }
  return [];
}
