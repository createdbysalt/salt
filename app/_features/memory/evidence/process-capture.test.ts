import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * processCaptureForEvidence — meeting capture routing (audit #7).
 *
 * Meeting-entity signals route through routeIntakeProposal with the P6
 * calibration gate (shouldAutoApply), identical to CREATE decisions.
 * Person/org/work signals keep the addSignalToEvidence path. Extraction
 * must read the calendar adapters' actual field names (meeting_link,
 * organizer_email, start/end) and carry source_external_id for dedupe.
 */

const h = vi.hoisted(() => {
  const capture = {
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

  function adminClient() {
    return {
      from: (table: string) => {
        if (table !== "capture_events") throw new Error(`unexpected table ${table}`);
        const builder = {
          select: () => builder,
          eq: () => builder,
          single: async () => ({ data: capture, error: null }),
        };
        return builder;
      },
    };
  }

  // Classifier member/record lookups — everything unknown.
  function serverClient() {
    const builder = {
      select: () => builder,
      eq: () => builder,
      not: () => builder,
      then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null }),
    };
    return { from: () => builder };
  }

  return {
    capture,
    adminClient,
    serverClient,
    addSignalToEvidence: vi.fn(),
    routeIntakeProposal: vi.fn(),
    shouldAutoApply: vi.fn(),
  };
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => h.adminClient(),
}));
vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: async () => h.serverClient(),
}));
vi.mock("./actions", () => ({
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

  it("passes autoApply=false when the workspace is below calibration", async () => {
    h.shouldAutoApply.mockResolvedValue(false);

    await processCaptureForEvidence("cap-1");

    expect(h.routeIntakeProposal).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "meeting", autoApply: false })
    );
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
