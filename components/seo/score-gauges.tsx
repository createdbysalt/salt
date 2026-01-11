"use client";

import { RadialGauge } from "@/components/dataviz/radial-gauge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/libs/cn";

// ============================================================================
// Types
// ============================================================================

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface ScoreGaugeProps {
  /** Score value from 0-100 */
  score: number;
  /** Label to display below the gauge */
  label: string;
  /** Size of the gauge in pixels */
  size?: number;
  /** Whether the gauge is loading */
  isLoading?: boolean;
  className?: string;
}

export interface ScoreGaugesGridProps {
  /** Lighthouse scores object */
  scores: LighthouseScores | null;
  /** Whether the scores are loading */
  isLoading?: boolean;
  /** Size of each gauge in pixels */
  gaugeSize?: number;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color for score based on Lighthouse thresholds
 * - Red (<50): Poor
 * - Orange (50-89): Needs Improvement
 * - Green (90+): Good
 */
function getScoreColor(score: number): string {
  if (score < 50) {
    return "rgb(239, 68, 68)"; // red-500
  }
  if (score < 90) {
    return "rgb(249, 115, 22)"; // orange-500
  }
  return "rgb(34, 197, 94)"; // green-500
}

// ============================================================================
// Components
// ============================================================================

/**
 * ScoreGauge - Single Lighthouse score display
 * Shows a radial gauge with color coding based on score
 */
export function ScoreGauge({
  score,
  label,
  size = 120,
  isLoading = false,
  className,
}: ScoreGaugeProps) {
  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <Skeleton className="rounded-full" style={{ width: size, height: size }} />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  const color = getScoreColor(score);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <RadialGauge
        value={score}
        color={color}
        size={size}
        thickness={8}
        showCenterLabel={true}
        className="[&_span]:text-2xl [&_span]:font-semibold"
      />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * ScoreGaugesGrid - Grid of four Lighthouse score gauges
 * Displays Performance, Accessibility, Best Practices, and SEO scores
 */
export function ScoreGaugesGrid({
  scores,
  isLoading = false,
  gaugeSize = 120,
  className,
}: ScoreGaugesGridProps) {
  // Empty state when no scores available
  if (!scores && !isLoading) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-muted-foreground">No audit data available</p>
        <p className="text-sm text-muted-foreground mt-1">
          Run an audit to see your site&apos;s scores
        </p>
      </div>
    );
  }

  const gaugeData = [
    { key: "performance", label: "Performance", score: scores?.performance ?? 0 },
    { key: "accessibility", label: "Accessibility", score: scores?.accessibility ?? 0 },
    { key: "bestPractices", label: "Best Practices", score: scores?.bestPractices ?? 0 },
    { key: "seo", label: "SEO", score: scores?.seo ?? 0 },
  ];

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-6", className)}>
      {gaugeData.map((item) => (
        <ScoreGauge
          key={item.key}
          score={item.score}
          label={item.label}
          size={gaugeSize}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
