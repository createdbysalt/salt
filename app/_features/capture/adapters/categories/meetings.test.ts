import { describe, it, expect } from "vitest";
import { createMeetingsCategoryAdapter, getMeetingsAdapter } from "./meetings";
import { runAdapterConformance } from "../adapter-conformance";

const FIREFLIES_TRANSCRIPT = {
  id: "tr-abc123",
  title: "Kickoff — Acme rebrand",
  date: 1754500000000,
  duration: 32.4,
  participants: ["you@usesalt.io", "grace@acmecreative.co"],
  meeting_attendees: [
    { displayName: "You", email: "you@usesalt.io" },
    { displayName: "Grace Chen", email: "grace@acmecreative.co" },
  ],
  summary: {
    overview: "Aligned on rebrand scope, timeline, and next steps.",
    action_items:
      "- Send the revised proposal by Friday\n- Book the brand workshop\n- Share moodboard references",
  },
  transcript_url: "https://app.fireflies.ai/view/tr-abc123",
};

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
});
