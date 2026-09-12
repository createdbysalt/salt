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
  classifyFileCapture,
  classifyMeetingCapture,
  type DetectedSignal,
  type EmailCaptureData,
  type FileCaptureData,
  type MeetingCaptureData,
} from "./classifier";
import { addSignalToEvidence } from "./add-signal";
import { routeIntakeProposal } from "./route-intake-proposal";
import { extractCalendarInviteFromPayload } from "@/app/_features/capture/services/calendar-attachment-parser";
import type { EmailAttachmentMeta } from "./classifier";
import {
  logOddsToProbability,
  probabilityToLogOdds,
  SIGNAL_WEIGHTS,
} from "@/app/_features/memory/care/intake";
import type { AddSignalResult, ExtractedFieldValue } from "./types";

function toRecord(value: Json | null): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

export interface ProcessCaptureEvidenceOptions {
  /**
   * Full message body from the conversation_messages store, used by the
   * evidence-backfill cron so classification reads the real body instead of
   * the snippet the capture row carries.
   */
  bodyOverride?: string | null;
}

/**
 * Process a capture event and accumulate evidence for potential new records.
 *
 * Stamps `extracted_data.evidence.processed_at` so the nightly backfill cron
 * can find rows where evidence never ran (bootstrap backlog, bulk imports)
 * without double-counting signal weights on rows already processed.
 *
 * Returns the signals detected and the actions taken (watch/suggest/auto/dismiss).
 */
export async function processCaptureForEvidence(
  captureId: string,
  options: ProcessCaptureEvidenceOptions = {}
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
      if (options.bodyOverride) {
        emailData.body = options.bodyOverride;
      }
      signals = await classifyEmailCapture(workspaceId, emailData, captureId);

      // ICS attachment → meeting proposal. The email-analysis lane suppresses
      // proposals from vendor-classified senders (Google Calendar
      // notifications, Zoom), which is where most invite emails come from —
      // detect the attachment here so invites land in Watching instead of
      // "No action". Not a calendar-fact signal: the calibration gate
      // decides suggest vs auto-create.
      const calendarInvite = extractCalendarInviteFromPayload(raw);
      if (calendarInvite) {
        signals.push({
          entityType: "meeting",
          identifier: `ics:${captureId}`,
          signal: "calendar_invite_received",
          extractedData: {
            title: calendarInvite.title,
            datetime: calendarInvite.start_at,
            organizer: emailData.from,
          },
        });
      }
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
  } else if (captureType === "file") {
    const fileData = extractFileData(extracted, raw, {
      externalId:
        capture.source_external_id ??
        (raw.fileId as string | undefined) ??
        (raw.dropboxId as string | undefined),
      provider: capture.source_type,
    });
    if (fileData) {
      signals = classifyFileCapture(fileData);
    }
  }

  // Document-class email attachments (agreements, contracts, SOWs, invoices):
  // download the bytes into storage so resources carry the real document and
  // content analysis reads it — not just the email excerpt. Self-filters to
  // document-class attachments; never throws. Runs after evidence processing
  // when signals fired (so sibling work/billing births exist to link to) and
  // before the zero-signal early return (a contract email with no classifiable
  // signal must still save its document).
  const maybeIngestAttachments = async (): Promise<void> => {
    if (!isEmailSource) return;
    try {
      const { ingestEmailAttachmentsForCapture } = await import(
        "@/app/_features/resources/services/email-attachment-ingest"
      );
      const ingest = await ingestEmailAttachmentsForCapture(workspaceId, captureId);
      if (ingest.ingested > 0 || ingest.errors.length > 0) {
        console.log(
          `[process-capture] attachment ingest for ${captureId}: ingested=${ingest.ingested} skipped=${ingest.skipped} errors=${ingest.errors.length}`,
        );
      }
    } catch (ingestError) {
      console.error("[process-capture] attachment ingest failed:", ingestError);
    }
  };

  if (signals.length === 0) {
    await maybeIngestAttachments();
    await stampEvidenceProcessed(admin, captureId, extracted, 0);
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

  await maybeIngestAttachments();

  await stampEvidenceProcessed(admin, captureId, extracted, signals.length);

  return {
    processed: true,
    signalsDetected: signals.length,
    results,
  };
}

/**
 * Best-effort marker that evidence ran for this capture. The backfill cron
 * selects on its absence; a stamp failure never fails evidence processing.
 */
