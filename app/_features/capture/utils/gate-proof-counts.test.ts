import { describe, expect, it } from "vitest";
import {
  summarizeGateProofCounts,
  type GateProofRow,
} from "./gate-proof-counts";
import {
  CATEGORY_TO_AREA,
  type CustomizeArea,
} from "../adapters/rule-entities";

/**
 * Proof counts (Sources → Customize, S1): "I skipped 43 promotions this
 * week" — per-area weekly counts derived from capture_events.gate_action.
 */

const EMAIL_PROVIDERS = new Set(["gmail", "outlook"]);

function resolveArea(provider: string): CustomizeArea | null {
  // Mirrors the loader's mapping: provider → category → area.
  const category = EMAIL_PROVIDERS.has(provider)
    ? "email"
    : provider === "slack"
      ? "communication"
      : provider === "stripe" || provider === "quickbooks"
        ? "billing"
        : null;
  return category ? CATEGORY_TO_AREA[category] : null;
}

function row(sourceType: string, gateAction: string | null): GateProofRow {
  return { sourceType, gateAction };
}

describe("summarizeGateProofCounts", () => {
  it("counts drops and noise as kept out, held as watching, signal/candidate as let in", () => {
    const rows = [
      row("gmail", "drop"),
      row("gmail", "noise"),
      row("gmail", "held"),
      row("gmail", "candidate"),
      row("gmail", "signal"),
    ];

    const counts = summarizeGateProofCounts(rows, resolveArea);

    expect(counts.get("email")).toEqual({
      keptOut: 2,
      watching: 1,
      letIn: 2,
    });
  });

  it("groups providers into their intake area", () => {
    const rows = [
      row("gmail", "drop"),
      row("outlook", "drop"),
      row("slack", "held"),
      row("stripe", "candidate"),
    ];

    const counts = summarizeGateProofCounts(rows, resolveArea);

    expect(counts.get("email")?.keptOut).toBe(2);
    expect(counts.get("messaging")?.watching).toBe(1);
    expect(counts.get("billing")?.letIn).toBe(1);
  });

  it("skips rows with a null gate_action (pre-gate backfills)", () => {
    const rows = [row("gmail", null), row("gmail", "drop")];

    const counts = summarizeGateProofCounts(rows, resolveArea);

    expect(counts.get("email")).toEqual({ keptOut: 1, watching: 0, letIn: 0 });
  });

  it("skips providers with no area mapping", () => {
    const rows = [row("myspace", "drop")];

    const counts = summarizeGateProofCounts(rows, resolveArea);

    expect(counts.size).toBe(0);
  });

  it("returns an empty map for no rows", () => {
    expect(summarizeGateProofCounts([], resolveArea).size).toBe(0);
  });
});
