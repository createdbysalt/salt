import { describe, it, expect } from "vitest";
import { createMeetingsCategoryAdapter, getMeetingsAdapter } from "./meetings";
import { runAdapterConformance } from "../adapter-conformance";
import { FIREFLIES_TRANSCRIPT } from "../__fixtures__/fireflies-payloads";

describe("meetings category adapter", () => {
  describe("getMeetingsAdapter", () => {
    it("returns adapter for fireflies", () => {
      const adapter = getMeetingsAdapter("fireflies");
      expect(adapter.sourceType).toBe("fireflies");
    });

    it("returns adapter with generic extraction for unknown provider", () => {
      const adapter = getMeetingsAdapter("unknown");
      expect(adapter.sourceType).toBe("unknown");
    });
  });

  describe("fireflies normalization", () => {
    const adapter = createMeetingsCategoryAdapter("fireflies");

    it("passes conformance", () => {
      runAdapterConformance(adapter, [
        {
          name: "transcript",
          payload: FIREFLIES_TRANSCRIPT,
          expectExternalId: "tr-abc123",
        },
        { name: "no id", payload: { title: "?" }, expectExternalId: null },
      ]);
    });

    it("extracts duration, participants, summary, and action items (detail contract)", () => {
      const envelope = adapter.normalize(FIREFLIES_TRANSCRIPT);

      expect(envelope).not.toBeNull();
      expect(envelope?.title).toBe("Kickoff — Acme rebrand");
      expect(envelope?.occurredAt).toBe(new Date(1754500000000).toISOString());
      expect(envelope?.extracted.duration_minutes).toBe(32);
      expect(envelope?.extracted.participants).toEqual(["You", "Grace Chen"]);
      expect(envelope?.extracted.summary).toBe(
        "Aligned on rebrand scope, timeline, and next steps."
      );
      expect(envelope?.extracted.action_items).toEqual([
        "Send the revised proposal by Friday",
        "Book the brand workshop",
        "Share moodboard references",
      ]);
      expect(envelope?.extracted.deep_link).toBe(
        "https://app.fireflies.ai/view/tr-abc123"
      );
      expect(envelope?.participants).toHaveLength(2);
      expect(envelope?.participants[1].email).toBe("grace@acmecreative.co");
    });

    it("handles array-shaped action items", () => {
      const envelope = adapter.normalize({
        id: "tr-2",
        title: "Sync",
        summary: {
          overview: "Quick sync.",
          action_items: ["Follow up with Ben", { text: "Update the deck" }],
        },
      });
      expect(envelope?.extracted.action_items).toEqual([
        "Follow up with Ben",
        "Update the deck",
      ]);
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("generic meetings extraction", () => {
    const adapter = createMeetingsCategoryAdapter("otter");

    it("normalizes duration to minutes and extracts participants", () => {
      const envelope = adapter.normalize({
        id: "m-1",
        title: "Client call",
        date: "2026-08-01T15:00:00Z",
        duration: 45,
        attendees: [
          { email: "client@example.com", name: "Client" },
          { email: "you@usesalt.io", name: "You" },
        ],
        summary: "Discussed scope.",
        action_items: ["Send recap"],
      });

      expect(envelope?.extracted.duration_minutes).toBe(45);
      expect(envelope?.extracted.participants).toEqual(["Client", "You"]);
      expect(envelope?.extracted.summary).toBe("Discussed scope.");
      expect(envelope?.extracted.action_items).toEqual(["Send recap"]);
      expect(envelope?.participants).toHaveLength(2);
    });

    it("returns null for invalid payload", () => {
      expect(adapter.normalize(null)).toBeNull();
      expect(adapter.normalize({})).toBeNull();
    });
  });

  describe("deriveSignals", () => {
    const adapter = createMeetingsCategoryAdapter("fireflies");

    it("sets has_calendar_meeting for meeting participants", () => {
      const envelope = adapter.normalize(FIREFLIES_TRANSCRIPT);
      const signals = adapter.deriveSignals!([envelope!], { userEmail: null });
      expect(signals.get("grace@acmecreative.co")?.has_calendar_meeting).toBe(true);
    });
  });

  describe("deriveRecordSignals (Track B: meeting-record routing)", () => {
    const adapter = createMeetingsCategoryAdapter("fireflies");

    it("derives type, summary, attendees, and attendance evidence per transcript", () => {
      const envelope = adapter.normalize(FIREFLIES_TRANSCRIPT);
      const derived = adapter.deriveRecordSignals!([envelope!], {
        userEmail: "you@usesalt.io",
      });

      const meeting = derived.meetings?.get("tr-abc123");
      expect(meeting).toBeDefined();
      expect(meeting?.title).toBe("Kickoff — Acme rebrand");
      expect(meeting?.occurredAt).toBe(new Date(1754500000000).toISOString());
      expect(meeting?.attendanceEvidence).toBe(true);
      expect(meeting?.signalValues.meeting_type_inferred).toBe("kickoff");
      expect(meeting?.signalValues.meeting_summary_extracted).toBe(
        "Aligned on rebrand scope, timeline, and next steps."
      );
      expect(meeting?.attendees).toEqual([
        { name: "You", email: "you@usesalt.io", role: "team" },
        { name: "Grace Chen", email: "grace@acmecreative.co", role: "client" },
      ]);
    });

    it("infers the meeting type from title keywords only", () => {
      const cases: Array<[string, string | undefined]> = [
        ["Discovery call with Acme", "discovery"],
        ["Acme kickoff", "kickoff"],
        ["Weekly check-in", "check-in"],
        ["Brand review walkthrough", "review"],
        ["Proposal presentation", "presentation"],
        ["Design workshop", "workshop"],
        ["Candidate interview", "interview"],
        ["Grace <> You", undefined],
      ];
      for (const [title, expected] of cases) {
        const envelope = adapter.normalize({
          id: `tr-${title.length}`,
          title,
          date: 1754500000000,
          participants: [],
        });
        const derived = adapter.deriveRecordSignals!([envelope!], {
          userEmail: null,
        });
        const meeting = derived.meetings?.get(`tr-${title.length}`);
        expect(meeting?.signalValues.meeting_type_inferred, title).toBe(expected);
      }
    });

    it("marks every participant team/client against the connected user", () => {
      const envelope = adapter.normalize(FIREFLIES_TRANSCRIPT);
      const derived = adapter.deriveRecordSignals!([envelope!], {
        userEmail: null,
      });
      const meeting = derived.meetings?.get("tr-abc123");
      // No userEmail context: nobody is attested as team.
      expect(meeting?.attendees.every((a) => a.role === "client")).toBe(true);
    });

    it("omits the summary signal when the payload has none", () => {
      const envelope = adapter.normalize({
        id: "tr-nosummary",
        title: "Sync",
        date: 1754500000000,
        participants: ["grace@acmecreative.co"],
      });
      const derived = adapter.deriveRecordSignals!([envelope!], {
        userEmail: null,
      });
      const meeting = derived.meetings?.get("tr-nosummary");
      expect(meeting?.signalValues.meeting_summary_extracted).toBeUndefined();
      expect(meeting?.attendees).toEqual([
        { name: "grace@acmecreative.co", email: "grace@acmecreative.co", role: "client" },
      ]);
    });
  });
});
