import { describe, expect, it } from "vitest";
import {
  extractGateReason,
  keptOutCauseFromGateResult,
  plainKeptOutReason,
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

describe("plainKeptOutReason", () => {
  it("translates the known gate reasons to plain language", () => {
    expect(
      plainKeptOutReason("Cold inbound with no prior interaction"),
    ).toBe("First time you've heard from this sender");
    expect(plainKeptOutReason("Low signal score")).toBe(
      "Didn't look relevant to your work",
    );
    expect(
      plainKeptOutReason("List-Unsubscribe header indicates marketing email"),
    ).toBe("Marketing or bulk mail");
    expect(
      plainKeptOutReason("Known marketing platform domain: mailchimp.com"),
    ).toBe("Sent via a marketing platform");
    expect(plainKeptOutReason("Automated sender address: no-reply@x.com")).toBe(
      "Automated sender",
    );
  });

  it("passes through unrecognized reasons verbatim — never a lie", () => {
    expect(plainKeptOutReason("Keep this sender out")).toBe(
      "Keep this sender out",
    );
    expect(plainKeptOutReason("No one else is on this event")).toBe(
      "No one else is on this event",
    );
  });

  it("returns null for null", () => {
    expect(plainKeptOutReason(null)).toBeNull();
  });
});
