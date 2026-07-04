/**
 * Golden payload fixtures for the Google Calendar capture adapter.
 *
 * PROVENANCE: synthesized 2026-07-04 from the Google Calendar API v3 event
 * resource (the per-item shape GOOGLECALENDAR_EVENTS_LIST returns and the
 * shape the legacy calendar-ingestion service consumed) — not yet captured
 * live. Replace with a live row when the first calendar backfill runs; if
 * the live shape differs, the conformance suite is the tripwire.
 */

/** Timed meeting with organizer + attendees. */
export const CALENDAR_EVENT_TIMED = {
  id: "6ku8m2p4v9d1c3e5",
  status: "confirmed",
  htmlLink: "https://www.google.com/calendar/event?eid=abc123",
  summary: "Q3 retainer kickoff",
  description: "Scope review and first-milestone planning.",
  start: { dateTime: "2026-07-08T15:00:00-04:00" },
  end: { dateTime: "2026-07-08T15:45:00-04:00" },
  organizer: { email: "You@usesalt.io", displayName: "You" },
  attendees: [
    { email: "ada@northwind.com", displayName: "Ada Lovelace", responseStatus: "accepted" },
    { email: "ops@northwind.com", responseStatus: "needsAction" },
  ],
};

/** All-day event (date, not dateTime). */
export const CALENDAR_EVENT_ALL_DAY = {
  id: "7lv9n3q5w0e2d4f6",
  status: "confirmed",
  summary: "Studio offsite",
  start: { date: "2026-07-15" },
  end: { date: "2026-07-16" },
  organizer: { email: "you@usesalt.io" },
};

/** Recurring instance — series id becomes threadId. */
export const CALENDAR_EVENT_RECURRING_INSTANCE = {
  id: "8mw0o4r6x1f3e5g7_20260709T140000Z",
  recurringEventId: "8mw0o4r6x1f3e5g7",
  status: "confirmed",
  summary: "Weekly client sync",
  start: { dateTime: "2026-07-09T10:00:00-04:00" },
  end: { dateTime: "2026-07-09T10:30:00-04:00" },
  organizer: { email: "ada@northwind.com", displayName: "Ada Lovelace" },
  attendees: [{ email: "you@usesalt.io" }],
};

/**
 * GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER payload — flat
 * snake_case shape verified against the live trigger schema 2026-07-04
 * (calendar_id / event_id / summary / start_time / end_time /
 * organizer_email / organizer_name; no attendees).
 */
export const CALENDAR_TRIGGER_EVENT_CREATED = {
  calendar_id: "primary",
  event_id: "1pz3r7u9a4i6h8j0",
  summary: "Intro call — Acme Creative",
  start_time: "2026-07-16T13:00:00Z",
  end_time: "2026-07-16T13:30:00Z",
  organizer_email: "Grace@acmecreative.co",
  organizer_name: "Grace Hopper",
};

/** Cancelled tombstone — adapter must decline. */
export const CALENDAR_EVENT_CANCELLED = {
  id: "9nx1p5s7y2g4f6h8",
  status: "cancelled",
  summary: "Cancelled call",
  start: { dateTime: "2026-07-10T09:00:00-04:00" },
  end: { dateTime: "2026-07-10T09:30:00-04:00" },
};

/** No summary and no description — nothing for memory, decline. */
export const CALENDAR_EVENT_EMPTY = {
  id: "0oy2q6t8z3h5g7i9",
  status: "confirmed",
  start: { dateTime: "2026-07-11T09:00:00-04:00" },
  end: { dateTime: "2026-07-11T09:30:00-04:00" },
};

/** Missing id — malformed, decline. */
export const CALENDAR_EVENT_NO_ID = {
  status: "confirmed",
  summary: "Ghost event",
  start: { dateTime: "2026-07-12T09:00:00-04:00" },
};
