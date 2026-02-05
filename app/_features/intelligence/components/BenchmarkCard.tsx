"use client";

/**
 * BenchmarkCard Component
 *
 * Displays a value compared to a benchmark:
 * - Current value
 * - Benchmark value and source
 * - Visual comparison (above/below/at)
 * - Contextual explanation
 */

import * as React from "react";
import Link from "next/link";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Database,
  Clock,
  Info,
  Award,
  BarChart3,
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
  TooltipProvider,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Separator,
} from "@repo/ui";

import type { DataSource, InsightAction } from "../types/ambient-intelligence";

// ============================================================================
// Types
// ============================================================================

export type BenchmarkSource = "user_historical" | "portfolio_avg" | "industry_avg" | "target" | "custom";
export type BenchmarkComparison = "above" | "below" | "at";

export interface BenchmarkCardProps {
  /** Metric label */
  label: string;
  /** Current value (formatted) */
  value: string;
  /** Raw numeric value for calculations */
  rawValue: number;
  /** Unit */
  unit?: string;
  /** Benchmark value (formatted) */
  benchmarkValue: string;
  /** Raw benchmark value */
  benchmarkRawValue: number;
  /** Benchmark label (e.g., "Industry Average", "Your Best Month") */
  benchmarkLabel: string;
  /** Benchmark source type */
  benchmarkSource: BenchmarkSource;
  /** Comparison result */
  comparison: BenchmarkComparison;
  /** Difference from benchmark (e.g., "+15%", "-$200") */
  differenceLabel?: string;
  /** Data source for traceability */
  dataSource: DataSource;
  /** Explanation */
  explanation?: {
    plainEnglish: string;
    recommendation?: string;
  };
  /** Optional action */
  action?: InsightAction;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Compact mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const comparisonStyles: Record<BenchmarkComparison, {
  badge: string;
  text: string;
  icon: typeof TrendingUp;
}> = {
  above: {
    badge: "bg-success/10 text-success border-success/20",
    text: "text-success",
    icon: TrendingUp,
  },
  below: {
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    text: "text-destructive",
    icon: TrendingDown,
  },
  at: {
    badge: "bg-muted text-muted-foreground border-border",
    text: "text-muted-foreground",
    icon: Minus,
  },
};

const sourceLabels: Record<BenchmarkSource, string> = {
  user_historical: "Based on your history",
  portfolio_avg: "Your portfolio average",
  industry_avg: "Industry average",
  target: "Your target",
  custom: "Custom benchmark",
};

const sourceIcons: Record<BenchmarkSource, typeof Target> = {
  user_historical: BarChart3,
  portfolio_avg: BarChart3,
  industry_avg: Award,
  target: Target,
  custom: Target,
};

// ============================================================================
// Helper Components
// ============================================================================

function ComparisonBar({
  value,
  benchmark,
  comparison,
}: {
  value: number;
  benchmark: number;
  comparison: BenchmarkComparison;
}) {
  const max = Math.max(value, benchmark) * 1.2;
  const valuePercent = (value / max) * 100;
  const benchmarkPercent = (benchmark / max) * 100;
  const styles = comparisonStyles[comparison];

  return (
    <div className="space-y-2">
      {/* Value bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Current</span>
          <span className={cn("font-medium", styles.text)}>{value.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all",
              comparison === "above" ? "bg-success" :
              comparison === "below" ? "bg-destructive" : "bg-muted-foreground"
            )}
            style={{ width: `${valuePercent}%` }}
          />
        </div>
      </div>

      {/* Benchmark bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Benchmark</span>
          <span className="text-muted-foreground">{benchmark.toLocaleString()}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-muted-foreground/40 rounded-full"
            style={{ width: `${benchmarkPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

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

export function BenchmarkCard({
  label,
  value,
  rawValue,
  unit,
  benchmarkValue,
  benchmarkRawValue,
  benchmarkLabel,
  benchmarkSource,
  comparison,
  differenceLabel,
  dataSource,
  explanation,
  action,
  icon,
  compact = false,
  className,
}: BenchmarkCardProps) {
  const styles = comparisonStyles[comparison];
  const ComparisonIcon = styles.icon;
  const SourceIcon = sourceIcons[benchmarkSource];

  return (
    <TooltipProvider>
      <Sheet>
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
                <CardContent className={cn("p-3", compact && "p-2")}>
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-1.5">
                      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {label}
                      </span>
                      <Info className="h-3 w-3 text-muted-foreground/50 shrink-0 ml-auto" />
                    </div>

                    {/* Value with comparison */}
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-semibold text-foreground">{value}</span>
                        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                      </div>
                      <Badge variant="outline" className={cn("text-xs", styles.badge)}>
                        <ComparisonIcon className="h-3 w-3 mr-1" />
                        {differenceLabel || (comparison === "above" ? "Above" : comparison === "below" ? "Below" : "At")}
                      </Badge>
                    </div>

                    {/* Benchmark reference */}
                    {!compact && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Target className="h-3 w-3" />
                        <span>{benchmarkLabel}: {benchmarkValue}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </SheetTrigger>
          </TooltipTrigger>

          {/* Tooltip (Layer 2) */}
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">
                {comparison === "above" ? "Above" : comparison === "below" ? "Below" : "At"} {benchmarkLabel}
              </p>
              {explanation ? (
                <p className="text-muted-foreground text-[11px]">{explanation.plainEnglish}</p>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  Your {label.toLowerCase()} is {differenceLabel || comparison} the benchmark.
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Sheet (Layer 3) */}
        <SheetContent side="right" className="w-[360px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {icon || <Target className="h-5 w-5" />}
              {label}
            </SheetTitle>
            <SheetDescription>Benchmark comparison and analysis</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Current Value */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Value</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{value}</span>
                {unit && <span className="text-muted-foreground">{unit}</span>}
              </div>
              <div className="mt-2">
                <Badge variant="outline" className={cn("text-sm", styles.badge)}>
                  <ComparisonIcon className="h-4 w-4 mr-1" />
                  {differenceLabel || `${comparison.charAt(0).toUpperCase() + comparison.slice(1)} benchmark`}
                </Badge>
              </div>
            </div>

            {/* Visual Comparison */}
            <div>
              <div className="text-sm text-muted-foreground mb-3">Comparison</div>
              <ComparisonBar
                value={rawValue}
                benchmark={benchmarkRawValue}
                comparison={comparison}
              />
            </div>

            <Separator />

            {/* Benchmark Details */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <SourceIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{benchmarkLabel}</span>
              </div>
              <p className="text-2xl font-bold text-muted-foreground">{benchmarkValue}</p>
              <p className="text-xs text-muted-foreground mt-1">{sourceLabels[benchmarkSource]}</p>
            </div>

            {/* Explanation */}
            {explanation && (
              <>
                <div>
                  <div className="text-sm font-medium mb-2">What This Means</div>
                  <p className="text-sm text-muted-foreground">{explanation.plainEnglish}</p>
                </div>

                {explanation.recommendation && (
                  <div>
                    <div className="text-sm font-medium mb-2">Recommendation</div>
                    <p className="text-sm text-muted-foreground">{explanation.recommendation}</p>
                  </div>
                )}
              </>
            )}

            <Separator />

            {/* Data Source */}
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data Source
              </div>
              <DataSourceDisplay dataSource={dataSource} />
            </div>

            {/* Action */}
            {action && action.href && (
              <div className="pt-4">
                <Button asChild className="w-full" variant="outline">
                  <Link href={action.href}>
                    {action.label}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
