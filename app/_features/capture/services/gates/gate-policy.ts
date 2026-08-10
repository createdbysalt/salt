/**
 * Capture gate policy (Customize surfaces, Phase S3).
 *
 * The workspace-level, plain-language policy choices shown on Sources →
 * Customize beside the transparency lines they govern. Storage is
 * `workspaces.capture_gate_policy` (jsonb); this module is the PURE
 * resolver — DB-shaped partial json in, fully-resolved policy out — so the
 * gates, the UI, and the tests all speak the same complete shape.
 *
 * v1 ships exactly two email choices (graduated exposure: a gate gets a
 * control only when reasonable users genuinely differ):
 *
 * - automatedSenders — governs the pre-ingest noreply/bulk heuristics
 *   (detections whose category is 'automated'):
 *     dropped (default): current behavior — dropped before anything stored
 *     watched:           pass pre-ingest; unknown senders land in the held
 *                        pool like any other stranger mail
 *     let_in:            pass pre-ingest AND bypass the memory-first hold
 * - strangers — governs the memory-first hold on unknown-sender inbound
 *   email (gates/index.ts):
 *     watched (default): current behavior — held, hidden from the stream
 *     let_in:            admitted at full prominence (candidate path)
 *     dropped:           dropped entirely (explicit user choice)
 *
 * Numeric internals (admission scores, evidence weights) are NEVER policy
 * — named choices only. Unknown areas/keys/values resolve to defaults:
 * an unreadable policy must degrade to "as Salt has always run", never to
 * a gate that does nothing or everything.
 */

export type AutomatedSendersPolicy = "dropped" | "watched" | "let_in";
export type StrangersPolicy = "watched" | "let_in" | "dropped";

export interface ResolvedGatePolicy {
  email: {
    automatedSenders: AutomatedSendersPolicy;
    strangers: StrangersPolicy;
  };
}

/**
 * Defaults match behavior at ship time (2026-08-10): automated senders
 * dropped at pre-ingest, stranger mail held. `{}` in the DB means exactly
 * this — no backfill needed.
 */
export const DEFAULT_GATE_POLICY: ResolvedGatePolicy = {
  email: { automatedSenders: "dropped", strangers: "watched" },
};

const AUTOMATED_SENDERS_VALUES: readonly AutomatedSendersPolicy[] = [
  "dropped",
  "watched",
  "let_in",
];
const STRANGERS_VALUES: readonly StrangersPolicy[] = [
  "watched",
  "let_in",
  "dropped",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** DB jsonb (partial, snake_case) → fully-resolved policy. Never throws. */
export function resolveGatePolicy(raw: unknown): ResolvedGatePolicy {
  const email = isRecord(raw) && isRecord(raw.email) ? raw.email : {};
  return {
    email: {
      automatedSenders: pick(
        email.automated_senders,
        AUTOMATED_SENDERS_VALUES,
        DEFAULT_GATE_POLICY.email.automatedSenders,
      ),
      strangers: pick(
        email.strangers,
        STRANGERS_VALUES,
        DEFAULT_GATE_POLICY.email.strangers,
      ),
    },
  };
}
