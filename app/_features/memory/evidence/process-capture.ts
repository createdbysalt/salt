"use server";

/**
 * Process Capture for Evidence
 *
 * Called after a capture is ingested to detect signals and accumulate evidence.
 * This is the main integration point with the capture pipeline.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  classifyEmailCapture,
  classifyMeetingCapture,
  type EmailCaptureData,
  type MeetingCaptureData,
} from "./classifier";
import { addSignalToEvidence } from "./actions";
import type { AddSignalResult } from "./types";

interface CaptureEventRow {
  id: string;
  workspace_id: string;
  capture_type: string;
  extracted_data: Record<string, unknown>;
  raw_payload: Record<string, unknown>;
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
    .select("id, workspace_id, capture_type, extracted_data, raw_payload")
    .eq("id", captureId)
    .single();

  if (error || !capture) {
    return { processed: false, signalsDetected: 0, results: [] };
  }

  const workspaceId = capture.workspace_id;
  const captureType = capture.capture_type;
  const extracted = capture.extracted_data || {};
  const raw = capture.raw_payload || {};

  let signals: Awaited<ReturnType<typeof classifyEmailCapture>> = [];

  // Classify based on capture type
  if (captureType === "email") {
    const emailData = extractEmailData(extracted, raw);
    if (emailData) {
      signals = await classifyEmailCapture(workspaceId, emailData, captureId);
    }
  } else if (captureType === "meeting" || captureType === "calendar_event") {
    const meetingData = extractMeetingData(extracted, raw);
    if (meetingData) {
      signals = await classifyMeetingCapture(workspaceId, meetingData, captureId);
    }
  }

  if (signals.length === 0) {
    return { processed: true, signalsDetected: 0, results: [] };
  }

  // Add each signal to evidence
  const results: AddSignalResult[] = [];
  for (const signal of signals) {
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
  raw: Record<string, unknown>
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
  const organizer =
    (extracted.organizer as string) || (raw.organizer as string) || "";
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
      (raw.end_time as string),
    location: (extracted.location as string) || (raw.location as string),
    meetingUrl:
      (extracted.meeting_url as string) ||
      (extracted.hangoutLink as string) ||
      (raw.meeting_url as string) ||
      (raw.hangoutLink as string),
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
