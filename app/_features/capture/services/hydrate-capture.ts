import "server-only";

/**
 * On-demand capture hydration (connector-platform Phase 3.7).
 *
 * Envelope retention stance: capture_events rows hold a thin envelope +
 * source pointer, never full content. When downstream processing (the
 * intelligence scan, entity resolution) needs the body of an item that
 * already passed the noise gate, it hydrates TRANSIENTLY through the source
 * pointer — the content is used for the analysis pass and discarded; only
 * extracted facts + provenance persist. The provider stays the source of
 * truth.
 */

import { getConnectionStatusAdmin } from "@/app/_lib/composio/connections";
import { getGmailMessage } from "@/app/_lib/composio/actions";
import {
  extractCaptureEmailFields,
  type CaptureEmailFields,
} from "./extract-capture-email";

/** Bound what a single hydration hands to the analyzer. */
const MAX_BODY_CHARS = 20_000;

export interface HydratableCapture {
  id: string;
  source_type: string;
  /** The source pointer — the provider's stable per-item id. */
  source_external_id: string | null;
}

/**
 * Fetch the full Gmail message behind a capture pointer and return its
 * normalized fields. Returns null when the capture has no pointer, the
 * connection is gone, or the provider fetch fails. Never persists anything.
 */
export async function hydrateGmailCaptureFields(
  workspaceId: string,
  capture: HydratableCapture,
): Promise<CaptureEmailFields | null> {
  if (capture.source_type !== "gmail" || !capture.source_external_id) {
    return null;
  }

  // Admin variant: hydration runs from crons/background scans with no user
  // session — the session-scoped getter reads "not connected" under RLS.
  const connection = await getConnectionStatusAdmin("gmail", workspaceId);
  if (!connection.connected || !connection.composioConnectionId) {
    return null;
  }

  try {
    const message = await getGmailMessage(
      capture.source_external_id,
      connection.composioConnectionId,
      workspaceId, // Composio entity ID = workspace ID
      { skipAuthCheck: true, workspaceId, unattended: true },
    );

    return extractCaptureEmailFields(
      message as unknown as Record<string, unknown>,
    );
  } catch (error) {
    console.warn(
      `[hydrate-capture] gmail fetch failed for capture ${capture.id}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Fetch the full Gmail message behind a capture pointer and return its plain
 * text body. Returns null when the capture has no pointer, the connection is
 * gone, or the provider fetch fails — callers fall back to the stored
 * snippet. Never persists the body.
 */
export async function hydrateGmailCaptureBody(
  workspaceId: string,
  capture: HydratableCapture,
): Promise<string | null> {
  const fields = await hydrateGmailCaptureFields(workspaceId, capture);
  const body = fields?.body_text ?? null;
  return body ? body.slice(0, MAX_BODY_CHARS) : null;
}
