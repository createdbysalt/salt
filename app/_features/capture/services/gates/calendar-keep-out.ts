/**
 * Calendar keep-out gate (calendar intake lifecycle, Phase 1).
 *
 * One invariant: a calendar event is signal only if another person is on
 * it. Everything else — cancelled events, availability state (OOO, focus
 * time, working location), events the user declined, and solo blocks
 * (open booking holds, gym, personal reminders) — never becomes a capture,
 * never bills extraction, never touches Memory.
 *
 * Pure and deterministic: every rule requires positive evidence on the
 * normalized envelope. The solo rule only fires when the payload actually
 * carried attendee data (`attendees_known`) — the thin Google trigger
 * shape has none, and honest silence beats a wrong drop.
 */

import type { CaptureEnvelope } from "../../adapters/types";

export type CalendarKeepOutRule =
  | "cancelled"
  | "self_declined"
  | "event_type"
  | "solo";

export interface CalendarKeepOutDecision {
  rule: CalendarKeepOutRule;
  reason: string;
}

/**
 * User-facing copy per rule — the Sources → Customize calendar area renders
 * these in "What never reaches me", so the transparency copy is derived
 * from the gate itself and cannot drift from it.
 */
export const CALENDAR_KEEP_OUT_COPY: Record<CalendarKeepOutRule, string> = {
  cancelled: "Cancelled events",
  self_declined: "Events you declined",
  event_type: "Out-of-office, focus-time, and working-location blocks",
  solo: "Time blocked with no one else on it — open booking slots, personal holds",
};

/** Google Calendar eventTypes that mark availability state, not meetings. */
const NON_MEETING_EVENT_TYPES = new Set([
  "outOfOffice",
  "focusTime",
  "workingLocation",
]);

const EVENT_TYPE_REASONS: Record<string, string> = {
  outOfOffice: "Out-of-office block",
  focusTime: "Focus-time block",
  workingLocation: "Working-location marker",
};

export function checkCalendarKeepOut(
  envelope: CaptureEnvelope,
  userEmail: string | null,
): CalendarKeepOutDecision | null {
  const extracted = envelope.extracted as Record<string, unknown>;

  // Google/Outlook use "cancelled"; Calendly uses the American "canceled".
  if (extracted.status === "cancelled" || extracted.status === "canceled") {
    return { rule: "cancelled", reason: "Event was cancelled" };
  }

  const eventType = extracted.eventType;
  if (typeof eventType === "string" && NON_MEETING_EVENT_TYPES.has(eventType)) {
    return {
      rule: "event_type",
      reason: EVENT_TYPE_REASONS[eventType] ?? "Availability block",
    };
  }

  const self = userEmail?.toLowerCase() ?? null;
  if (self) {
    const attendees = Array.isArray(extracted.attendees)
      ? (extracted.attendees as Array<Record<string, unknown>>)
      : [];
    const selfAttendee = attendees.find(
      (attendee) =>
        typeof attendee.email === "string" &&
        attendee.email.toLowerCase() === self,
    );
    if (selfAttendee?.responseStatus === "declined") {
      return { rule: "self_declined", reason: "You declined this event" };
    }
  }

  if (extracted.attendees_known === true) {
    const hasCompany = envelope.participants.some(
      (participant) =>
        participant.email !== null &&
        participant.email.toLowerCase() !== self,
    );
    if (!hasCompany) {
      return { rule: "solo", reason: "No one else is on this event" };
    }
  }

  return null;
}
