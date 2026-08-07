import type { CostBreakdown } from "./types";

/**
 * Token-level LLM cost estimation (pricing G10).
 *
 * `play-cost.ts` estimates a play from flat per-call constants because a play's
 * shape is known before it runs. An Ask Salt turn is not: it can take up to
 * twelve model steps with arbitrary tool payloads, so a flat per-call figure
 * would be wrong by an order of magnitude in both directions. This module
 * prices the tokens actually consumed.
 *
 * Figures are internal COGS estimates for margin monitoring. They never reach a
 * customer invoice — customers are billed per play, not per token.
 *
 * ## The micro-USD identity
 *
 * Rates below are USD per million tokens. Cost in micro-USD is
 * `tokens x usdPerMillion`, because dividing by 1e6 to get USD and multiplying
 * by 1e6 to get micro-USD cancel out. 1,000 tokens at $2.50/M is 2,500
 * micro-USD, or $0.0025. No conversion constant is needed and none should be
 * added.
 */

interface ModelRate {
  /** USD per million input tokens. */
  input: number;
  /** USD per million output tokens. */
  output: number;
}

/**
 * Published list rates, matched by substring against the model id so that
 * provider prefixes and dated suffixes (`openai/gpt-4o`,
 * `claude-sonnet-4-20250514`) resolve without an exact-match table.
 *
 * Order matters: the first match wins, so more specific ids must precede the
 * families that contain them — `gpt-4o-mini` before `gpt-4o`.
 *
 * These are estimates and will drift as vendors reprice. Drift shows up as a
 * margin-report discrepancy, not a billing error, because nothing here is
 * charged to a customer.
 */
const MODEL_RATES: ReadonlyArray<readonly [match: string, rate: ModelRate]> = [
  ["gpt-4o-mini", { input: 0.15, output: 0.6 }],
  ["gpt-4o", { input: 2.5, output: 10 }],
  ["gemini-3.5-flash", { input: 0.1, output: 0.4 }],
  ["gemini", { input: 0.1, output: 0.4 }],
  ["claude-sonnet", { input: 3, output: 15 }],
  ["claude-haiku", { input: 0.8, output: 4 }],
  ["claude-opus", { input: 15, output: 75 }],
];

/**
 * Rate applied when the model id matches nothing above.
 *
 * Deliberately set to the most expensive family Salt routes to rather than an
 * average. An unknown model is most likely a newly-added frontier model, and
 * under-estimating its cost is the failure this whole subsystem exists to
 * prevent: spend that looks affordable in the margin report while the real
 * invoice climbs. Over-estimating is visible and self-correcting; a quiet
 * under-estimate is neither.
 */
const FALLBACK_RATE: ModelRate = { input: 15, output: 75 };

const warnedModels = new Set<string>();

function resolveRate(model: string): ModelRate {
  const normalized = model.toLowerCase();

  for (const [match, rate] of MODEL_RATES) {
    if (normalized.includes(match)) return rate;
  }

  // Once per model per process: this is a "someone added a model and forgot to
  // price it" signal, and it should be actionable rather than a log flood.
  if (!warnedModels.has(normalized)) {
    warnedModels.add(normalized);
    console.warn(
      `[usage] no cost rate for model "${model}" — falling back to the most ` +
        "expensive rate. Add it to MODEL_RATES in app/_lib/usage/llm-cost.ts.",
    );
  }

  return FALLBACK_RATE;
}

export interface LlmTokenUsage {
  /** Undefined when the provider omits usage, which is treated as zero. */
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
}

export interface LlmCostInput extends LlmTokenUsage {
  model: string;
  /** Model round-trips this usage covers. An Ask Salt turn may be many. */
  calls?: number;
}

export interface LlmCostEstimate {
  totalMicros: number;
  breakdown: CostBreakdown;
}

/** Non-finite and negative token counts are provider bugs, not spend. */
function safeTokens(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

/**
 * Estimate the COGS of one or more model calls from token counts.
 *
 * Returns zero cost rather than throwing when usage is missing: a provider that
 * omits its usage block should not take down the request it was serving. The
 * gap surfaces as an `aiCalls` count with no matching spend, which is a
 * detectable anomaly in the margin report.
 */
export function estimateLlmCost(input: LlmCostInput): LlmCostEstimate {
  const rate = resolveRate(input.model);
  const inputTokens = safeTokens(input.inputTokens);
  const outputTokens = safeTokens(input.outputTokens);

  const totalMicros = Math.round(
    inputTokens * rate.input + outputTokens * rate.output,
  );

  return {
    totalMicros,
    breakdown: {
      ai: totalMicros,
      aiCalls: input.calls ?? 1,
    },
  };
}
