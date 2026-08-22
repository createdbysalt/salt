import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * processCaptureForEvidence — meeting capture routing (audit #7).
 *
 * Meeting-entity signals route through routeIntakeProposal. Calendar-fact
 * signals (calendar_event_created, zoom_invite_detected) are objective
 * facts, not inferences — they bypass the P6 calibration gate and create
 * directly. Person/org/work signals keep the addSignalToEvidence path.
 * Extraction must read the calendar adapters' actual field names
 * (meeting_link, organizer_email, start/end) and carry source_external_id
 * for dedupe.
 */

const h = vi.hoisted(() => {
  const meetingCapture = {
    id: "cap-1",
    workspace_id: "ws-1",
    capture_type: "meeting",
    source_type: "googlecalendar",
    source_external_id: "event-123",
    extracted_data: {
      summary: "Kickoff: Brand Refresh",
      start: "2026-08-10T17:00:00.000Z",
      end: "2026-08-10T17:30:00.000Z",
      organizer_email: "client@acme.com",
      attendees: [{ email: "client@acme.com", name: "Client" }],
      location: "123 Main St",
      meeting_link: "https://meet.google.com/abc-defg-hij",
    },
    raw_payload: { eventId: "event-123", source: "composio_trigger" },
  };

  const state = { capture: meetingCapture as Record<string, unknown> };

  function adminClient() {
    return {
      from: (table: string) => {
        if (table === "capture_events") {
          const builder = {
            select: () => builder,
            eq: () => builder,
            single: async () => ({ data: state.capture, error: null }),
          };
          return builder;
        }
        // Classifier member/record lookups (admin client — the evidence lane
        // runs from crons with no request scope) — everything unknown.
        const builder = {
          select: () => builder,
          eq: () => builder,
          not: () => builder,
          then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
            resolve({ data: [], error: null }),
        };
        return builder;
      },
    };
  }

  return {
    meetingCapture,
    state,
    adminClient,
    addSignalToEvidence: vi.fn(),
    routeIntakeProposal: vi.fn(),
    shouldAutoApply: vi.fn(),
  };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.adminClient(),
}));
vi.mock("./add-signal", () => ({
  addSignalToEvidence: h.addSignalToEvidence,
}));
vi.mock("./route-intake-proposal", () => ({
  routeIntakeProposal: h.routeIntakeProposal,
}));
vi.mock(
  "@/app/_features/capture/services/intelligence/record-capture-outcome",
  () => ({ shouldAutoApply: h.shouldAutoApply })
);

import { processCaptureForEvidence } from "./process-capture";

beforeEach(() => {
  h.state.capture = h.meetingCapture;
  h.addSignalToEvidence.mockReset();
  h.routeIntakeProposal.mockReset();
  h.shouldAutoApply.mockReset();
  h.addSignalToEvidence.mockResolvedValue({
    evidenceId: "ev-1",
    newScore: 2.5,
    previousScore: 0,
    action: "watch",
    isNew: true,
  });
  h.routeIntakeProposal.mockResolvedValue({ outcome: "suggested", evidenceId: "ev-2" });
});

