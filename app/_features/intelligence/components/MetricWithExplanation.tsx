"use client";

/**
 * MetricWithExplanation Component
 *
 * Implements the Three-Layer Interaction Model:
 * 1. GLANCE (Always Visible): Metric value, trend indicator, status badge
 * 2. EXPLAIN (Tooltip on Hover): What it means, why it matters
 * 3. DEEP-DIVE (Sheet on Click): Full data, computation details, actions
 *
 * Anti-Hallucination: All data must include DataSource for traceability.
 */

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ExternalLink,
  Database,
  Clock,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardContent,
  Badge,
  Progress,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Separator,
} from "@repo/ui";

import type {
  DataSource,
  InsightMeaning,
  InsightAction,
  InsightSentiment,
} from "../types/ambient-intelligence";

// ============================================================================
// Types
// ============================================================================

interface SparklineData {
  values: number[];
  direction?: "up" | "down" | "stable";
  changePercent?: number;
}

interface MetricWithExplanationProps {
  /** Metric label (e.g., "Monthly Revenue", "Client Health") */
  label: string;
  /** Formatted display value (e.g., "$12.5k", "85%") */
  value: string;
  /** Raw numeric value for calculations */
  rawValue?: number;
  /** Unit for the metric */
  unit?: string;
  /** Sentiment determines color scheme */
  sentiment: InsightSentiment;
  /** Data source for anti-hallucination traceability */
  dataSource?: DataSource;
  /** Meaning layer - what it means and why it matters */
  meaning?: InsightMeaning;
  /** Optional action to take */
  action?: InsightAction;
  /** Optional sparkline trend data */
  sparkline?: SparklineData;
  /** Optional health score (0-100) for progress display */
  healthScore?: number;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Sentiment Color Mapping (Semantic Colors Only)
// ============================================================================

const sentimentStyles: Record<InsightSentiment, {
  badge: string;
  text: string;
  progressFill: string;
}> = {
  positive: {
    badge: "bg-success/10 text-success border-success/20",
    text: "text-success",
    progressFill: "[&>[data-slot=progress-indicator]]:bg-success",
  },
  negative: {
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    text: "text-destructive",
    progressFill: "[&>[data-slot=progress-indicator]]:bg-destructive",
  },
  warning: {
    badge: "bg-warning/10 text-warning border-warning/20",
    text: "text-warning",
    progressFill: "[&>[data-slot=progress-indicator]]:bg-warning",
  },
  neutral: {
    badge: "bg-muted text-muted-foreground border-border",
    text: "text-muted-foreground",
    progressFill: "[&>[data-slot=progress-indicator]]:bg-muted-foreground",
  },
};

// ============================================================================
// Sparkline Component (Mini Trend Visualization)
// ============================================================================

function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  if (!values || values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const width = 60;
  const height = 20;
  const padding = 2;

  const points = values
    .map((val, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-5 w-15", className)}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground"
      />
    </svg>
  );
}

// ============================================================================
// Trend Indicator
// ============================================================================

function TrendIndicator({
  direction,
  changePercent,
  sentiment,
}: {
  direction?: "up" | "down" | "stable";
  changePercent?: number;
  sentiment: InsightSentiment;
}) {
  if (!direction) return null;

  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const styles = sentimentStyles[sentiment];

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", styles.text)}>
      <Icon className="h-3 w-3" />
      {changePercent !== undefined && (
        <span>{direction === "down" ? "" : "+"}{changePercent}%</span>
      )}
    </span>
  );
}

// ============================================================================
// Data Source Display (Anti-Hallucination)
// ============================================================================

function DataSourceDisplay({ dataSource }: { dataSource: DataSource }) {
  const computedAt = new Date(dataSource.computedAt);
  const timeAgo = getTimeAgo(computedAt);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Database className="h-3 w-3" />
        <span className="font-mono">{dataSource.table}</span>
      </div>
      <div className="bg-muted/50 rounded-md p-2 font-mono text-[11px] text-muted-foreground">
        {dataSource.computation}
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Computed {timeAgo}</span>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================================
// Main Component
// ============================================================================

export function MetricWithExplanation({
  label,
  value,
  rawValue: _rawValue,
  unit,
  sentiment,
  dataSource,
  meaning,
  action,
  sparkline,
  healthScore,
  icon,
  className,
}: MetricWithExplanationProps) {
  const styles = sentimentStyles[sentiment];

  return (
    <Sheet>
      {/* LAYER 1: GLANCE - Always Visible */}
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Card
              className={cn(
                "cursor-pointer transition-all duration-150",
                "hover:bg-muted/50 active:scale-[0.98]",
                "border-transparent hover:border-border",
                className
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Label */}
                    <div className="flex items-center gap-1.5 mb-1">
                      {icon && (
                        <span className="text-muted-foreground shrink-0">
                          {icon}
                        </span>
                      )}
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {label}
                      </span>
                      <Info className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                    </div>

                    {/* Value */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-foreground">
                        {value}
                      </span>
                      {unit && (
                        <span className="text-xs text-muted-foreground">{unit}</span>
                      )}
                    </div>

                    {/* Health Score Progress */}
                    {healthScore !== undefined && (
                      <div className="mt-2">
                        <Progress
                          value={healthScore}
                          className={cn("h-1.5", styles.progressFill)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Side: Trend/Sparkline */}
                  <div className="flex flex-col items-end gap-1">
                    {sparkline?.direction && (
                      <TrendIndicator
                        direction={sparkline.direction}
                        changePercent={sparkline.changePercent}
                        sentiment={sentiment}
                      />
                    )}
                    {sparkline?.values && (
                      <MiniSparkline values={sparkline.values} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </SheetTrigger>
        </TooltipTrigger>

        {/* LAYER 2: EXPLAIN - Tooltip on Hover */}
        <TooltipContent side="left" className="max-w-xs">
          {meaning ? (
            <div className="space-y-1">
              <p className="font-medium">{meaning.plainEnglish}</p>
              <p className="text-muted-foreground text-[11px]">{meaning.whyItMatters}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-[11px]">Click for details</p>
          )}
        </TooltipContent>
      </Tooltip>

      {/* LAYER 3: DEEP-DIVE - Sheet on Click */}
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {icon}
            {label}
          </SheetTitle>
          <SheetDescription>
            Detailed breakdown and data source
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Current Value */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Current Value</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{value}</span>
              {unit && <span className="text-muted-foreground">{unit}</span>}
            </div>
            {sparkline?.direction && (
              <div className="mt-2">
                <Badge variant="outline" className={styles.badge}>
                  <TrendIndicator
                    direction={sparkline.direction}
                    changePercent={sparkline.changePercent}
                    sentiment={sentiment}
                  />
                  <span className="ml-1">vs last period</span>
                </Badge>
              </div>
            )}
          </div>

          {/* Health Score Detail */}
          {healthScore !== undefined && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">Health Score</div>
              <div className="flex items-center gap-3">
                <Progress
                  value={healthScore}
                  className={cn("flex-1 h-2", styles.progressFill)}
                />
                <span className={cn("text-sm font-medium", styles.text)}>
                  {healthScore}%
                </span>
              </div>
            </div>
          )}

          {/* Sparkline Chart (Larger) */}
          {sparkline?.values && sparkline.values.length > 1 && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">Trend (6 months)</div>
              <div className="bg-muted/30 rounded-lg p-3">
                <MiniSparkline values={sparkline.values} className="h-12 w-full" />
              </div>
            </div>
          )}

          <Separator />

          {/* Meaning Section */}
          {meaning && (
            <>
              <div>
                <div className="text-sm font-medium mb-2">What This Means</div>
                <p className="text-sm text-muted-foreground">{meaning.plainEnglish}</p>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Why It Matters</div>
                <p className="text-sm text-muted-foreground">{meaning.whyItMatters}</p>
              </div>
            </>
          )}

          {/* Benchmark Comparison */}
          {meaning?.benchmark && (
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">
                {meaning.benchmark.label}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {typeof meaning.benchmark.value === "number"
                    ? meaning.benchmark.value.toLocaleString()
                    : meaning.benchmark.value}
                </span>
                <Badge variant="outline" className={styles.badge}>
                  {meaning.benchmark.comparison === "above" ? "Above" :
                   meaning.benchmark.comparison === "below" ? "Below" : "At"} benchmark
                </Badge>
              </div>
            </div>
          )}

          {dataSource && (
            <>
              <Separator />

              {/* Data Source (Anti-Hallucination) */}
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Source
                </div>
                <DataSourceDisplay dataSource={dataSource} />
              </div>
            </>
          )}

          {/* Action */}
          {action && action.href && (
            <div className="pt-4">
              <Button asChild className="w-full" variant="outline">
                <Link href={action.href}>
                  {action.label}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
