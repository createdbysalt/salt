/**
 * Confidence Calibration
 *
 * Uses outcome data to calibrate confidence thresholds over time.
 * Part of the GROW loop - earned autonomy through demonstrated accuracy.
 *
 * Part of the LEARN → ACT → GROW loop (Phase 7).
 */

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getCalibrationData, type CalibrationData } from "./outcomes";

export interface CalibrationReport {
  workspaceId: string;
  generatedAt: string;
  periodDays: number;
  buckets: CalibrationData[];
  overallAccuracy: number;
  calibrationError: number;
  recommendations: CalibrationRecommendation[];
  earnedAutonomyScore: number;
}

export interface CalibrationRecommendation {
  type: "raise_threshold" | "lower_threshold" | "needs_data" | "well_calibrated";
  bucket: string;
  currentThreshold: number;
  suggestedThreshold?: number;
  reason: string;
}

export interface PlaybookFeedbackPattern {
  playbookSlug: string;
  playbookName: string;
  negativeFeedbackCount: number;
  totalPlays: number;
  negativeRate: number;
  commonReasons: string[];
  lastNegativeAt: string | null;
}

export async function generateCalibrationReport(
  workspaceId: string,
  periodDays: number = 30
): Promise<CalibrationReport> {
  const buckets = await getCalibrationData(workspaceId, periodDays);
  const recommendations = analyzeCalibration(buckets);

  let totalCorrect = 0;
  let totalSamples = 0;
  let totalCalibrationError = 0;

  for (const bucket of buckets) {
    const expectedRate = bucket.predictedConfidence;
    const actualRate = bucket.actualSuccessRate;
    const error = Math.abs(expectedRate - actualRate);

    totalCalibrationError += error * bucket.sampleSize;
    totalCorrect += (bucket.actualSuccessRate / 100) * bucket.sampleSize;
    totalSamples += bucket.sampleSize;
  }

  const overallAccuracy = totalSamples > 0 ? (totalCorrect / totalSamples) * 100 : 0;
  const calibrationError = totalSamples > 0 ? totalCalibrationError / totalSamples : 0;

  const earnedAutonomyScore = calculateEarnedAutonomy(buckets, calibrationError);

  return {
    workspaceId,
    generatedAt: new Date().toISOString(),
    periodDays,
    buckets,
    overallAccuracy,
    calibrationError,
    recommendations,
    earnedAutonomyScore,
  };
}

function analyzeCalibration(buckets: CalibrationData[]): CalibrationRecommendation[] {
  const recommendations: CalibrationRecommendation[] = [];

  for (const bucket of buckets) {
    if (bucket.sampleSize < 5) {
      recommendations.push({
        type: "needs_data",
        bucket: bucket.bucket,
        currentThreshold: bucket.predictedConfidence,
        reason: `Only ${bucket.sampleSize} samples - need more data for reliable calibration`,
      });
      continue;
    }

    const expectedRate = bucket.predictedConfidence;
    const actualRate = bucket.actualSuccessRate;
    const error = actualRate - expectedRate;

    if (Math.abs(error) <= 5) {
      recommendations.push({
        type: "well_calibrated",
        bucket: bucket.bucket,
        currentThreshold: bucket.predictedConfidence,
        reason: `Calibration error ${error.toFixed(1)}% is within acceptable range`,
      });
    } else if (error > 10) {
      recommendations.push({
        type: "lower_threshold",
        bucket: bucket.bucket,
        currentThreshold: bucket.predictedConfidence,
        suggestedThreshold: Math.min(95, bucket.predictedConfidence - error / 2),
        reason: `Actual success rate ${actualRate.toFixed(1)}% exceeds predicted ${expectedRate.toFixed(1)}% - system is under-confident`,
      });
    } else if (error < -10) {
      recommendations.push({
        type: "raise_threshold",
        bucket: bucket.bucket,
        currentThreshold: bucket.predictedConfidence,
        suggestedThreshold: Math.max(50, bucket.predictedConfidence - error / 2),
        reason: `Actual success rate ${actualRate.toFixed(1)}% below predicted ${expectedRate.toFixed(1)}% - system is over-confident`,
      });
    }
  }

  return recommendations;
}

