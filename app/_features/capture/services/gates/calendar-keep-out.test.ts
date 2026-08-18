import { describe, expect, it } from "vitest";
import type { CaptureEnvelope } from "../../adapters/types";
import { checkCalendarKeepOut, CALENDAR_KEEP_OUT_COPY } from "./calendar-keep-out";

const SELF = "me@studio.com";

function meetingEnvelope(
  overrides: {
    participants?: CaptureEnvelope["participants"];
    extracted?: Record<string, unknown>;
  } = {},
): CaptureEnvelope {
  return {
    sourceType: "googlecalendar",
    captureType: "meeting",
    externalId: "evt-1",
    title: "Sync",
    occurredAt: "2026-08-17T15:00:00Z",
    participants: overrides.participants ?? [
      { email: SELF, name: "Me", role: "organizer" },
      { email: "sarah@acme.com", name: "Sarah", role: "attendee" },
    ],
    threadId: null,
    extracted: overrides.extracted ?? {},
    raw: { eventId: "evt-1" },
    noise: null,
  };
}

describe("checkCalendarKeepOut", () => {
  it("drops cancelled events", () => {
    const decision = checkCalendarKeepOut(
      meetingEnvelope({ extracted: { status: "cancelled" } }),
      SELF,
    );
    expect(decision?.rule).toBe("cancelled");
  });

  it("drops Calendly-spelled canceled events", () => {
    const decision = checkCalendarKeepOut(
      meetingEnvelope({ extracted: { status: "canceled" } }),
      SELF,
    );
    expect(decision?.rule).toBe("cancelled");
  });

  it("drops Google availability eventTypes (OOO, focus time, working location)", () => {
    for (const eventType of ["outOfOffice", "focusTime", "workingLocation"]) {
      const decision = checkCalendarKeepOut(
        meetingEnvelope({ extracted: { eventType } }),
        SELF,
      );
      expect(decision?.rule).toBe("event_type");
    }
  });

  it("lets regular default events through", () => {
    const decision = checkCalendarKeepOut(
      meetingEnvelope({ extracted: { eventType: "default" } }),
      SELF,
    );
    expect(decision).toBeNull();
  });

  it("drops events the user declined", () => {
    const decision = checkCalendarKeepOut(
      meetingEnvelope({
        extracted: {
          attendees: [
            { email: SELF, name: "Me", responseStatus: "declined" },
            { email: "sarah@acme.com", name: "Sarah", responseStatus: "accepted" },
          ],
        },
      }),
      SELF,
    );
    expect(decision?.rule).toBe("self_declined");
  });

  it("drops solo blocks when attendee data is present and no one else is on it", () => {
    const decision = checkCalendarKeepOut(
      meetingEnvelope({
        participants: [{ email: SELF, name: "Me", role: "organizer" }],
        extracted: { attendees_known: true, attendees: [] },
      }),
      SELF,
    );
    expect(decision?.rule).toBe("solo");
  });

  it("keeps events with another person on them", () => {
    const decision = checkCalendarKeepOut(
      meetingEnvelope({
        extracted: {
          attendees_known: true,
          attendees: [{ email: "sarah@acme.com", name: "Sarah" }],
        },
      }),
      SELF,
    );
    expect(decision).toBeNull();
  });

  it("never solo-drops when the payload carried no attendee data (thin trigger shape)", () => {
    const decision = checkCalendarKeepOut(
      meetingEnvelope({
        participants: [{ email: SELF, name: "Me", role: "organizer" }],
        extracted: { attendees_known: false },
      }),
      SELF,
    );
    expect(decision).toBeNull();
  });

  it("treats participants without emails as no company", () => {
    const decision = checkCalendarKeepOut(
      meetingEnvelope({
        participants: [
          { email: SELF, name: "Me", role: "organizer" },
          { email: null, name: "Room 4", role: "attendee" },
        ],
        extracted: { attendees_known: true },
      }),
      SELF,
    );
    expect(decision?.rule).toBe("solo");
  });

  it("exposes user-facing copy for every rule (Sources → Customize transparency)", () => {
    for (const rule of ["cancelled", "self_declined", "event_type", "solo"] as const) {
      expect(CALENDAR_KEEP_OUT_COPY[rule].length).toBeGreaterThan(0);
    }
  });
});