async function stampEvidenceProcessed(
  admin: ReturnType<typeof createAdminClient>,
  captureId: string,
  extracted: Record<string, unknown>,
  signalsDetected: number
): Promise<void> {
  try {
    await admin
      .from("capture_events")
      .update({
        extracted_data: {
          ...extracted,
          evidence: {
            processed_at: new Date().toISOString(),
            signals_detected: signalsDetected,
          },
        } as Json,
      })
      .eq("id", captureId);
  } catch (stampError) {
    console.warn(
      `[process-capture] evidence stamp failed for ${captureId}:`,
      stampError instanceof Error ? stampError.message : stampError
    );
  }
}

/**
 * Route a meeting-entity signal into the intake tier: the signal's weight
 * becomes the proposal confidence. Memory is fully autonomous — the
 * accumulated score against the entity's bars is the only gate, so
 * calendar-fact signals (the event exists on the user's own calendar)
 * cross the meeting auto bar and create directly.
 */
async function routeMeetingSignal(
  workspaceId: string,
  signal: DetectedSignal,
  captureId: string
): Promise<AddSignalResult> {
  // NOTE: this round-trips log-odds → integer percent → log-odds (the
  // routeIntakeProposal interface speaks 0-100 confidence). Each hop loses
  // a little precision (e.g. 5.0 → 97% → ≈5.01); harmless at meeting-bar
  // scale, but don't copy the pattern into hot accumulation loops.
  const confidence = logOddsToProbability(SIGNAL_WEIGHTS[signal.signal] ?? 0);

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

/** Exported for the email backfill script — same extraction the live path uses. */
export function extractEmailData(
  extracted: Record<string, unknown>,
  raw: Record<string, unknown>
): EmailCaptureData | null {
  // Try extracted data first. The email adapters emit sender_email (never
  // from/sender) — without that fallback every email capture silently
  // skipped classification here.
  const from =
    (extracted.from as string) ||
    (extracted.sender as string) ||
    (extracted.sender_email as string) ||
    (raw.from as string) ||
    (raw.sender as string) ||
    (raw.sender_email as string);

  if (!from) return null;

  const to = normalizeRecipients(
    extracted.to || extracted.recipients || raw.to || raw.recipients
  );
  const cc = normalizeRecipients(extracted.cc || raw.cc);
  const attachments = normalizeAttachments(
    extracted.attachments ?? raw.attachments
  );

  return {
    from,
    to,
    cc: cc.length > 0 ? cc : undefined,
    subject: (extracted.subject as string) || (raw.subject as string),
    // Adapters store the body preview as snippet, not body.
    body:
      (extracted.body as string) ||
      (extracted.snippet as string) ||
      (raw.body as string) ||
      (raw.snippet as string),
    signature: (extracted.signature as string) || (raw.signature as string),
    hasAttachments:
      attachments.length > 0 ||
      extracted.has_attachments === true ||
      raw.has_attachments === true,
    attachments: attachments.length > 0 ? attachments : undefined,
    isReply:
      Boolean(extracted.is_reply) ||
      Boolean(raw.is_reply) ||
      (typeof extracted.subject === "string" &&
        extracted.subject.toLowerCase().startsWith("re:")),
    threadId: (extracted.thread_id as string) || (raw.thread_id as string),
  };
}

/**
 * Attachment metadata from the capture envelope (Gmail adapter emits
 * [{ name, contentType, size }]). Filenames are document evidence — the
 * classifier matches them against the document vocabulary.
 */
function normalizeAttachments(value: unknown): EmailAttachmentMeta[] {
  if (!Array.isArray(value)) return [];
  const attachments: EmailAttachmentMeta[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      attachments.push({ name: item });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name =
      (record.name as string) || (record.filename as string) || "";
    if (!name.trim()) continue;
    attachments.push({
      name,
      contentType:
        (record.contentType as string) || (record.mimeType as string) || undefined,
      size: typeof record.size === "number" ? record.size : undefined,
      attachmentId:
        (record.attachmentId as string) || (record.attachment_id as string) || undefined,
    });
  }
  return attachments;
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

function extractFileData(
  extracted: Record<string, unknown>,
  raw: Record<string, unknown>,
  provenance: { externalId?: string; provider?: string } = {}
): FileCaptureData | null {
  const fileName =
    (extracted.file_name as string) ||
    (extracted.name as string) ||
    (raw.name as string) ||
    (raw.file_name as string);

  if (!fileName) return null;

  return {
    fileName,
    mimeType: (extracted.mime_type as string) || (raw.mimeType as string),
    ownerEmail: (extracted.owner_email as string) || undefined,
    ownerName: (extracted.owner_name as string) || undefined,
    webViewLink:
      (extracted.web_view_link as string) || (raw.webViewLink as string),
    folderPath: (extracted.folder_path as string) || undefined,
    isFolder: Boolean(extracted.is_folder),
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