function calculateEarnedAutonomy(
  buckets: CalibrationData[],
  calibrationError: number
): number {
  if (buckets.length === 0) return 0;

  const totalSamples = buckets.reduce((sum, b) => sum + b.sampleSize, 0);
  if (totalSamples < 20) return 0;

  const highConfidenceBuckets = buckets.filter((b) => b.predictedConfidence >= 80);
  const highConfidenceAccuracy =
    highConfidenceBuckets.length > 0
      ? highConfidenceBuckets.reduce((sum, b) => sum + b.actualSuccessRate * b.sampleSize, 0) /
        highConfidenceBuckets.reduce((sum, b) => sum + b.sampleSize, 0)
      : 0;

  const calibrationPenalty = Math.min(30, calibrationError);
  const volumeBonus = Math.min(20, totalSamples / 10);

  return Math.max(0, Math.min(100, highConfidenceAccuracy - calibrationPenalty + volumeBonus));
}

export async function detectPlaybookFeedbackPatterns(
  workspaceId: string,
  days: number = 30
): Promise<PlaybookFeedbackPattern[]> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await admin
    .from("play_runs")
    .select("id, metadata, user_feedback, user_feedback_at")
    .eq("workspace_id", workspaceId)
    .not("user_feedback", "is", null)
    .gte("user_feedback_at", since.toISOString());

  if (error || !data) {
    console.error("Failed to detect feedback patterns:", error);
    return [];
  }

  const patterns = new Map<string, {
    playbookName: string;
    negative: number;
    total: number;
    lastNegativeAt: string | null;
  }>();

  for (const play of data) {
    const meta = play.metadata as Record<string, unknown> | null;
    const playbookSlug = (meta?.playbook_slug as string) ?? "unknown";
    const playbookName = (meta?.playbook_name as string) ?? playbookSlug;

    let pattern = patterns.get(playbookSlug);
    if (!pattern) {
      pattern = { playbookName, negative: 0, total: 0, lastNegativeAt: null };
      patterns.set(playbookSlug, pattern);
    }

    pattern.total++;
    if (play.user_feedback === "negative") {
      pattern.negative++;
      if (!pattern.lastNegativeAt || play.user_feedback_at > pattern.lastNegativeAt) {
        pattern.lastNegativeAt = play.user_feedback_at;
      }
    }
  }

  return Array.from(patterns.entries())
    .map(([playbookSlug, pattern]) => ({
      playbookSlug,
      playbookName: pattern.playbookName,
      negativeFeedbackCount: pattern.negative,
      totalPlays: pattern.total,
      negativeRate: pattern.total > 0 ? (pattern.negative / pattern.total) * 100 : 0,
      commonReasons: [],
      lastNegativeAt: pattern.lastNegativeAt,
    }))
    .filter((p) => p.negativeFeedbackCount >= 2)
    .sort((a, b) => b.negativeRate - a.negativeRate);
}

export interface AutoHandledMetrics {
  totalPlays: number;
  autoHandled: number;
  needsYou: number;
  autoHandledRate: number;
  trend: "increasing" | "decreasing" | "stable";
  periodDays: number;
}

export async function getAutoHandledMetrics(
  workspaceId: string,
  periodDays: number = 7
): Promise<AutoHandledMetrics> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const { data, error } = await admin
    .from("play_runs")
    .select("queue, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since.toISOString());

  if (error || !data) {
    console.error("Failed to get auto-handled metrics:", error);
    return {
      totalPlays: 0,
      autoHandled: 0,
      needsYou: 0,
      autoHandledRate: 0,
      trend: "stable",
      periodDays,
    };
  }

  const autoHandled = data.filter((p) => p.queue === "auto_handled").length;
  const needsYou = data.filter((p) => p.queue === "needs_you").length;
  const total = data.length;

  const midpoint = new Date(since.getTime() + (periodDays * 24 * 60 * 60 * 1000) / 2);
  const firstHalf = data.filter((p) => new Date(p.created_at) < midpoint);
  const secondHalf = data.filter((p) => new Date(p.created_at) >= midpoint);

  const firstHalfRate =
    firstHalf.length > 0
      ? firstHalf.filter((p) => p.queue === "auto_handled").length / firstHalf.length
      : 0;
  const secondHalfRate =
    secondHalf.length > 0
      ? secondHalf.filter((p) => p.queue === "auto_handled").length / secondHalf.length
      : 0;

  let trend: "increasing" | "decreasing" | "stable" = "stable";
  if (secondHalfRate - firstHalfRate > 0.05) trend = "increasing";
  else if (firstHalfRate - secondHalfRate > 0.05) trend = "decreasing";

  return {
    totalPlays: total,
    autoHandled,
    needsYou,
    autoHandledRate: total > 0 ? (autoHandled / total) * 100 : 0,
    trend,
    periodDays,
  };
}
