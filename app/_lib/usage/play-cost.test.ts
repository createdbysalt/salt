import { describe, expect, it } from "vitest";

import {
  COMPOSIO_ACTION_MICROS,
  COMPOSIO_TRIGGER_EVENT_MICROS,
  DEFAULT_LLM_STEP_MICROS,
  estimatePlayCost,
  exceedsPricingFloor,
  PLAY_OVERHEAD_MICROS,
} from "./play-cost";

// Vendor price pins — Composio pricing effective 2026-08-15, verified live
// 2026-08-07 against composio.dev/updated-pricing. If Composio changes
// pricing, these tests are SUPPOSED to fail until the constants move.
describe("Composio price constants (Aug 15, 2026)", () => {
  it("prices a tool call at $0.004", () => {
    expect(COMPOSIO_ACTION_MICROS).toBe(4_000);
  });

  it("prices a delivered trigger event at $0.001", () => {
    expect(COMPOSIO_TRIGGER_EVENT_MICROS).toBe(1_000);
  });
});

describe("estimatePlayCost", () => {
  it("charges overhead alone for a play that executed nothing", () => {
    const { totalMicros, breakdown } = estimatePlayCost({ toolSlugs: [] });

    expect(totalMicros).toBe(PLAY_OVERHEAD_MICROS);
    expect(breakdown.composio).toBe(0);
    expect(breakdown.ai).toBe(0);
    expect(breakdown.aiCalls).toBe(0);
    expect(breakdown.tools).toEqual([]);
  });

  it("charges per tool execution", () => {
    const { breakdown } = estimatePlayCost({
      toolSlugs: ["GMAIL_LIST_MESSAGES", "GMAIL_SEND_EMAIL"],
    });

    expect(breakdown.composio).toBe(2 * COMPOSIO_ACTION_MICROS);
  });

  // Repeats cost money even though they add no new connector to attribute to.
  it("bills repeated executions but reports unique tools", () => {
    const { breakdown } = estimatePlayCost({
      toolSlugs: ["GMAIL_SEND_EMAIL", "GMAIL_SEND_EMAIL", "GMAIL_SEND_EMAIL"],
    });

    expect(breakdown.composio).toBe(3 * COMPOSIO_ACTION_MICROS);
    expect(breakdown.tools).toEqual(["GMAIL_SEND_EMAIL"]);
  });

  it("charges the default rate for an unknown model slot", () => {
    const { breakdown } = estimatePlayCost({
      toolSlugs: [],
      llmSlots: ["some-unmapped-slot"],
    });

    expect(breakdown.ai).toBe(DEFAULT_LLM_STEP_MICROS);
    expect(breakdown.aiCalls).toBe(1);
  });

  it("charges less for slots routed to a cheaper model class", () => {
    const cheap = estimatePlayCost({ toolSlugs: [], llmSlots: ["cheap"] });
    const standard = estimatePlayCost({ toolSlugs: [], llmSlots: [undefined] });

    expect(cheap.breakdown.ai).toBeLessThan(standard.breakdown.ai ?? 0);
  });

  it("sums composio, ai, and overhead into the total", () => {
    const { totalMicros, breakdown } = estimatePlayCost({
      toolSlugs: ["GMAIL_SEND_EMAIL"],
      llmSlots: [null],
    });

    expect(totalMicros).toBe(
      (breakdown.composio ?? 0) + (breakdown.ai ?? 0) + (breakdown.overhead ?? 0),
    );
  });

  // A typical single-step play should land near the ~$0.02 figure the pricing
  // model assumes. Drifting far from it invalidates the margin math.
  it("keeps a single-step play in the modelled cost range", () => {
    const { totalMicros } = estimatePlayCost({
      toolSlugs: ["GMAIL_SEND_EMAIL"],
      llmSlots: ["draft"],
    });

    expect(totalMicros).toBeGreaterThan(10_000);
    expect(totalMicros).toBeLessThan(30_000);
  });
});

describe("exceedsPricingFloor", () => {
  // G10: $0.50 is the lowest effective revenue per play (Max, $149 / 300).
  it("flags a play costing more than the lowest per-play revenue", () => {
    expect(exceedsPricingFloor(500_001)).toBe(true);
  });

  it("does not flag a play exactly at the floor", () => {
    expect(exceedsPricingFloor(500_000)).toBe(false);
  });

  it("does not flag a normal multi-app play", () => {
    const { totalMicros } = estimatePlayCost({
      toolSlugs: Array.from({ length: 5 }, (_, i) => `TOOL_${i}`),
      llmSlots: ["a", "b", "c"],
    });

    expect(exceedsPricingFloor(totalMicros)).toBe(false);
  });
});
