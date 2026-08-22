import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Meeting-entity signal emission + stable intake identifiers (audit #7).
 *
 * Calendar-source meeting captures must emit a `calendar_event_created`
 * signal carrying everything the intake tier needs to create or suggest a
 * meeting record. Transcript sources (fireflies et al.) share capture_type
 * "meeting" but describe past recordings — they never emit record signals.
 * File/document identifiers must be stable across runs so evidence
 * accumulates and dismissals stick.
 */

vi.mock("server-only", () => ({}));

const h = vi.hoisted(() => {
  function fakeSupabase() {
    const builder = {
      select: () => builder,
      eq: () => builder,
      not: () => builder,
      then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null }),
    };
    return { from: () => builder };
  }
  return { fakeSupabase };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.fakeSupabase(),
}));

import { classifyEmailCapture, classifyMeetingCapture } from "./classifier";
import type { MeetingCaptureData } from "./classifier";

beforeEach(() => {
  vi.restoreAllMocks();
});

const baseMeeting: MeetingCaptureData = {
  title: "Kickoff: Brand Refresh",
  attendees: ["client@acme.com"],
  organizer: "client@acme.com",
  startTime: "2026-08-10T17:00:00.000Z",
  endTime: "2026-08-10T17:30:00.000Z",
  location: "123 Main St",
  meetingUrl: "https://meet.google.com/abc-defg-hij",
  externalId: "event-123",
  provider: "googlecalendar",
};

describe("classifyMeetingCapture — meeting-entity record signal", () => {
  it("emits calendar_event_created with the fields record creation needs", async () => {
    const signals = await classifyMeetingCapture("ws-1", baseMeeting, "cap-1");

    const meetingSignal = signals.find(
      (s) => s.entityType === "meeting" && s.signal === "calendar_event_created"
    );
    expect(meetingSignal).toBeDefined();
    expect(meetingSignal?.identifier).toBe("googlecalendar:event-123");
    expect(meetingSignal?.extractedData).toMatchObject({
      title: "Kickoff: Brand Refresh",
      name: "Kickoff: Brand Refresh",
      start_time: "2026-08-10T17:00:00.000Z",
      end_time: "2026-08-10T17:30:00.000Z",
      location: "123 Main St",
      meeting_url: "https://meet.google.com/abc-defg-hij",
      external_event_id: "event-123",
      provider: "googlecalendar",
    });
    expect(JSON.parse(meetingSignal!.extractedData.attendees)).toEqual([
      "client@acme.com",
    ]);
  });

  it("stacks zoom_invite_detected on the same evidence identifier", async () => {
    const signals = await classifyMeetingCapture("ws-1", baseMeeting, "cap-1");

    const meetingSignals = signals.filter((s) => s.entityType === "meeting");
    const identifiers = new Set(meetingSignals.map((s) => s.identifier));
    expect(identifiers.size).toBe(1);
    expect(meetingSignals.map((s) => s.signal)).toEqual(
      expect.arrayContaining(["calendar_event_created", "zoom_invite_detected"])
    );
  });

  it("falls back to title:startTime when no external id is available", async () => {
    const signals = await classifyMeetingCapture(
      "ws-1",
      { ...baseMeeting, externalId: undefined, meetingUrl: undefined },
      "cap-1"
    );

    const meetingSignal = signals.find((s) => s.entityType === "meeting");
    expect(meetingSignal?.identifier).toBe(
      "Kickoff: Brand Refresh:2026-08-10T17:00:00.000Z"
    );
  });

  it("never emits meeting-entity signals for transcript sources", async () => {
    const signals = await classifyMeetingCapture(
      "ws-1",
      { ...baseMeeting, provider: "fireflies" },
      "cap-1"
    );

    expect(signals.filter((s) => s.entityType === "meeting")).toHaveLength(0);
    // Person detection for unknown attendees still works
    expect(
      signals.some(
        (s) => s.entityType === "person" && s.signal === "meeting_attendee_unknown"
      )
    ).toBe(true);
  });

  it("requires a start time — a title alone is not a creatable meeting", async () => {
    const signals = await classifyMeetingCapture(
      "ws-1",
      { ...baseMeeting, startTime: "" },
      "cap-1"
    );

    expect(signals.filter((s) => s.entityType === "meeting")).toHaveLength(0);
  });
});

describe("classifyEmailCapture — stable document identifiers", () => {
  const contractEmail = {
    from: "client@acme.com",
    to: ["me@studio.com"],
    subject: "Contract for Acme project",
    hasAttachments: true,
  };

  it("produces identical file identifiers across runs (no timestamps)", async () => {
    const first = await classifyEmailCapture("ws-1", contractEmail, "cap-1");
    const second = await classifyEmailCapture("ws-1", contractEmail, "cap-2");

    const firstFile = first.find((s) => s.entityType === "resource");
    const secondFile = second.find((s) => s.entityType === "resource");

    expect(firstFile?.signal).toBe("contract_detected");
    expect(firstFile?.identifier).toBeDefined();
    expect(firstFile?.identifier).toBe(secondFile?.identifier);
    expect(firstFile?.identifier).not.toMatch(/\d{13}/);
  });

  it("keys the file evidence row to sender + subject", async () => {
    const signals = await classifyEmailCapture("ws-1", contractEmail, "cap-1");

    const fileSignal = signals.find((s) => s.entityType === "resource");
    expect(fileSignal?.identifier).toBe(
      "file:client@acme.com:contract for acme project"
    );
  });

  it("keeps billing identifiers stable too", async () => {
    const invoiceEmail = {
      from: "billing@vendor.com",
      to: ["me@studio.com"],
      subject: "Invoice #1042 due",
      hasAttachments: true,
    };

    const first = await classifyEmailCapture("ws-1", invoiceEmail, "cap-1");
    const second = await classifyEmailCapture("ws-1", invoiceEmail, "cap-2");

    const firstBilling = first.find((s) => s.entityType === "billing");
    const secondBilling = second.find((s) => s.entityType === "billing");
    expect(firstBilling?.identifier).toBeDefined();
    expect(firstBilling?.identifier).toBe(secondBilling?.identifier);
  });
});
