import "server-only";

/**
 * Capture lifecycle updates (calendar intake lifecycle, Phase 2).
 *
 * Calendar events change after we capture them: meetings get cancelled,
 * the user declines. The ingest path is insert-only with dedupe on
 * (workspace_id, source_type, source_external_id), so without this module
 * a change payload collapses to "duplicate" and the stored row goes stale.
 *
 * This module is the narrow update-in-place path: terminal state changes
 * (cancelled status, the user's own decline) merge into the existing row's
 * extracted_data. Everything else stays a duplicate. It runs BEFORE the
 * gate pipeline in ingestEnvelope — the keep-out gate's drop semantics
 * ("this never existed") are wrong for an event we already captured.
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { CaptureEnvelope } from "../adapters/types";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Google/Outlook use "cancelled"; Calendly uses the American "canceled". */
const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

export type LifecycleUpdateResult = "updated" | "no_change" | "no_existing";

interface LifecycleState {
  status: string | null;
  selfResponse: string | null;
}

function lifecycleStateOf(
  envelope: CaptureEnvelope,
  userEmail: string | null,
): LifecycleState {
  const extracted = envelope.extracted as Record<string, unknown>;
  const status = typeof extracted.status === "string" ? extracted.status : null;

  let selfResponse: string | null = null;
  const self = userEmail?.toLowerCase() ?? null;
  if (self && Array.isArray(extracted.attendees)) {
    const selfAttendee = (extracted.attendees as Array<Record<string, unknown>>).find(
      (attendee) =>
        typeof attendee.email === "string" && attendee.email.toLowerCase() === self,
    );
    if (typeof selfAttendee?.responseStatus === "string") {
      selfResponse = selfAttendee.responseStatus;
    }
  }

  return { status, selfResponse };
}

/**
 * True when the envelope asserts a terminal change worth persisting:
 * the event was cancelled or the connected user declined. Non-terminal
 * replays (reschedules, edits) stay on the duplicate path for now.
 */
export function isTerminalCalendarUpdate(
  envelope: CaptureEnvelope,
  userEmail: string | null,
): boolean {
  if (envelope.captureType !== "meeting") return false;
  const state = lifecycleStateOf(envelope, userEmail);
  return (
    (state.status !== null && CANCELLED_STATUSES.has(state.status)) ||
    state.selfResponse === "declined"
  );
}

/**
 * Merge an envelope's lifecycle state into the stored capture row.
 * Only `status` and `self_response` are mutable; only actual changes write.
 */
export async function applyCaptureLifecycleUpdate(
  workspaceId: string,
  envelope: CaptureEnvelope,
  userEmail: string | null,
  admin?: AdminClient,
): Promise<LifecycleUpdateResult> {
  const incoming = lifecycleStateOf(envelope, userEmail);
  if (incoming.status === null && incoming.selfResponse === null) {
    return "no_change";
  }

  const client = admin ?? createAdminClient();
  const { data: row, error } = await client
    .from("capture_events")
    .select("extracted_data")
    .eq("workspace_id", workspaceId)
    .eq("source_type", envelope.sourceType)
    .eq("source_external_id", envelope.externalId)
    .maybeSingle();

  if (error) {
    console.error(
      `[capture-lifecycle] lookup failed for ${envelope.sourceType}/${envelope.externalId}:`,
      error.message,
    );
    return "no_existing";
  }
  if (!row) return "no_existing";

  const stored = (row.extracted_data ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (incoming.status !== null && stored.status !== incoming.status) {
    patch.status = incoming.status;
  }
  if (
    incoming.selfResponse !== null &&
    stored.self_response !== incoming.selfResponse
  ) {
    patch.self_response = incoming.selfResponse;
  }
  if (Object.keys(patch).length === 0) return "no_change";

  const { error: updateError } = await client
    .from("capture_events")
    .update({ extracted_data: { ...stored, ...patch } as never })
    .eq("workspace_id", workspaceId)
    .eq("source_type", envelope.sourceType)
    .eq("source_external_id", envelope.externalId);

  if (updateError) {
    console.error(
      `[capture-lifecycle] update failed for ${envelope.sourceType}/${envelope.externalId}:`,
      updateError.message,
    );
    return "no_change";
  }
  return "updated";
}
