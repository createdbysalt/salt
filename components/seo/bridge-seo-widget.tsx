"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RadialGauge } from "@/components/dataviz/radial-gauge";
import { ArrowRight } from "lucide-react";
import { cn } from "@/libs/cn";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { ClientSeoData } from "@/app/actions/seo";

// ============================================================================
// Types
// ============================================================================

export interface BridgeSeoWidgetProps {
  /** SEO data for the project (from getClientSeoData action) */
  data: ClientSeoData | null;
  /** Project ID for navigation to detail page */
  projectId: string;
  /** Whether the data is loading */
  isLoading?: boolean;
  className?: string;
}

interface ScoreDisplayProps {
  score: number;
  label: string;
  size?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color for score based on Lighthouse thresholds
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
// Sub-components
// ============================================================================

function ScoreDisplay({ score, label, size = 80 }: ScoreDisplayProps) {
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <RadialGauge
        value={score}
        color={color}
        size={size}
        thickness={6}
        showCenterLabel={true}
        className="[&_span]:text-lg [&_span]:font-semibold"
      />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-28" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-32 mx-auto" />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * BridgeSeoWidget - Displays SEO scores on the Bridge project page
 * Shows only metrics enabled in client_visible_metrics settings.
 * Hides entirely if no metrics are visible or SEO is not configured.
 */
export function BridgeSeoWidget({
  data,
  projectId,
  isLoading = false,
  className,
}: BridgeSeoWidgetProps) {
  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Hide widget entirely if no data or no visible metrics
  if (!data || !data.hasAnyVisibleMetrics) {
    return null;
  }

  const { visibleMetrics, latestAudit } = data;

  // Build list of visible score gauges
  const visibleGauges: Array<{ key: string; label: string; score: number }> = [];
  if (latestAudit?.scores) {
    if (visibleMetrics.performance && latestAudit.scores.performance !== undefined) {
      visibleGauges.push({
        key: "performance",
        label: "Performance",
        score: latestAudit.scores.performance,
      });
    }
    if (visibleMetrics.seo && latestAudit.scores.seo !== undefined) {
      visibleGauges.push({
        key: "seo",
        label: "SEO",
        score: latestAudit.scores.seo,
      });
    }
    if (visibleMetrics.accessibility && latestAudit.scores.accessibility !== undefined) {
      visibleGauges.push({
        key: "accessibility",
        label: "Accessibility",
        score: latestAudit.scores.accessibility,
      });
    }
    if (visibleMetrics.bestPractices && latestAudit.scores.bestPractices !== undefined) {
      visibleGauges.push({
        key: "bestPractices",
        label: "Best Practices",
        score: latestAudit.scores.bestPractices,
      });
    }
  }

  // Check if detail page link should be shown (if there's more to see)
  const hasDetailContent =
    visibleMetrics.detailedFindings || visibleMetrics.trendCharts;

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Site Health</CardTitle>
          {hasDetailContent && (
            <Button variant="ghost" size="sm" asChild className="h-8 text-sm">
              <Link href={`/bridge/projects/${projectId}/seo`}>
                View Details
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score gauges */}
        {visibleGauges.length > 0 ? (
          <div
            className={cn(
              "flex justify-center gap-4 md:gap-6",
              visibleGauges.length === 1 && "justify-center",
              visibleGauges.length === 2 && "justify-center",
            )}
          >
            {visibleGauges.map((gauge) => (
              <ScoreDisplay
                key={gauge.key}
                score={gauge.score}
                label={gauge.label}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No audit data available yet</p>
          </div>
        )}

        {/* Last updated timestamp */}
        {latestAudit && (
          <p className="text-center text-xs text-muted-foreground">
            Last updated{" "}
            {formatDistanceToNow(new Date(latestAudit.auditedAt), {
              addSuffix: true,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
