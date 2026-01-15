"use client";

import { useState, useMemo } from "react";
import { LineChart } from "@/components/charts/line-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { cn } from "@repo/utils";
import { format, subDays, isAfter } from "date-fns";
import type { LighthouseScores } from "@/components/seo/score-gauges";

// ============================================================================
// Types
// ============================================================================

export interface AuditDataPoint {
  /** ISO date string of when the audit was performed */
  auditedAt: string;
  /** Lighthouse scores object */
  scores: LighthouseScores;
}

export interface TrendsChartProps {
  /** Array of audit data points, ordered by date (most recent first) */
  audits: AuditDataPoint[];
  /** Whether the chart is loading */
  isLoading?: boolean;
  /** Optional CSS class */
  className?: string;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

interface ChartDataPoint {
  date: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

// ============================================================================
// Constants
// ============================================================================

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

const LINE_CONFIG = [
  { dataKey: "performance", name: "Performance", stroke: "rgb(34, 197, 94)" }, // green
  { dataKey: "accessibility", name: "Accessibility", stroke: "rgb(59, 130, 246)" }, // blue
  { dataKey: "bestPractices", name: "Best Practices", stroke: "rgb(249, 115, 22)" }, // orange
  { dataKey: "seo", name: "SEO", stroke: "rgb(168, 85, 247)" }, // purple
];

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysAgo(range: TimeRange): number | null {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "all":
      return null;
  }
}

function filterAuditsByRange(audits: AuditDataPoint[], range: TimeRange): AuditDataPoint[] {
  const daysAgo = getDaysAgo(range);
  if (daysAgo === null) {
    return audits;
  }

  const cutoffDate = subDays(new Date(), daysAgo);
  return audits.filter((audit) => isAfter(new Date(audit.auditedAt), cutoffDate));
}

function transformToChartData(audits: AuditDataPoint[]): ChartDataPoint[] {
  // Reverse to get chronological order (oldest first for chart)
  return [...audits].reverse().map((audit) => ({
    date: format(new Date(audit.auditedAt), "MMM d"),
    performance: audit.scores.performance,
    accessibility: audit.scores.accessibility,
    bestPractices: audit.scores.bestPractices,
    seo: audit.scores.seo,
  }));
}

// ============================================================================
// Components
// ============================================================================

/**
 * TrendsChart - Line chart showing Lighthouse score trends over time
 * Displays four lines (one per category) with time range selector
 */
export function TrendsChart({
  audits,
  isLoading = false,
  className,
}: TrendsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const filteredAudits = useMemo(
    () => filterAuditsByRange(audits, timeRange),
    [audits, timeRange]
  );

  const chartData = useMemo(
    () => transformToChartData(filteredAudits),
    [filteredAudits]
  );

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Score Trends</CardTitle>
          <div className="flex gap-1">
            {TIME_RANGES.map((range) => (
              <Skeleton key={range.value} className="h-8 w-10" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty state - need at least 2 data points to show a trend
  if (audits.length < 2) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-medium">Score Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">
              {audits.length === 0
                ? "No audit data available"
                : "Run at least 2 audits to see score trends"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Track how your site&apos;s scores change over time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data in selected range
  if (chartData.length < 2) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">Score Trends</CardTitle>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">
              No data in selected time range
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Try selecting a longer time range
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Score Trends</CardTitle>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </CardHeader>
      <CardContent>
        <LineChart
          data={chartData}
          lines={LINE_CONFIG}
          xAxisKey="date"
          height={300}
        />
      </CardContent>
    </Card>
  );
}

/**
 * TimeRangeSelector - Button group for selecting time range
 */
function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  return (
    <div className="flex gap-1">
      {TIME_RANGES.map((range) => (
        <Button
          key={range.value}
          variant={value === range.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(range.value)}
          className={cn(
            "h-8 px-3 text-xs",
            value !== range.value && "text-muted-foreground"
          )}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
