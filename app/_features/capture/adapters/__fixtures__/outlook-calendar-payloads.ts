/**
 * Golden payload fixtures for the Outlook Calendar capture adapter.
 *
 * PROVENANCE: synthesized 2026-08-01 from the Microsoft Graph event
 * resource shape. OUTLOOK_EVENT_TRIGGER delivers a pointer (id + change
 * type) that the webhook enriches into the full event — both forms are
 * pinned here. Not yet captured live; replace with live rows when the
 * first Outlook calendar trigger fires against a real mailbox.
 */

/** Pointer-only trigger payload (needs hydration — that IS the contract). */
export const OUTLOOK_EVENT_TRIGGER_POINTER = {
  id: "AAMkEvtPointer1",
  event_type: "created",
};

/** Full Graph event resource (hydrated form). */
export const OUTLOOK_CALENDAR_EVENT_HYDRATED = {
  id: "AAMkEvtFull1",
  subject: "Q3 planning",
  start: { dateTime: "2026-08-12T14:00:00Z" },
  end: { dateTime: "2026-08-12T15:00:00Z" },
  organizer: {
    emailAddress: { address: "you@usesalt.io", name: "You" },
  },
  attendees: [
    {
      emailAddress: { address: "ada@northwind.com", name: "Ada Lovelace" },
      status: { response: "accepted" },
    },
  ],
  location: { displayName: "Teams" },
  onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup/1" },
  webLink: "https://outlook.office365.com/calendar/item/AAMkEvtFull1",
  showAs: "busy",
};
