import { describe, expect, it } from "vitest";
import {
  extractGateReason,
  keptOutCauseFromGateResult,
} from "./admission-gate-result";

describe("extractGateReason", () => {
  it("prefers the rules gate when it decided the outcome (P2 wiring)", () => {
    const reason = extractGateReason({
      gateResults: {
        rules: { action: "drop", gate: "rules", reason: "Keep this sender out" },
        admission: { action: "noise", gate: "admission", reason: "Cold inbound" },
      },
    });

    expect(reason).toBe("Keep this sender out");
  });

  it("still finds legacy blocklist reasons", () => {
    const reason = extractGateReason({
      gateResults: {
        blocklist: { action: "drop", gate: "blocklist", reason: "Blocked by domain blocklist" },
      },
    });

    expect(reason).toBe("Blocked by domain blocklist");
  });

  it("returns null when no reason is recorded", () => {
    expect(extractGateResultNull()).toBeNull();
  });

  it("falls back to any recorded gate reason", () => {
    const reason = extractGateReason({
      gateResults: {
        knownEntity: { action: "signal", gate: "known-entity", reason: "Known person" },
      },
    });

    expect(reason).toBe("Known person");
  });
});

function extractGateResultNull(): string | null {
  return extractGateReason({ gateResults: {} });
}

describe("keptOutCauseFromGateResult", () => {
  it("rule-caused when the rules gate dropped the capture", () => {
    expect(
      keptOutCauseFromGateResult({
        gateResults: {
          rules: { action: "drop", gate: "rules", reason: "Keep out" },
        },
      }),
    ).toBe("rule");
  });

  it("rule-caused for legacy blocklist drops", () => {
    expect(
      keptOutCauseFromGateResult({
        gateResults: {
          blocklist: { action: "drop", gate: "blocklist", reason: "Blocked" },
        },
      }),
    ).toBe("rule");
  });

  it("heuristic when admission or pre-ingest decided", () => {
    expect(
      keptOutCauseFromGateResult({
        gateResults: {
          preIngest: { action: "drop", gate: "pre-ingest", reason: "Spam" },
        },
      }),
    ).toBe("heuristic");
    expect(
      keptOutCauseFromGateResult({
        gateResults: {
          admission: { action: "noise", gate: "admission", reason: "Cold inbound" },
        },
      }),
    ).toBe("heuristic");
  });

  it("heuristic when the gate result is missing or malformed", () => {
    expect(keptOutCauseFromGateResult(null)).toBe("heuristic");
    expect(keptOutCauseFromGateResult("garbage")).toBe("heuristic");
    expect(keptOutCauseFromGateResult({})).toBe("heuristic");
  });
});
