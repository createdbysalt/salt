import { describe, it, expect } from "vitest";
import { createCalendarCategoryAdapter, getCalendarAdapter } from "./calendar";
import { CALENDAR_TRIGGER_EVENT_CREATED } from "../__fixtures__/googlecalendar-payloads";

describe("calendar category adapter", () => {
  describe("getCalendarAdapter", () => {
    it("returns adapter for googlecalendar", () => {
      const adapter = getCalendarAdapter("googlecalendar");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("googlecalendar");
    });

    it("returns adapter for cal", () => {
      const adapter = getCalendarAdapter("cal");
      expect(adapter).not.toBeNull();
      expect(adapter?.sourceType).toBe("cal");
    });

    it("returns adapter with generic extraction for unknown provider", () => {
      const adapter = getCalendarAdapter("unknown");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("unknown");
    });

    it("returns adapter with generic extraction for non-calendar provider", () => {
      const adapter = getCalendarAdapter("gmail");
      expect(adapter).not.toBeNull();
      expect(adapter.sourceType).toBe("gmail");
    });
  });

  describe("googlecalendar normalization", () => {
    const adapter = createCalendarCategoryAdapter("googlecalendar");

    it("normalizes the flat snake_case trigger payload", () => {
      // Verified against the live trigger schema (re-pulled 2026-08-05):
      // the webhook sends event_id/start_time/organizer_email, NOT the
      // Calendar API event resource.
      const envelope = adapter.normalize(CALENDAR_TRIGGER_EVENT_CREATED);

      expect(envelope).not.toBeNull();
      expect(envelope?.externalId).toBe("1pz3r7u9a4i6h8j0");
      expect(envelope?.title).toBe("Intro call — Acme Creative");
      expect(envelope?.occurredAt).toBe("2026-07-16T13:00:00Z");
      expect(envelope?.extracted.end).toBe("2026-07-16T13:30:00Z");
      expect(envelope?.participants).toHaveLength(1);
      expect(envelope?.participants[0].email).toBe("grace@acmecreative.co");
      expect(envelope?.participants[0].role).toBe("organizer");
      expect(envelope?.threadId).toBe("primary");
    });

    it("normalizes google calendar event payload", () => {
      const payload = {
        id: "event-123",
        summary: "Team standup",
        start: { dateTime: "2024-07-12T09:00:00Z" },
        end: { dateTime: "2024-07-12T09:30:00Z" },
        organizer: {
          email: "organizer@example.com",
          displayName: "Organizer",
        },
        attendees: [
          { email: "attendee1@example.com", displayName: "Attendee 1" },
          { email: "attendee2@example.com", displayName: "Attendee 2" },
        ],
        location: "Conference Room A",
        status: "confirmed",
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        htmlLink: "https://calendar.google.com/event?eid=event-123",
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("googlecalendar");
      expect(envelope?.captureType).toBe("meeting");
      expect(envelope?.externalId).toBe("event-123");
      expect(envelope?.title).toBe("Team standup");
      expect(envelope?.occurredAt).toBe("2024-07-12T09:00:00Z");
      expect(envelope?.participants).toHaveLength(3);
      expect(envelope?.participants[0].role).toBe("organizer");
      expect(envelope?.extracted.attendee_count).toBe(2);
      expect(envelope?.extracted.location).toBe("Conference Room A");
      // Detail contract: the card lists attendee names, not just a count.
      expect(envelope?.extracted.attendees).toEqual([
        { email: "attendee1@example.com", name: "Attendee 1" },
        { email: "attendee2@example.com", name: "Attendee 2" },
      ]);
      expect(envelope?.extracted.meeting_link).toBe("https://meet.google.com/abc-defg-hij");
      expect(envelope?.extracted.deep_link).toBe(
        "https://calendar.google.com/event?eid=event-123"
      );
    });

    it("extracts the video link from conferenceData when hangoutLink is absent", () => {
      const envelope = adapter.normalize({
        id: "event-conf",
        summary: "Client review",
        start: { dateTime: "2024-07-12T09:00:00Z" },
        conferenceData: {
          entryPoints: [
            { entryPointType: "phone", uri: "tel:+15551234567" },
            { entryPointType: "video", uri: "https://meet.google.com/xyz-1234" },
          ],
        },
      });

      expect(envelope?.extracted.meeting_link).toBe("https://meet.google.com/xyz-1234");
    });

    it("handles all-day events", () => {
      const payload = {
        id: "allday-123",
        summary: "Company holiday",
        start: { date: "2024-07-12" },
        end: { date: "2024-07-13" },
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.occurredAt).toBe("2024-07-12");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("outlook_calendar normalization", () => {
    const adapter = createCalendarCategoryAdapter("outlook_calendar");

    it("flags pointer-only trigger payloads for hydration", () => {
      // OUTLOOK_EVENT_TRIGGER sends { id, event_type } only — verified
      // against the live schema 2026-08-05.
      const envelope = adapter.normalize({
        id: "AAMkAGI2TG93AAA=",
        event_type: "event_created",
      });

      expect(envelope).not.toBeNull();
      expect(envelope?.externalId).toBe("AAMkAGI2TG93AAA=");
      expect(envelope?.extracted.needs_hydration).toBe(true);
      expect(envelope?.participants).toHaveLength(0);
    });

    it("normalizes a Graph event resource to Google parity", () => {
      const envelope = adapter.normalize({
        id: "AAMkAGI2TG93AAA=",
        subject: "Quarterly planning",
        start: { dateTime: "2026-08-10T15:00:00.0000000", timeZone: "UTC" },
        end: { dateTime: "2026-08-10T16:00:00.0000000", timeZone: "UTC" },
        organizer: {
          emailAddress: { address: "Boss@Northwind.com", name: "Boss" },
        },
        attendees: [
          {
            emailAddress: { address: "anna@northwind.com", name: "Anna" },
            type: "required",
          },
          {
            emailAddress: { address: "ben@northwind.com", name: "Ben" },
            type: "optional",
          },
        ],
        location: { displayName: "Teams Meeting" },
        onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/xyz" },
        webLink: "https://outlook.office365.com/calendar/item/AAMkAGI2TG93AAA%3D",
        isCancelled: false,
        showAs: "busy",
      });

      expect(envelope).not.toBeNull();
      expect(envelope?.title).toBe("Quarterly planning");
      expect(envelope?.occurredAt).toBe("2026-08-10T15:00:00.0000000");
      expect(envelope?.extracted.organizer_email).toBe("boss@northwind.com");
      expect(envelope?.extracted.attendees).toEqual([
        { email: "anna@northwind.com", name: "Anna" },
        { email: "ben@northwind.com", name: "Ben" },
      ]);
      expect(envelope?.extracted.attendee_count).toBe(2);
      expect(envelope?.extracted.location).toBe("Teams Meeting");
      expect(envelope?.extracted.meeting_link).toBe(
        "https://teams.microsoft.com/l/meetup-join/xyz"
      );
      expect(envelope?.extracted.deep_link).toBe(
        "https://outlook.office365.com/calendar/item/AAMkAGI2TG93AAA%3D"
      );
      // organizer + 2 attendees
      expect(envelope?.participants).toHaveLength(3);
    });

    it("marks cancelled events", () => {
      const envelope = adapter.normalize({
        id: "AAMkCancelled=",
        subject: "Cancelled sync",
        start: { dateTime: "2026-08-10T15:00:00Z" },
        isCancelled: true,
      });
      expect(envelope?.extracted.status).toBe("cancelled");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("cal normalization", () => {
    const adapter = createCalendarCategoryAdapter("cal");

    it("normalizes cal.com booking payload", () => {
      const payload = {
        id: "booking-123",
        title: "Discovery call",
        startTime: "2024-07-12T14:00:00Z",
        endTime: "2024-07-12T14:30:00Z",
        attendees: [
          { email: "client@example.com", name: "Client Name" },
        ],
        status: "accepted",
        eventTypeSlug: "discovery-call",
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("cal");
      expect(envelope?.captureType).toBe("meeting");
      expect(envelope?.externalId).toBe("booking-123");
      expect(envelope?.title).toBe("Discovery call");
      expect(envelope?.participants).toHaveLength(1);
      expect(envelope?.participants[0].email).toBe("client@example.com");
      expect(envelope?.extracted.eventType).toBe("discovery-call");
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("calendly normalization", () => {
    const adapter = createCalendarCategoryAdapter("calendly");

    it("normalizes a scheduled-event row with merged invitees", () => {
      // Shape per the live CALENDLY_LIST_EVENTS schema (verified 2026-08-06):
      // Calendly identifies resources by URI, hosts live in event_memberships,
      // and the backfill merges invitees onto the row.
      const payload = {
        uri: "https://api.calendly.com/scheduled_events/AAAA-BBBB-CCCC",
        name: "Discovery call",
        status: "active",
        start_time: "2026-08-01T15:00:00.000000Z",
        end_time: "2026-08-01T15:30:00.000000Z",
        location: { type: "google_conference", location: null },
        invitees_counter: { total: 1, active: 1, limit: 1 },
        event_memberships: [
          {
            user: "https://api.calendly.com/users/XXXX",
            user_email: "me@studio.co",
            user_name: "Me Host",
          },
        ],
        event_guests: [{ email: "guest@client.com" }],
        invitees: [
          { email: "Client@Client.com", name: "Client Name", status: "active" },
        ],
      };

      const envelope = adapter.normalize(payload);

      expect(envelope).not.toBeNull();
      expect(envelope?.sourceType).toBe("calendly");
      expect(envelope?.captureType).toBe("meeting");
      expect(envelope?.externalId).toBe("AAAA-BBBB-CCCC");
      expect(envelope?.title).toBe("Discovery call");
      expect(envelope?.occurredAt).toBe("2026-08-01T15:00:00.000000Z");
      expect(envelope?.participants).toHaveLength(3);
      expect(envelope?.participants[0]).toEqual({
        email: "me@studio.co",
        name: "Me Host",
        role: "organizer",
      });
      expect(envelope?.participants[1]).toEqual({
        email: "client@client.com",
        name: "Client Name",
        role: "attendee",
      });
      expect(envelope?.participants[2].email).toBe("guest@client.com");
      expect(envelope?.extracted.attendee_count).toBe(1);
      expect(envelope?.extracted.status).toBe("active");
    });

    it("normalizes an event without invitee enrichment", () => {
      const envelope = adapter.normalize({
        uri: "https://api.calendly.com/scheduled_events/DDDD",
        name: "Intro chat",
        status: "canceled",
        start_time: "2026-08-02T10:00:00Z",
      });

      expect(envelope).not.toBeNull();
      expect(envelope?.externalId).toBe("DDDD");
      expect(envelope?.participants).toHaveLength(0);
      expect(envelope?.extracted.status).toBe("canceled");
    });

    it("returns null for rows without a uri or id", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
      expect(adapter.normalize({ name: "No identifier" })).toBeNull();
    });
  });

  describe("deriveSignals", () => {
    const adapter = createCalendarCategoryAdapter("googlecalendar");

    it("sets has_calendar_meeting for attendees", () => {
      const envelopes = [
        {
          sourceType: "googlecalendar" as const,
          captureType: "meeting" as const,
          externalId: "1",
          title: "Meeting",
          occurredAt: "2024-07-12T10:00:00Z",
          participants: [
            { email: "attendee@example.com", name: "Attendee", role: "attendee" as const },
          ],
          threadId: null,
          extracted: {},
          raw: {},
          noise: null,
        },
      ];

      const signals = adapter.deriveSignals!(envelopes, { userEmail: "me@test.com" });

      expect(signals.has("attendee@example.com")).toBe(true);
      expect(signals.get("attendee@example.com")?.has_calendar_meeting).toBe(true);
    });

    it("excludes self from signals", () => {
      const envelopes = [
        {
          sourceType: "googlecalendar" as const,
          captureType: "meeting" as const,
          externalId: "1",
          title: "Meeting",
          occurredAt: "2024-07-12T10:00:00Z",
          participants: [
            { email: "me@test.com", name: "Me", role: "organizer" as const },
          ],
          threadId: null,
          extracted: {},
          raw: {},
          noise: null,
        },
      ];

      const signals = adapter.deriveSignals!(envelopes, { userEmail: "me@test.com" });
      expect(signals.has("me@test.com")).toBe(false);
    });
  });
});
