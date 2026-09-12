import "server-only";

import type { CaptureEnvelope } from "../../../adapters/types";
import {
  bookingProviderForEnvelope,
  runBookingSyncHook,
} from "../../booking-sync-hook";

/**
 * Booking fast path (calendar intake lifecycle, Phase 4): a booking
 * confirmation email (cal.com / calendly.com sender) triggers a targeted
 * scheduling backfill so the structured booking lands within a minute
 * instead of waiting for the 6-hour reconciliation sweep. Runs before the
 * gates on purpose: the email itself may be held or dropped, but the
 * booking it announces is account truth. Idempotent; no-ops when the
 * provider isn't connected.
 *
 * Serverless callers must pass awaitWork — unawaited work dies when the
 * instance freezes after the response.
 */
export async function maybeRunBookingSyncStage(
  workspaceId: string,
  envelope: CaptureEnvelope,
  awaitWork: boolean,
): Promise<void> {
  if (!bookingProviderForEnvelope(envelope)) return;
  const hook = runBookingSyncHook(workspaceId, envelope);
  if (awaitWork) {
    await hook;
  }
}
