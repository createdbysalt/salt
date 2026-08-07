import { afterEach, describe, expect, it, vi } from "vitest";

import { estimateLlmCost } from "./llm-cost";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("estimateLlmCost", () => {
  it("prices tokens as micro-USD using the per-million rate directly", () => {
    // gpt-4o is $2.50/M input, $10.00/M output. 1,000 input + 500 output is
    // 2,500 + 5,000 = 7,500 micro-USD ($0.0075). This pins the identity the
    // module depends on: micros = tokens x usdPerMillion, no conversion.
    const { totalMicros } = estimateLlmCost({
      model: "openai/gpt-4o",
      inputTokens: 1_000,
      outputTokens: 500,
    });

    expect(totalMicros).toBe(7_500);
  });

  it("matches the more specific model id first", () => {
    // "gpt-4o-mini" contains "gpt-4o", so a naive table would price mini at
    // full gpt-4o rates and overstate cheap-model spend by ~16x.
    const mini = estimateLlmCost({
      model: "openai/gpt-4o-mini",
      inputTokens: 1_000_000,
      outputTokens: 0,
    });
    const full = estimateLlmCost({
      model: "openai/gpt-4o",
      inputTokens: 1_000_000,
      outputTokens: 0,
    });

    expect(mini.totalMicros).toBe(150_000);
    expect(full.totalMicros).toBe(2_500_000);
    expect(mini.totalMicros).toBeLessThan(full.totalMicros);
  });

  it("resolves dated and prefixed model ids to their family", () => {
    const dated = estimateLlmCost({
      model: "claude-sonnet-4-20250514",
      inputTokens: 1_000_000,
      outputTokens: 0,
    });

    expect(dated.totalMicros).toBe(3_000_000);
  });

  it("prices an unknown model at least as high as the priciest known one", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const unknown = estimateLlmCost({
      model: "some-vendor/brand-new-frontier-model",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    const priciestKnown = estimateLlmCost({
      model: "claude-opus",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });

    // The direction matters more than the number. Under-pricing an unrecognised
    // model hides real spend, which is the failure this subsystem exists to
    // prevent; over-pricing is visible and self-corrects.
    expect(unknown.totalMicros).toBeGreaterThanOrEqual(priciestKnown.totalMicros);
  });

  it("warns once per unknown model rather than on every call", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const model = `mystery-model-${Math.random()}`;

    estimateLlmCost({ model, inputTokens: 10 });
    estimateLlmCost({ model, inputTokens: 10 });
    estimateLlmCost({ model, inputTokens: 10 });

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("treats missing, negative, and non-finite token counts as zero", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Providers occasionally omit the usage block entirely. That must not
    // throw in a stream callback that runs after the user already has a reply.
    expect(estimateLlmCost({ model: "openai/gpt-4o" }).totalMicros).toBe(0);
    expect(
      estimateLlmCost({
        model: "openai/gpt-4o",
        inputTokens: -100,
        outputTokens: Number.NaN,
      }).totalMicros,
    ).toBe(0);
  });

  it("reports the model round-trip count in the breakdown", () => {
    const { breakdown } = estimateLlmCost({
      model: "openai/gpt-4o",
      inputTokens: 1_000,
      outputTokens: 0,
      calls: 7,
    });

    expect(breakdown.aiCalls).toBe(7);
    expect(breakdown.ai).toBe(2_500);
  });

  it("defaults to a single call when none is given", () => {
    const { breakdown } = estimateLlmCost({
      model: "openai/gpt-4o",
      inputTokens: 1_000,
    });

    expect(breakdown.aiCalls).toBe(1);
  });
});
