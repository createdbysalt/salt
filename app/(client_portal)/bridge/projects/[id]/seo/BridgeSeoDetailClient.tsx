"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialGauge } from "@/components/dataviz/radial-gauge";
import { TrendsChart, type AuditDataPoint } from "@/app/_features/seo/components/trends-chart";
import { AuditBreakdown, type PageSpeedRawData } from "@/app/_features/seo/components/audit-breakdown";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@repo/utils";
import type { ClientSeoDetail } from "@/app/_features/seo/types";
import type { LighthouseScores } from "@/app/_features/seo/components/score-gauges";

// ============================================================================
// Types
// ============================================================================

interface BridgeSeoDetailClientProps {
  data: ClientSeoDetail;
  projectId: string;
}

interface ScoreDisplayProps {
  score: number;
  label: string;
  size?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

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

function ScoreDisplay({ score, label, size = 100 }: ScoreDisplayProps) {
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <RadialGauge
        value={score}
        color={color}
        size={size}
        thickness={7}
        showCenterLabel={true}
        className="[&_span]:text-xl [&_span]:font-semibold"
      />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BridgeSeoDetailClient({
  data,
  projectId,
}: BridgeSeoDetailClientProps) {
  const { visibleMetrics, latestAudit, auditHistory } = data;

  // Build visible gauges from latest audit
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

  // Prepare audit history for trends chart (need complete LighthouseScores)
  const trendsData: AuditDataPoint[] = auditHistory
    .filter((audit) => {
      // Only include audits with all score categories for the chart
      const scores = audit.scores;
      return (
        scores.performance !== undefined &&
        scores.accessibility !== undefined &&
        scores.bestPractices !== undefined &&
        scores.seo !== undefined
      );
    })
    .map((audit) => ({
      auditedAt: audit.auditedAt,
      scores: audit.scores as LighthouseScores,
    }));

  // Get raw data from latest audit for detailed breakdown
  const rawData = latestAudit?.rawData as PageSpeedRawData | undefined;

  return (
    <div className="space-y-6">
      {/* Score Gauges Card */}
      {visibleGauges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "flex justify-center gap-6 md:gap-10 py-2",
                visibleGauges.length <= 2 && "justify-center",
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
      )}

      {/* No scores available */}
      {visibleGauges.length === 0 && latestAudit === null && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No audit data available yet. Your studio will run audits periodically.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Trends Chart - only if enabled */}
      {visibleMetrics.trendCharts && (
        <TrendsChart audits={trendsData} />
      )}

      {/* Detailed Findings - only if enabled */}
      {visibleMetrics.detailedFindings && rawData && (
        <AuditBreakdown rawData={rawData} />
      )}

      {/* Empty state for detailed findings when no raw data */}
      {visibleMetrics.detailedFindings && !rawData && latestAudit && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Detailed audit findings will be available after the next scheduled audit.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
