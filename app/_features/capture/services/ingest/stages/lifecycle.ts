import "server-only";

import type { CaptureEnvelope } from "../../../adapters/types";
import {
  applyCaptureLifecycleUpdate,
  isTerminalCalendarUpdate,
} from "../../capture-lifecycle";

/**
 * Calendar lifecycle stage (calendar intake lifecycle, Phase 2): a terminal
 * update (cancelled / self-declined) for an event we already captured
 * updates the existing row in place. This runs before the gate pipeline —
 * the keep-out gate's drop semantics ("this never existed") are wrong for
 * an event that did. Cancel-before-create falls through to the gates,
 * which drop it: a cancelled event we never saw never becomes a capture.
 *
 * Returns true when the row was updated in place (ingest stops here).
 */
export async function applyTerminalCalendarUpdateStage(
  workspaceId: string,
  envelope: CaptureEnvelope,
  userEmail: string | null,
): Promise<boolean> {
  if (!isTerminalCalendarUpdate(envelope, userEmail)) return false;
  const lifecycle = await applyCaptureLifecycleUpdate(
    workspaceId,
    envelope,
    userEmail,
  );
  return lifecycle === "updated";
}
