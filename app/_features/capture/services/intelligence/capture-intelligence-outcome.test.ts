import { describe, it, expect } from "vitest";
import {
  categoryFromEnrichment,
  mapOutcomeToCategory,
  mergeIntelligenceMeta,
  readIntelligenceMeta,
  resolveCaptureIntelligenceOutcome,
  shouldReanalyzeCapture,
} from "./capture-intelligence-outcome";

describe("capture-intelligence-outcome", () => {
  it("merges and reads intelligence meta on extracted_data", () => {
    const merged = mergeIntelligenceMeta(
      { type: "message", subject: "Hello" },
      {
        outcome: "no_signal",
        scanned_at: "2026-06-13T12:00:00.000Z",
      }
    );
    expect(readIntelligenceMeta(merged)).toEqual({
      outcome: "no_signal",
      scanned_at: "2026-06-13T12:00:00.000Z",
    });
  });

  it("prefers active finding link over stored no_signal meta", () => {
    expect(
      resolveCaptureIntelligenceOutcome({
        intelligenceMeta: { outcome: "no_signal", scanned_at: "2026-01-01" },
        findingLink: {
          finding_id: "f1",
          finding_type: "needs_routing",
          finding_state: "needs_you",
        },
        routingState: "pending",
      })
    ).toBe("finding_created");
  });

  it("maps dismissed findings to no_signal when capture meta was updated", () => {
    expect(
      resolveCaptureIntelligenceOutcome({
        intelligenceMeta: { outcome: "no_signal", scanned_at: "2026-06-13T12:00:00.000Z" },
        findingLink: {
          finding_id: "f1",
          finding_type: "new_org",
          finding_state: "dismissed",
        },
        routingState: "pending",
      })
    ).toBe("no_signal");
  });

  it("maps stale finding_created meta without active link to no_signal", () => {
    expect(
      resolveCaptureIntelligenceOutcome({
        intelligenceMeta: {
          outcome: "finding_created",
          scanned_at: "2026-06-13T12:00:00.000Z",
          finding_id: "f1",
        },
        findingLink: null,
        routingState: "pending",
      })
    ).toBe("no_signal");
  });

  it("maps legacy routed state when never scanned", () => {
    expect(
      resolveCaptureIntelligenceOutcome({
        intelligenceMeta: null,
        findingLink: null,
        routingState: "routed",
      })
    ).toBe("routed");
  });

  it("treats no_signal as terminal, retries scan_error, and honors explicit rescan", () => {
    // Phase 6 scan policy: the LLM gets at most one look — no_signal rows
    // (gate-stamped or scan-derived) are not re-analyzed on later scans.
    expect(
      shouldReanalyzeCapture({
        outcome: "no_signal",
        scanned_at: "2026-06-13T12:00:00.000Z",
      })
    ).toBe(false);
    expect(
      shouldReanalyzeCapture({
        outcome: "scan_error",
        scanned_at: "2026-06-13T12:00:00.000Z",
      })
    ).toBe(true);
    expect(
      shouldReanalyzeCapture({
        outcome: "finding_created",
        scanned_at: "2026-06-13T12:00:00.000Z",
        finding_id: "f1",
      })
    ).toBe(false);
    expect(shouldReanalyzeCapture(null)).toBe(true);
    expect(
      shouldReanalyzeCapture(
        { outcome: "no_signal", scanned_at: "2026-06-13T12:00:00.000Z" },
        { rescan: true }
      )
    ).toBe(true);
    expect(
      shouldReanalyzeCapture(
        { outcome: "finding_created", scanned_at: "2026-06-13T12:00:00.000Z" },
        { rescan: true }
      )
    ).toBe(true);
  });

  describe("signal_unrouted (Plays canon Phase 2 — route-signal eviction)", () => {
    const scannedAt = "2026-08-08T12:00:00.000Z";

    it("round-trips through extracted_data meta", () => {
      const merged = mergeIntelligenceMeta(
        { type: "message", subject: "Hello" },
        { outcome: "signal_unrouted", scanned_at: scannedAt }
      );
      expect(readIntelligenceMeta(merged)).toEqual({
        outcome: "signal_unrouted",
        scanned_at: scannedAt,
      });
    });

    it("is terminal for the scan loop — the LLM got its one look", () => {
      expect(
        shouldReanalyzeCapture({ outcome: "signal_unrouted", scanned_at: scannedAt })
      ).toBe(false);
      expect(
        shouldReanalyzeCapture(
          { outcome: "signal_unrouted", scanned_at: scannedAt },
          { rescan: true }
        )
      ).toBe(true);
    });

    it("resolves honestly without any finding link", () => {
      expect(
        resolveCaptureIntelligenceOutcome({
          intelligenceMeta: { outcome: "signal_unrouted", scanned_at: scannedAt },
          findingLink: null,
          routingState: "pending",
        })
      ).toBe("signal_unrouted");
    });

    it("maps to the no-signal category — nothing was queued for the user", () => {
      expect(mapOutcomeToCategory("signal_unrouted")).toBe("no-signal");
    });
  });

  describe("routed honesty (memory category)", () => {
    it("maps routed to memory, not no-signal — the capture fed Memory", () => {
      expect(mapOutcomeToCategory("routed")).toBe("memory");
      expect(mapOutcomeToCategory("dismissed")).toBe("no-signal");
    });

    it("routing beats the enriched-but-undispatched fallback", () => {
      expect(
        categoryFromEnrichment(
          { enriched_at: "2026-08-06T12:00:00.000Z", signals_matched: [], plays_dispatched: [] },
          "routed"
        )
      ).toBe("memory");
    });
  });

  it("defaults to awaiting_scan for pending gmail captures", () => {
    expect(
      resolveCaptureIntelligenceOutcome({
        intelligenceMeta: null,
        findingLink: null,
        routingState: "pending",
      })
    ).toBe("awaiting_scan");
  });

  describe("finding honesty (Needs Review category)", () => {
    it("maps finding_created to finding, not queued — a scan finding is not a triggered play", () => {
      expect(mapOutcomeToCategory("finding_created")).toBe("finding");
    });

    it("a finding survives enrichment with no dispatched plays", () => {
      expect(
        categoryFromEnrichment(
          { enriched_at: "2026-08-06T12:00:00.000Z", signals_matched: [], plays_dispatched: [] },
          "finding_created"
        )
      ).toBe("finding");
    });

    it("a real dispatched play still outranks a finding", () => {
      expect(
        categoryFromEnrichment(
          {
            enriched_at: "2026-08-06T12:00:00.000Z",
            plays_dispatched: [{ play_slug: "follow-up", play_run_id: "r1" }],
          },
          "finding_created"
        )
      ).toBe("queued");
    });
  });

  describe("categoryFromEnrichment", () => {
    const enrichedAt = "2026-08-06T12:00:00.000Z";

    it("falls back to intelligence outcome when not enriched", () => {
      expect(categoryFromEnrichment(null, "awaiting_scan")).toBe("processing");
      expect(categoryFromEnrichment({}, "scan_error")).toBe("error");
    });

    it("only reports Triggered Play when a play was actually dispatched", () => {
      expect(
        categoryFromEnrichment(
          {
            enriched_at: enrichedAt,
            signals_matched: ["capture_email_received", "is_reply"],
            linked_records: [{ surface: "people", entity_id: "p1" }],
            plays_dispatched: [],
          },
          "awaiting_scan"
        )
      ).toBe("no-signal");

      expect(
        categoryFromEnrichment(
          {
            enriched_at: enrichedAt,
            signals_matched: ["capture_email_received"],
            plays_dispatched: [{ play_slug: "follow-up", play_run_id: "r1" }],
          },
          "awaiting_scan"
        )
      ).toBe("queued");
    });

    it("maps noise-classified emails to no-signal even with dispatches recorded", () => {
      expect(
        categoryFromEnrichment(
          {
            enriched_at: enrichedAt,
            signals_matched: ["capture_email_received", "email_classified_noise"],
            plays_dispatched: [{ play_slug: "follow-up", play_run_id: "r1" }],
          },
          "awaiting_scan"
        )
      ).toBe("no-signal");
    });
  });
});
