import type { CostBreakdown } from "./types";

/**
 * Per-play COGS estimation (pricing G10).
 *
 * Play cost is a range, not a constant: a single-step play runs about $0.02
 * while a play spanning five apps with several model calls reaches $0.05–0.10.
 * Effective revenue per play is $0.50–1.16 by tier, so margins hold only while
 * the distribution stays in that range. Itemizing every event is what lets the
 * margin monitor explain a shift instead of merely detecting one.
 *
 * All figures are micro-USD (1e-6 USD) and are estimates calibrated against
 * docs/reference/cost-analysis.md. They are inputs to internal margin
 * reporting, never to a customer invoice — customers are billed per play, not
 * per estimated cent.
 */

/** Composio tool execution and trigger delivery — 87% of capture cost. */
export const COMPOSIO_ACTION_MICROS = 2_000;

/** Fixed orchestration overhead per play: claim, journal writes, finalize. */
export const PLAY_OVERHEAD_MICROS = 500;

/**
 * Default cost of one model call in a play step. Play steps draft real output
 * (an email body, a summary), so they cost far more than the ~$0.0002 classify
 * calls in the capture pipeline.
 */
export const DEFAULT_LLM_STEP_MICROS = 18_000;

/**
 * Per-slot overrides. Slots routed to a cheaper model class cost materially
 * less; populate as routing lands so estimates track reality.
 */
const LLM_SLOT_MICROS: Record<string, number> = {
  cheap: 2_000,
  classify: 200,
};

/**
 * Runaway protection (G10). Plays are approved workflows, not open agent
 * loops. A play exceeding this many tool calls fails safe, auto-credits, and
 * flags for review rather than billing an unbounded execution.
 */
export const MAX_TOOL_CALLS_PER_PLAY = 25;

export interface PlayCostInput {
  /** Tool slugs actually executed, in execution order. Duplicates count. */
  toolSlugs: readonly string[];
  /** Model slots for each language-model step that ran. */
  llmSlots?: readonly (string | null | undefined)[];
}

export interface PlayCostEstimate {
  totalMicros: number;
  breakdown: CostBreakdown;
}

function llmStepCost(slot: string | null | undefined): number {
  if (!slot) return DEFAULT_LLM_STEP_MICROS;
  return LLM_SLOT_MICROS[slot] ?? DEFAULT_LLM_STEP_MICROS;
}

/**
 * Estimate itemized COGS for one play execution.
 *
 * `tools` records unique slugs so per-connector cost attribution (G9) can
 * compare messaging-connected workspaces against email-only ones, while the
 * Composio charge counts every execution including repeats.
 */
export function estimatePlayCost(input: PlayCostInput): PlayCostEstimate {
  const composio = input.toolSlugs.length * COMPOSIO_ACTION_MICROS;
  const llmSlots = input.llmSlots ?? [];
  const ai = llmSlots.reduce<number>((sum, slot) => sum + llmStepCost(slot), 0);

  return {
    totalMicros: composio + ai + PLAY_OVERHEAD_MICROS,
    breakdown: {
      ai,
      composio,
      overhead: PLAY_OVERHEAD_MICROS,
      aiCalls: llmSlots.length,
      tools: [...new Set(input.toolSlugs)],
    },
  };
}

/**
 * Alert threshold from G10: $0.50, the lowest effective revenue per play in
 * the model (Max, $149 across 300 plays). A single play costing more than this
 * is a pricing-floor breach and must be investigated immediately.
 */
export const PLAY_COST_FLOOR_BREACH_MICROS = 500_000;

/** Alert threshold from G10: median billable-play COGS above $0.10. */
export const PLAY_COST_REVIEW_MICROS = 100_000;

export function exceedsPricingFloor(totalMicros: number): boolean {
  return totalMicros > PLAY_COST_FLOOR_BREACH_MICROS;
}
