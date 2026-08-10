import { describe, expect, it } from "vitest";
import {
  renderProofLine,
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

describe("renderProofLine", () => {
  it("renders the week's evidence in surface vocabulary", () => {
    expect(renderProofLine({ keptOut: 43, watching: 2, letIn: 18 })).toBe(
      "This week: 43 kept out · 2 watching · 18 let in",
    );
  });

  it("omits zero segments", () => {
    expect(renderProofLine({ keptOut: 43, watching: 0, letIn: 0 })).toBe(
      "This week: 43 kept out",
    );
  });

  it("says so plainly when nothing needed keeping out", () => {
    expect(renderProofLine({ keptOut: 0, watching: 0, letIn: 0 })).toBe(
      "This week: nothing needed keeping out.",
    );
  });

  it("returns null when there is no data", () => {
    expect(renderProofLine(null)).toBeNull();
  });

  it("never uses banned words", () => {
    const banned = /\b(trigger|webhook|sync|scope|rule|adapter|pipeline|config)\b/i;
    const lines = [
      renderProofLine({ keptOut: 43, watching: 2, letIn: 18 }),
      renderProofLine({ keptOut: 0, watching: 0, letIn: 0 }),
    ];
    for (const line of lines) {
      expect(line).not.toBeNull();
      expect(line).not.toMatch(banned);
    }
  });
});
