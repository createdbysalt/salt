/**
 * Contact Signal Scoring (Bootstrap)
 *
 * Scores contacts during first-run bootstrap so the most important people
 * surface first. Used by gmail-backfill; the June surface-routing confidence
 * machinery that used to live here was deleted with services/routing.ts.
 */

export interface ContactSignalScore {
  email: string;
  name?: string;
  score: number;
  signals: {
    recency: number;      // Days since last contact
    frequency: number;    // Number of interactions
    revenue?: number;     // Revenue associated (if Stripe connected)
    threads?: number;     // Number of conversation threads
  };
}

/**
 * Score a contact for high-signal detection during bootstrap.
 *
 * Higher score = more important contact to surface first.
 */
export function scoreContactSignal(
  recencyDays: number,
  frequency: number,
  revenue: number = 0,
  threadCount: number = 0
): number {
  let score = 0;

  // Recency: more recent = higher score (exponential decay)
  const recencyScore = Math.max(0, 100 * Math.exp(-recencyDays / 30));
  score += recencyScore * 0.3;

  // Frequency: log scale to prevent outliers dominating
  const frequencyScore = Math.min(100, Math.log2(frequency + 1) * 20);
  score += frequencyScore * 0.3;

  // Revenue: if connected, strong signal
  if (revenue > 0) {
    const revenueScore = Math.min(100, Math.log10(revenue + 1) * 25);
    score += revenueScore * 0.25;
  }

  // Thread count: conversation depth
  const threadScore = Math.min(100, threadCount * 10);
  score += threadScore * 0.15;

  return Math.round(score);
}

/**
 * Filter contacts to top N by signal score.
 */
export function filterHighSignalContacts(
  contacts: ContactSignalScore[],
  limit: number
): ContactSignalScore[] {
  return contacts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
