import "server-only";

/**
 * Booking-email → targeted scheduling backfill (calendar intake lifecycle,
 * Phase 4).
 *
 * Cal.com and Calendly have no Composio triggers, so bookings otherwise
 * wait for the 6-hour reconciliation sweep. The confirmation email arrives
 * within a minute — this hook uses it as the fast-path signal and pulls
 * the structured record immediately. The backfill is idempotent (dedupe on
 * external id) and no-ops when the provider isn't connected, so firing on
 * every booking-domain email — confirmations, reminders, reschedules — is
 * safe and cheap.
 *
 * Runs BEFORE the gate pipeline in ingestEnvelope: the email itself may be
 * held or dropped (automated sender, unknown sender), but the booking it
 * announces is account truth that should sync regardless.
 */

import type { CaptureEnvelope } from "../adapters/types";
import { backfillCalBookings, backfillCalendlyEvents } from "./connector-backfills";

const BOOKING_SENDER_PROVIDERS: Record<string, "cal" | "calendly"> = {
  "cal.com": "cal",
  "calendly.com": "calendly",
};

export interface BookingSyncHookResult {
  ran: boolean;
  provider?: "cal" | "calendly";
}

export function bookingProviderForEnvelope(
  envelope: CaptureEnvelope,
): "cal" | "calendly" | null {
  if (envelope.captureType !== "message") return null;
  const sender = envelope.participants
    .find((participant) => participant.role === "from")
    ?.email?.toLowerCase();
  if (!sender) return null;
  const domain = sender.split("@")[1];
  return BOOKING_SENDER_PROVIDERS[domain] ?? null;
}

/**
 * Fire the targeted backfill for a booking-confirmation email. Never
 * throws — a failed sync just falls back to the 6-hour sweep.
 */
export async function runBookingSyncHook(
  workspaceId: string,
  envelope: CaptureEnvelope,
): Promise<BookingSyncHookResult> {
  const provider = bookingProviderForEnvelope(envelope);
  if (!provider) return { ran: false };

  try {
    if (provider === "cal") {
      await backfillCalBookings(workspaceId);
    } else {
      await backfillCalendlyEvents(workspaceId);
    }
    return { ran: true, provider };
  } catch (error) {
    console.warn(
      `[booking-sync-hook] ${provider} backfill failed:`,
      error instanceof Error ? error.message : error,
    );
    return { ran: false };
  }
}
