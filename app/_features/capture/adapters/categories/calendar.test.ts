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
