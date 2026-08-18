import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureEnvelope } from "../adapters/types";

interface MockRow {
  extracted_data: Record<string, unknown> | null;
}

let existingRow: MockRow | null;
const updates: Array<Record<string, unknown>> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: existingRow, error: null }),
            }),
          }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        return {
          eq: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      },
    }),
  }),
}));

import {
  applyCaptureLifecycleUpdate,
  isTerminalCalendarUpdate,
} from "./capture-lifecycle";

const SELF = "me@studio.com";

function meetingEnvelope(extracted: Record<string, unknown>): CaptureEnvelope {
  return {
    sourceType: "googlecalendar",
    captureType: "meeting",
    externalId: "evt-1",
    title: "Intro call",
    occurredAt: "2026-08-17T15:00:00Z",
    participants: [
      { email: SELF, name: "Me", role: "organizer" },
      { email: "sarah@acme.com", name: "Sarah", role: "attendee" },
    ],
    threadId: null,
    extracted,
    raw: { eventId: "evt-1" },
    noise: null,
  };
}

beforeEach(() => {
  existingRow = null;
  updates.length = 0;
});

describe("isTerminalCalendarUpdate", () => {
  it("is true for cancelled events", () => {
    expect(
      isTerminalCalendarUpdate(meetingEnvelope({ status: "cancelled" }), SELF),
    ).toBe(true);
  });

  it("is true for Calendly-spelled canceled events", () => {
    expect(
      isTerminalCalendarUpdate(meetingEnvelope({ status: "canceled" }), SELF),
    ).toBe(true);
  });

  it("is true when the user declined", () => {
    expect(
      isTerminalCalendarUpdate(
        meetingEnvelope({
          status: "confirmed",
          attendees: [
            { email: SELF, responseStatus: "declined" },
            { email: "sarah@acme.com", responseStatus: "accepted" },
          ],
        }),
        SELF,
      ),
    ).toBe(true);
  });

  it("is false for a healthy confirmed event", () => {
    expect(
      isTerminalCalendarUpdate(
        meetingEnvelope({
          status: "confirmed",
          attendees: [{ email: SELF, responseStatus: "accepted" }],
        }),
        SELF,
      ),
    ).toBe(false);
  });

  it("is false for non-meeting captures", () => {
    const envelope = meetingEnvelope({ status: "cancelled" });
    envelope.captureType = "message";
    expect(isTerminalCalendarUpdate(envelope, SELF)).toBe(false);
  });
});

describe("applyCaptureLifecycleUpdate", () => {
  it("updates the stored row when the event was cancelled after capture", async () => {
    existingRow = { extracted_data: { status: "confirmed", summary: "Intro call" } };

    const result = await applyCaptureLifecycleUpdate(
      "ws-1",
      meetingEnvelope({ status: "cancelled" }),
      SELF,
    );

    expect(result).toBe("updated");
    expect(updates).toHaveLength(1);
    const patch = updates[0].extracted_data as Record<string, unknown>;
    expect(patch.status).toBe("cancelled");
    // Untouched fields survive the merge.
    expect(patch.summary).toBe("Intro call");
  });

  it("records the user's decline on the stored row", async () => {
    existingRow = { extracted_data: { status: "confirmed" } };

    const result = await applyCaptureLifecycleUpdate(
      "ws-1",
      meetingEnvelope({
        status: "confirmed",
        attendees: [{ email: SELF, responseStatus: "declined" }],
      }),
      SELF,
    );

    expect(result).toBe("updated");
    const patch = updates[0].extracted_data as Record<string, unknown>;
    expect(patch.self_response).toBe("declined");
    expect(patch.status).toBe("confirmed");
  });

  it("is a no-op when the stored state already matches", async () => {
    existingRow = { extracted_data: { status: "cancelled" } };

    const result = await applyCaptureLifecycleUpdate(
      "ws-1",
      meetingEnvelope({ status: "cancelled" }),
      SELF,
    );

    expect(result).toBe("no_change");
    expect(updates).toHaveLength(0);
  });

  it("reports no_existing when the event was never captured", async () => {
    existingRow = null;

    const result = await applyCaptureLifecycleUpdate(
      "ws-1",
      meetingEnvelope({ status: "cancelled" }),
      SELF,
    );

    expect(result).toBe("no_existing");
    expect(updates).toHaveLength(0);
  });

  it("is a no-op when the envelope carries no lifecycle state", async () => {
    existingRow = { extracted_data: { status: "confirmed" } };

    const result = await applyCaptureLifecycleUpdate(
      "ws-1",
      meetingEnvelope({}),
      SELF,
    );

    expect(result).toBe("no_change");
    expect(updates).toHaveLength(0);
  });
});