describe("processCaptureForEvidence — calendar meeting capture", () => {
  it("routes meeting signals through routeIntakeProposal with the calibration gate", async () => {
    h.shouldAutoApply.mockResolvedValue(true);

    const result = await processCaptureForEvidence("cap-1");

    expect(result.processed).toBe(true);

    const meetingCalls = h.routeIntakeProposal.mock.calls.filter(
      ([input]) => input.entityType === "meeting"
    );
    expect(meetingCalls.length).toBeGreaterThanOrEqual(1);

    const [created] = meetingCalls[0];
    expect(created).toMatchObject({
      workspaceId: "ws-1",
      identifier: "googlecalendar:event-123",
      signals: ["calendar_event_created"],
      captureId: "cap-1",
      autoApply: true,
    });
    // Extracted fields carry everything record creation needs, read from
    // the adapter's actual field names.
    expect(created.extractedFields).toMatchObject({
      title: { value: "Kickoff: Brand Refresh" },
      start_time: { value: "2026-08-10T17:00:00.000Z" },
      end_time: { value: "2026-08-10T17:30:00.000Z" },
      location: { value: "123 Main St" },
      meeting_url: { value: "https://meet.google.com/abc-defg-hij" },
      external_event_id: { value: "event-123" },
      provider: { value: "googlecalendar" },
    });
    expect(created.extractedFields.attendees.value).toBe(
      JSON.stringify(["client@acme.com"])
    );

    // Meeting signals never touch the accumulate-only path.
    const meetingAccumulations = h.addSignalToEvidence.mock.calls.filter(
      ([input]) => input.entityType === "meeting"
    );
    expect(meetingAccumulations).toHaveLength(0);
  });

  it("auto-applies calendar-fact signals even when the workspace is below calibration", async () => {
    h.shouldAutoApply.mockResolvedValue(false);

    await processCaptureForEvidence("cap-1");

    const meetingCalls = h.routeIntakeProposal.mock.calls.filter(
      ([input]) => input.entityType === "meeting"
    );
    expect(meetingCalls.length).toBeGreaterThanOrEqual(1);
    for (const [input] of meetingCalls) {
      expect(input.autoApply).toBe(true);
    }
    // The calibration gate is never consulted for calendar facts.
    expect(h.shouldAutoApply).not.toHaveBeenCalled();
  });

  it("still routes person signals through addSignalToEvidence (organizer read from organizer_email)", async () => {
    h.shouldAutoApply.mockResolvedValue(false);

    await processCaptureForEvidence("cap-1");

    const personCalls = h.addSignalToEvidence.mock.calls.filter(
      ([input]) => input.entityType === "person"
    );
    expect(personCalls).toHaveLength(1);
    expect(personCalls[0][0]).toMatchObject({
      identifier: "client@acme.com",
      signal: "meeting_attendee_unknown",
    });
  });
});

describe("processCaptureForEvidence — ICS invite in an email capture", () => {
  function icsCapture(): Record<string, unknown> {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "SUMMARY:Kickoff: Brand Refresh",
      "DTSTART:20260810T170000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const data = Buffer.from(ics, "utf-8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    return {
      id: "cap-ics",
      workspace_id: "ws-1",
      capture_type: "message",
      source_type: "gmail",
      source_external_id: "msg-1",
      extracted_data: {
        from: "calendar-notification@google.com",
        to: ["me@studio.com"],
        subject: "Invitation: Kickoff: Brand Refresh",
      },
      raw_payload: {
        payload: {
          mimeType: "multipart/mixed",
          parts: [
            { mimeType: "text/plain", body: { data: "" } },
            { mimeType: "text/calendar", body: { data } },
          ],
        },
      },
    };
  }

  it("routes a calendar_invite_received proposal through the calibration gate", async () => {
    h.state.capture = icsCapture();
    h.shouldAutoApply.mockResolvedValue(false);

    await processCaptureForEvidence("cap-ics");

    const meetingCalls = h.routeIntakeProposal.mock.calls.filter(
      ([input]) => input.entityType === "meeting"
    );
    expect(meetingCalls).toHaveLength(1);
    const [input] = meetingCalls[0];
    expect(input).toMatchObject({
      workspaceId: "ws-1",
      identifier: "ics:cap-ics",
      signals: ["calendar_invite_received"],
      captureId: "cap-ics",
      // Heuristic, not a calendar fact — the gate decides.
      autoApply: false,
    });
    expect(input.extractedFields).toMatchObject({
      title: { value: "Kickoff: Brand Refresh" },
      datetime: { value: "2026-08-10T17:00:00.000Z" },
      organizer: { value: "calendar-notification@google.com" },
    });
    expect(h.shouldAutoApply).toHaveBeenCalled();
  });

  it("does not emit the invite signal when the email carries no ICS part", async () => {
    h.state.capture = {
      ...icsCapture(),
      raw_payload: { payload: { mimeType: "text/plain", body: { data: "" } } },
    };
    h.shouldAutoApply.mockResolvedValue(false);

    await processCaptureForEvidence("cap-ics");

    const meetingCalls = h.routeIntakeProposal.mock.calls.filter(
      ([input]) => input.entityType === "meeting"
    );
    expect(meetingCalls).toHaveLength(0);
  });
});
