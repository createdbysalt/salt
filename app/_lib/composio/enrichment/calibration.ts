/**
 * Calibration tracking for enrichment confidence scores.
 *
 * Tracks accuracy per confidence bucket to verify that:
 * - 90% confidence extractions are correct ~90% of the time
 * - High-stakes fields (financial) maintain stricter accuracy
 * - Confidence thresholds are well-calibrated
 *
 * Usage:
 *   logExtractionOutcome({ field, confidence, correct: true, ... })
 *   getCalibrationReport()
 */

export interface ExtractionOutcome {
  field: string;
  confidence: number;
  tier: "deterministic" | "fuzzy" | "semantic" | "llm";
  correct: boolean;
  workspaceId: string;
  entityType: string;
  source: string;
  timestamp?: Date;
}

export interface ConfidenceBucket {
  min: number;
  max: number;
  label: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface TierStats {
  tier: string;
  total: number;
  correct: number;
  accuracy: number;
  avgConfidence: number;
}

export interface CalibrationReport {
  buckets: ConfidenceBucket[];
  tiers: TierStats[];
  totalExtractions: number;
  overallAccuracy: number;
  calibrationError: number;
  generatedAt: Date;
}

const CONFIDENCE_BUCKETS = [
  { min: 0.0, max: 0.5, label: "0-50%" },
  { min: 0.5, max: 0.6, label: "50-60%" },
  { min: 0.6, max: 0.7, label: "60-70%" },
  { min: 0.7, max: 0.8, label: "70-80%" },
  { min: 0.8, max: 0.9, label: "80-90%" },
  { min: 0.9, max: 0.95, label: "90-95%" },
  { min: 0.95, max: 1.0, label: "95-100%" },
];

const outcomes: ExtractionOutcome[] = [];
const MAX_OUTCOMES = 10000;

export function logExtractionOutcome(outcome: ExtractionOutcome): void {
  outcomes.push({
    ...outcome,
    timestamp: outcome.timestamp ?? new Date(),
  });

  if (outcomes.length > MAX_OUTCOMES) {
    outcomes.shift();
  }
}

export function logBatchOutcomes(batch: ExtractionOutcome[]): void {
  for (const outcome of batch) {
    logExtractionOutcome(outcome);
  }
}

export function getCalibrationReport(
  filter?: {
    workspaceId?: string;
    entityType?: string;
    source?: string;
    since?: Date;
  }
): CalibrationReport {
  let filtered = outcomes;

  if (filter) {
    filtered = outcomes.filter((o) => {
      if (filter.workspaceId && o.workspaceId !== filter.workspaceId) return false;
      if (filter.entityType && o.entityType !== filter.entityType) return false;
      if (filter.source && o.source !== filter.source) return false;
      if (filter.since && o.timestamp && o.timestamp < filter.since) return false;
      return true;
    });
  }

  const buckets: ConfidenceBucket[] = CONFIDENCE_BUCKETS.map((b) => {
    const inBucket = filtered.filter(
      (o) => o.confidence >= b.min && o.confidence < b.max
    );
    const correct = inBucket.filter((o) => o.correct).length;
    return {
      ...b,
      total: inBucket.length,
      correct,
      accuracy: inBucket.length > 0 ? correct / inBucket.length : 0,
    };
  });

  const tierGroups = new Map<string, ExtractionOutcome[]>();
  for (const outcome of filtered) {
    const existing = tierGroups.get(outcome.tier) ?? [];
    existing.push(outcome);
    tierGroups.set(outcome.tier, existing);
  }

  const tiers: TierStats[] = [];
  for (const [tier, group] of tierGroups) {
    const correct = group.filter((o) => o.correct).length;
    const avgConfidence =
      group.length > 0
        ? group.reduce((sum, o) => sum + o.confidence, 0) / group.length
        : 0;
    tiers.push({
      tier,
      total: group.length,
      correct,
      accuracy: group.length > 0 ? correct / group.length : 0,
      avgConfidence,
    });
  }

  tiers.sort((a, b) => b.total - a.total);

  const totalExtractions = filtered.length;
  const totalCorrect = filtered.filter((o) => o.correct).length;
  const overallAccuracy = totalExtractions > 0 ? totalCorrect / totalExtractions : 0;

  let calibrationError = 0;
  let calibrationSamples = 0;
  for (const bucket of buckets) {
    if (bucket.total > 0) {
      const midpoint = (bucket.min + bucket.max) / 2;
      calibrationError += Math.abs(bucket.accuracy - midpoint) * bucket.total;
      calibrationSamples += bucket.total;
    }
  }
  calibrationError = calibrationSamples > 0 ? calibrationError / calibrationSamples : 0;

  return {
    buckets,
    tiers,
    totalExtractions,
    overallAccuracy,
    calibrationError,
    generatedAt: new Date(),
  };
}

export function formatCalibrationReport(report: CalibrationReport): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════════════════",
    "                    CALIBRATION REPORT",
    `                    ${report.generatedAt.toISOString()}`,
    "═══════════════════════════════════════════════════════════════",
    "",
    `Total Extractions: ${report.totalExtractions}`,
    `Overall Accuracy: ${(report.overallAccuracy * 100).toFixed(1)}%`,
    `Calibration Error: ${(report.calibrationError * 100).toFixed(2)}%`,
    "",
    "───────────────────────────────────────────────────────────────",
    "                    CONFIDENCE BUCKETS",
    "───────────────────────────────────────────────────────────────",
    "",
    "Bucket      | Total | Correct | Accuracy | Expected | Delta",
    "────────────┼───────┼─────────┼──────────┼──────────┼───────",
  ];

  for (const bucket of report.buckets) {
    const expected = (bucket.min + bucket.max) / 2;
    const delta = bucket.accuracy - expected;
    const deltaStr = delta >= 0 ? `+${(delta * 100).toFixed(1)}%` : `${(delta * 100).toFixed(1)}%`;
    lines.push(
      `${bucket.label.padEnd(11)} | ${String(bucket.total).padStart(5)} | ${String(bucket.correct).padStart(7)} | ${(bucket.accuracy * 100).toFixed(1).padStart(7)}% | ${(expected * 100).toFixed(0).padStart(7)}% | ${deltaStr.padStart(6)}`
    );
  }

  lines.push("");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("                    TIER BREAKDOWN");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("Tier          | Total | Correct | Accuracy | Avg Conf");
  lines.push("──────────────┼───────┼─────────┼──────────┼──────────");

  for (const tier of report.tiers) {
    lines.push(
      `${tier.tier.padEnd(13)} | ${String(tier.total).padStart(5)} | ${String(tier.correct).padStart(7)} | ${(tier.accuracy * 100).toFixed(1).padStart(7)}% | ${(tier.avgConfidence * 100).toFixed(1).padStart(7)}%`
    );
  }

  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

export function clearCalibrationData(): void {
  outcomes.length = 0;
}

export function getOutcomeCount(): number {
  return outcomes.length;
}

export function isWellCalibrated(
  report: CalibrationReport,
  threshold: number = 0.05
): boolean {
  return report.calibrationError <= threshold;
}

export function getUnderperformingBuckets(
  report: CalibrationReport,
  tolerancePercent: number = 10
): ConfidenceBucket[] {
  const tolerance = tolerancePercent / 100;
  return report.buckets.filter((bucket) => {
    if (bucket.total < 10) return false;
    const expected = (bucket.min + bucket.max) / 2;
    return bucket.accuracy < expected - tolerance;
  });
}
