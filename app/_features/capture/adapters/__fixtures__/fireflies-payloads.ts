/**
 * Golden payload fixtures for the Fireflies capture adapter.
 *
 * PROVENANCE: synthesized 2026-08-01 from the Fireflies transcript object
 * shape (the per-item form the meetings backfill consumes) — not yet
 * captured live. Replace with a live row when the first Fireflies backfill
 * runs against a real account.
 */

/** Transcript with summary + action items (backfill). */
export const FIREFLIES_TRANSCRIPT = {
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
