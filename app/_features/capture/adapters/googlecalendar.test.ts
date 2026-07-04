import { describe, expect, it } from "vitest";
import { runAdapterConformance } from "./adapter-conformance";
import { googleCalendarCaptureAdapter } from "./googlecalendar";
import {
  CALENDAR_EVENT_ALL_DAY,
  CALENDAR_EVENT_CANCELLED,
  CALENDAR_EVENT_EMPTY,
  CALENDAR_EVENT_NO_ID,
  CALENDAR_EVENT_RECURRING_INSTANCE,
  CALENDAR_EVENT_TIMED,
  CALENDAR_TRIGGER_EVENT_CREATED,
} from "./__fixtures__/googlecalendar-payloads";

describe("google calendar capture adapter conformance", () => {
  it("passes the shared harness across payload shapes", () => {
    runAdapterConformance(googleCalendarCaptureAdapter, [
      {
        name: "timed meeting",
        payload: CALENDAR_EVENT_TIMED,
        expectExternalId: "6ku8m2p4v9d1c3e5",
      },
      {
        name: "all-day event",
        payload: CALENDAR_EVENT_ALL_DAY,
        expectExternalId: "7lv9n3q5w0e2d4f6",
      },
      {
        name: "recurring instance",
        payload: CALENDAR_EVENT_RECURRING_INSTANCE,
        expectExternalId: "8mw0o4r6x1f3e5g7_20260709T140000Z",
      },
      {
        name: "event-created trigger payload (flat snake_case)",
        payload: CALENDAR_TRIGGER_EVENT_CREATED,
        expectExternalId: "1pz3r7u9a4i6h8j0",
      },
      { name: "cancelled declines", payload: CALENDAR_EVENT_CANCELLED, expectExternalId: null },
      { name: "empty event declines", payload: CALENDAR_EVENT_EMPTY, expectExternalId: null },
      { name: "missing id declines", payload: CALENDAR_EVENT_NO_ID, expectExternalId: null },
      { name: "non-object declines", payload: 42, expectExternalId: null },
    ]);
  });

  it("maps organizer and attendees with lowered emails", () => {
    const envelope = googleCalendarCaptureAdapter.normalize(CALENDAR_EVENT_TIMED);
    expect(envelope?.participants).toContainEqual({
      email: "you@usesalt.io",
      name: "You",
      role: "organizer",
    });
    expect(envelope?.participants.filter((p) => p.role === "attendee")).toHaveLength(2);
    expect(envelope?.extracted.organizer).toBe("you@usesalt.io");
  });

  it("uses the recurring series id as threadId", () => {
    const envelope = googleCalendarCaptureAdapter.normalize(
      CALENDAR_EVENT_RECURRING_INSTANCE,
    );
    expect(envelope?.threadId).toBe("8mw0o4r6x1f3e5g7");
  });

  it("maps the flat trigger payload's times and organizer", () => {
    const envelope = googleCalendarCaptureAdapter.normalize(
      CALENDAR_TRIGGER_EVENT_CREATED,
    );
    expect(envelope?.occurredAt).toBe("2026-07-16T13:00:00.000Z");
    expect(envelope?.extracted.end).toBe("2026-07-16T13:30:00.000Z");
    expect(envelope?.participants).toContainEqual({
      email: "grace@acmecreative.co",
      name: "Grace Hopper",
      role: "organizer",
    });
  });

  it("normalizes all-day dates to ISO timestamps", () => {
    const envelope = googleCalendarCaptureAdapter.normalize(CALENDAR_EVENT_ALL_DAY);
    expect(envelope?.occurredAt).toBe("2026-07-15T00:00:00.000Z");
  });
});
