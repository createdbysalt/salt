/**
 * Confidence Decay — Calculate effective confidence over time
 *
 * Notes lose confidence without reconfirmation. This models the decay
 * to surface stale notes for review and prioritize recently confirmed facts.
 */

export const DECAY_RATE_PER_MONTH = 2;
export const MIN_EFFECTIVE_CONFIDENCE = 30;

export interface ConfidenceDecayInput {
  baseConfidence: number;
  confirmedAt: Date;
  now?: Date;
}

export interface ConfidenceDecayResult {
  effectiveConfidence: number;
  monthsElapsed: number;
  decayApplied: number;
  isStale: boolean;
}

/**
 * Calculate effective confidence after time-based decay.
 *
 * Formula: effective = base - (months * decay_rate)
 * Minimum: MIN_EFFECTIVE_CONFIDENCE (notes don't decay below 30)
 *
 * A note at 85% confidence becomes ~73% after 6 months (12pt decay).
 */
export function calculateEffectiveConfidence(
  input: ConfidenceDecayInput
): ConfidenceDecayResult {
  const { baseConfidence, confirmedAt, now = new Date() } = input;

  const millisElapsed = now.getTime() - confirmedAt.getTime();
  const monthsElapsed = millisElapsed / (30 * 24 * 60 * 60 * 1000);

  const decayApplied = Math.floor(monthsElapsed) * DECAY_RATE_PER_MONTH;
  const effectiveConfidence = Math.max(
    MIN_EFFECTIVE_CONFIDENCE,
    baseConfidence - decayApplied
  );

  const isStale = effectiveConfidence < 60;

  return {
    effectiveConfidence,
    monthsElapsed: Math.floor(monthsElapsed),
    decayApplied,
    isStale,
  };
}

/**
 * Check if a note is stale and should show a staleness indicator.
 * A note is stale if:
 * - Effective confidence has dropped below 60%
 * - OR it hasn't been accessed in 6+ months
 * - OR it was superseded
 */
export function isNoteStale(input: {
  baseConfidence: number | null;
  confirmedAt: Date | null;
  lastAccessedAt: Date | null;
  supersededBy: string | null;
  now?: Date;
}): { stale: boolean; reason: string | null } {
  const { baseConfidence, confirmedAt, lastAccessedAt, supersededBy, now = new Date() } = input;

  if (supersededBy) {
    return { stale: true, reason: "Superseded by newer note" };
  }

  if (baseConfidence !== null && confirmedAt) {
    const decay = calculateEffectiveConfidence({
      baseConfidence,
      confirmedAt,
      now,
    });
    if (decay.isStale) {
      return {
        stale: true,
        reason: `Confidence decayed to ${decay.effectiveConfidence}% (${decay.monthsElapsed} months old)`,
      };
    }
  }

  if (lastAccessedAt) {
    const monthsSinceAccess =
      (now.getTime() - lastAccessedAt.getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (monthsSinceAccess >= 6) {
      return {
        stale: true,
        reason: `Not accessed in ${Math.floor(monthsSinceAccess)} months`,
      };
    }
  }

  return { stale: false, reason: null };
}

/**
 * Get source confidence weight based on source type.
 * Used when creating notes to set initial confidence weight.
 */
export function getSourceConfidenceWeight(
  source: "manual" | "ai_capture" | "ai_inference" | "system" | "ask_salt"
): number {
  switch (source) {
    case "manual":
    case "ask_salt":
      return 25; // User-authored = highest trust
    case "ai_capture":
      return 20; // Explicit statement captured
    case "ai_inference":
      return 10; // Inferred from signals
    case "system":
      return 15; // System-generated
    default:
      return 10;
  }
}
