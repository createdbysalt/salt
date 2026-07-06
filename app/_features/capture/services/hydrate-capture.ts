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

import { getConnectionStatus } from "@/app/_lib/composio/connections";
import { getGmailMessage } from "@/app/_lib/composio/actions";
import { extractCaptureEmailFields } from "./extract-capture-email";

/** Bound what a single hydration hands to the analyzer. */
const MAX_BODY_CHARS = 20_000;

export interface HydratableCapture {
  id: string;
  source_type: string;
  /** The source pointer — the provider's stable per-item id. */
  source_external_id: string | null;
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
  if (capture.source_type !== "gmail" || !capture.source_external_id) {
    return null;
  }

  const connection = await getConnectionStatus("gmail", workspaceId);
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

    const fields = extractCaptureEmailFields(
      message as unknown as Record<string, unknown>,
    );
    const body = fields?.body_text ?? null;
    return body ? body.slice(0, MAX_BODY_CHARS) : null;
  } catch (error) {
    console.warn(
      `[hydrate-capture] gmail fetch failed for capture ${capture.id}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
