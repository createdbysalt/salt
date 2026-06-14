import { describe, it, expect } from "vitest";
import {
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

  it("re-analyzes no_signal and scan_error captures unless rescan is forced off", () => {
    expect(
      shouldReanalyzeCapture({
        outcome: "no_signal",
        scanned_at: "2026-06-13T12:00:00.000Z",
      })
    ).toBe(true);
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
        { outcome: "finding_created", scanned_at: "2026-06-13T12:00:00.000Z" },
        { rescan: true }
      )
    ).toBe(true);
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
});
