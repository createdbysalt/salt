import { describe, expect, it } from "vitest";
import type { CaptureEnvelope } from "../../adapters/types";
import type { GatePipelineResult } from "../../types/gate-result";
import { decidePostIngestLanes } from "./policy";

function envelope(overrides: Partial<CaptureEnvelope> = {}): CaptureEnvelope {
  return {
    sourceType: "gmail",
    captureType: "message",
    externalId: "msg-1",
    title: "Hello",
    occurredAt: null,
    participants: [],
    threadId: null,
    extracted: {},
    raw: {},
    noise: null,
    ...overrides,
  } as CaptureEnvelope;
}

function gate(finalAction: GatePipelineResult["finalAction"]): GatePipelineResult {
  return {
    finalAction,
    shouldIngest: true,
    passedGates: [],
    gateResults: {},
  } as GatePipelineResult;
}

const base = {
  isBootstrap: false,
  skipEvidence: false,
  budgetExceeded: false,
};

describe("decidePostIngestLanes", () => {
  it("runs both lanes for a normal admitted capture", () => {
    const lanes = decidePostIngestLanes({
      ...base,
      envelope: envelope(),
      gateResult: gate("candidate"),
    });
    expect(lanes.runEvidence).toBe(true);
    expect(lanes.runEnrichment).toBe(true);
    expect(lanes.terminalStamp).toBeNull();
    expect(lanes.isNoise).toBe(false);
    expect(lanes.isHeld).toBe(false);
  });

  it("held mail: no lanes, no terminal stamp", () => {
    const lanes = decidePostIngestLanes({
      ...base,
      envelope: envelope(),
      gateResult: gate("held"),
    });
    expect(lanes.isHeld).toBe(true);
    expect(lanes.runEvidence).toBe(false);
    expect(lanes.runEnrichment).toBe(false);
    expect(lanes.terminalStamp).toBeNull();
  });

  it("gate noise: no lanes, terminal no_signal stamp", () => {
    const lanes = decidePostIngestLanes({
      ...base,
      envelope: envelope(),
      gateResult: gate("noise"),
    });
    expect(lanes.isNoise).toBe(true);
    expect(lanes.runEvidence).toBe(false);
    expect(lanes.runEnrichment).toBe(false);
    expect(lanes.terminalStamp).toBe("no_signal");
  });

  it("budget exceeded forces noise except for held mail", () => {
    const forced = decidePostIngestLanes({
      ...base,
      budgetExceeded: true,
      envelope: envelope(),
      gateResult: gate("candidate"),
    });
    expect(forced.forcedNoiseByBudget).toBe(true);
    expect(forced.isNoise).toBe(true);
    expect(forced.terminalStamp).toBe("no_signal");

    const held = decidePostIngestLanes({
      ...base,
      budgetExceeded: true,
      envelope: envelope(),
      gateResult: gate("held"),
    });
    expect(held.forcedNoiseByBudget).toBe(false);
    expect(held.isNoise).toBe(false);
    expect(held.isHeld).toBe(true);
  });

  it("bootstrap email runs evidence (deterministic) but not enrichment, and is NOT stamped (scan backlog owns it)", () => {
    const lanes = decidePostIngestLanes({
      ...base,
      isBootstrap: true,
      envelope: envelope(),
      gateResult: gate("candidate"),
    });
    expect(lanes.runEvidence).toBe(true);
    expect(lanes.runEnrichment).toBe(false);
    expect(lanes.terminalStamp).toBeNull();
  });

  it("bootstrap non-email runs evidence (deterministic) but not enrichment, and is stamped pending_backfill", () => {
    const lanes = decidePostIngestLanes({
      ...base,
      isBootstrap: true,
      envelope: envelope({ sourceType: "googledrive", captureType: "file" }),
      gateResult: gate("candidate"),
    });
    expect(lanes.runEvidence).toBe(true);
    expect(lanes.runEnrichment).toBe(false);
    expect(lanes.terminalStamp).toBe("pending_backfill");
  });

  it("skipEvidence skips both lanes; email stays unstamped, non-email is stamped pending_backfill", () => {
    const email = decidePostIngestLanes({
      ...base,
      skipEvidence: true,
      envelope: envelope(),
      gateResult: gate("candidate"),
    });
    expect(email.runEvidence).toBe(false);
    expect(email.runEnrichment).toBe(false);
    expect(email.terminalStamp).toBeNull();

    const file = decidePostIngestLanes({
      ...base,
      skipEvidence: true,
      envelope: envelope({ sourceType: "googledrive", captureType: "file" }),
      gateResult: gate("candidate"),
    });
    expect(file.runEvidence).toBe(false);
    expect(file.terminalStamp).toBe("pending_backfill");
  });

  it("signal gate action routes the row and carries target confidence", () => {
    const withTarget = {
      ...gate("signal"),
      targetEntity: { confidence: 92 },
    } as GatePipelineResult;
    const lanes = decidePostIngestLanes({
      ...base,
      envelope: envelope(),
      gateResult: withTarget,
    });
    expect(lanes.captureState).toBe("routed");
    expect(lanes.overallConfidence).toBe(92);
  });

  it("no gate pipeline (legacy path): lanes run, no gate fields", () => {
    const lanes = decidePostIngestLanes({
      ...base,
      envelope: envelope(),
      gateResult: undefined,
    });
    expect(lanes.runEvidence).toBe(true);
    expect(lanes.runEnrichment).toBe(true);
    expect(lanes.captureState).toBe("pending");
    expect(lanes.overallConfidence).toBeNull();
  });
});
