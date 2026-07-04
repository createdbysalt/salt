/**
 * Golden payload fixtures for the Cal.com capture adapter.
 *
 * PROVENANCE: synthesized 2026-07-04 from the Cal.com API v2 booking object
 * (the shape the retired native integration consumed via GET /v2/bookings and
 * the shape CAL_LIST_BOOKINGS proxies — Composio publishes an empty schema
 * for this tool). Replace with a live row from the first Composio cal
 * backfill.
 */

/** Upcoming booking with host + booker. */
export const CAL_BOOKING_UPCOMING = {
  id: 4182931,
  uid: "qKb3Yp7cRw2mXv8sT1nZ6d",
  title: "Discovery call — Ada Lovelace",
  description: "Intro chat about the brand refresh.",
  status: "upcoming",
  start: "2026-07-10T17:00:00.000Z",
  end: "2026-07-10T17:30:00.000Z",
  duration: 30,
  eventTypeId: 88123,
  eventType: { id: 88123, slug: "discovery-call", title: "Discovery Call" },
  attendees: [
    { name: "Ada Lovelace", email: "Ada@northwind.com", timeZone: "America/Toronto" },
  ],
  hosts: [{ id: 5521, name: "You", email: "you@usesalt.io" }],
  meetingUrl: "https://app.cal.com/video/qKb3Yp7cRw2mXv8sT1nZ6d",
  location: "integrations:daily",
  createdAt: "2026-07-03T15:22:41.000Z",
};

/** Webhook-era payload spelling (startTime/endTime + organizer). */
export const CAL_BOOKING_WEBHOOK_SHAPE = {
  id: 4182932,
  uid: "rLc4Zq8dSx3nYw9tU2oA7e",
  title: "Kickoff — Northwind retainer",
  startTime: "2026-07-12T14:00:00.000Z",
  endTime: "2026-07-12T15:00:00.000Z",
  status: "ACCEPTED",
  location: "Google Meet",
  attendees: [
    { name: "Ada Lovelace", email: "ada@northwind.com", timeZone: "America/Toronto" },
  ],
  organizer: { name: "You", email: "you@usesalt.io" },
};

/** Cancelled booking — envelope declines; the processor still marks the meeting. */
export const CAL_BOOKING_CANCELLED = {
  id: 4182933,
  uid: "sMd5Ar9eTy4oZx0uV3pB8f",
  title: "Cancelled intro",
  status: "cancelled",
  start: "2026-07-11T16:00:00.000Z",
  end: "2026-07-11T16:30:00.000Z",
  attendees: [{ name: "Ghost", email: "ghost@example.com", timeZone: "UTC" }],
  hosts: [{ id: 5521, name: "You", email: "you@usesalt.io" }],
};

/** Missing id/uid — malformed, decline. */
export const CAL_BOOKING_NO_ID = {
  title: "Ghost booking",
  start: "2026-07-13T10:00:00.000Z",
};
