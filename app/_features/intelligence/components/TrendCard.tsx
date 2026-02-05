"use client";

/**
 * TrendCard Component
 *
 * Displays a metric with trend visualization:
 * - Current value with change indicator
 * - Sparkline visualization
 * - Trend direction (up/down/stable)
 * - Explanation of what the trend means
 */

import * as React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ChevronRight,
  Database,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardContent,
  Badge,
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

import type { DataSource, InsightAction, InsightSentiment } from "../types/ambient-intelligence";

// ============================================================================
// Types
// ============================================================================

export interface TrendDataPoint {
  value: number;
  label: string; // e.g., "Jan", "Feb" or "Week 1"
}

export interface TrendCardProps {
  /** Metric label */
  label: string;
  /** Current value (formatted for display) */
  value: string;
  /** Raw numeric value */
  rawValue?: number;
  /** Unit (e.g., "$", "%", "clients") */
  unit?: string;
  /** Trend direction */
  direction: "up" | "down" | "stable";
  /** Change amount (e.g., "+12%", "-$500") */
  changeLabel?: string;
  /** Change as percentage */
  changePercent?: number;
  /** Sentiment (determines colors) */
  sentiment: InsightSentiment;
  /** Historical data for sparkline */
  history?: TrendDataPoint[];
  /** Plain values for simple sparkline */
  sparklineValues?: number[];
  /** Data source for traceability */
  dataSource: DataSource;
  /** Explanation text */
  explanation?: {
    plainEnglish: string;
    whyItMatters: string;
  };
  /** Optional action */
  action?: InsightAction;
  /** Compact mode */
  compact?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Sentiment Styles
// ============================================================================

const sentimentStyles: Record<InsightSentiment, {
  badge: string;
  text: string;
  sparkline: string;
}> = {
  positive: {
    badge: "bg-success/10 text-success border-success/20",
    text: "text-success",
    sparkline: "text-success",
  },
  negative: {
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    text: "text-destructive",
    sparkline: "text-destructive",
  },
  warning: {
    badge: "bg-warning/10 text-warning border-warning/20",
    text: "text-warning",
    sparkline: "text-warning",
  },
  neutral: {
    badge: "bg-muted text-muted-foreground border-border",
    text: "text-muted-foreground",
    sparkline: "text-muted-foreground",
  },
};

// ============================================================================
// Sparkline Component
// ============================================================================

function Sparkline({
  values,
  className,
  height = 32,
  width = 80,
}: {
  values: number[];
  className?: string;
  height?: number;
  width?: number;
}) {
  if (!values || values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const padding = 2;

  const points = values
    .map((val, i) => {
      const x = padding + (i / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  // Create area fill
  const areaPoints = [
    `${padding},${height - padding}`,
    ...points.split(" "),
    `${width - padding},${height - padding}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      style={{ width, height }}
      preserveAspectRatio="none"
    >
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill="currentColor"
        fillOpacity="0.1"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End point dot */}
      {values.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2)}
          r="3"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

// ============================================================================
// Trend Icon
// ============================================================================

function TrendIcon({ direction, className }: { direction: "up" | "down" | "stable"; className?: string }) {
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  return <Icon className={className} />;
}

// ============================================================================
// Data Source Display
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

export function TrendCard({
  label,
  value,
  rawValue: _rawValue,
  unit,
  direction,
  changeLabel,
  changePercent,
  sentiment,
  history,
  sparklineValues,
  dataSource,
  explanation,
  action,
  compact = false,
  icon,
  className,
}: TrendCardProps) {
  const styles = sentimentStyles[sentiment];
  const values = sparklineValues || history?.map((h) => h.value) || [];
  const displayChange = changeLabel || (changePercent !== undefined ? `${changePercent >= 0 ? "+" : ""}${changePercent}%` : null);

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
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Label + Value */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
                        <span className="text-xs font-medium text-muted-foreground truncate">
                          {label}
                        </span>
                        <Info className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-foreground">{value}</span>
                        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                      </div>

                      {/* Change Badge */}
                      {displayChange && (
                        <div className="mt-1.5">
                          <Badge variant="outline" className={cn("text-xs", styles.badge)}>
                            <TrendIcon direction={direction} className="h-3 w-3 mr-1" />
                            {displayChange}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Right: Sparkline */}
                    {values.length >= 2 && (
                      <div className={cn("shrink-0", styles.sparkline)}>
                        <Sparkline values={values} height={compact ? 24 : 32} width={compact ? 60 : 80} />
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
              {explanation ? (
                <>
                  <p className="font-medium">{explanation.plainEnglish}</p>
                  <p className="text-muted-foreground text-[11px]">{explanation.whyItMatters}</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Click for detailed trend analysis</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Sheet (Layer 3) */}
        <SheetContent side="right" className="w-[360px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {icon}
              {label}
            </SheetTitle>
            <SheetDescription>Trend analysis and data source</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Large Value Display */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Value</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{value}</span>
                {unit && <span className="text-muted-foreground">{unit}</span>}
              </div>
              {displayChange && (
                <div className="mt-2">
                  <Badge variant="outline" className={cn("text-sm", styles.badge)}>
                    <TrendIcon direction={direction} className="h-4 w-4 mr-1" />
                    {displayChange} vs last period
                  </Badge>
                </div>
              )}
            </div>

            {/* Large Sparkline */}
            {values.length >= 2 && (
              <div>
                <div className="text-sm text-muted-foreground mb-2">Trend Over Time</div>
                <div className={cn("bg-muted/30 rounded-lg p-4", styles.sparkline)}>
                  <Sparkline values={values} height={80} width={300} className="w-full" />
                </div>
                {history && history.length > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                    <span>{history[0].label}</span>
                    <span>{history[history.length - 1].label}</span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Explanation */}
            {explanation && (
              <>
                <div>
                  <div className="text-sm font-medium mb-2">What This Means</div>
                  <p className="text-sm text-muted-foreground">{explanation.plainEnglish}</p>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Why It Matters</div>
                  <p className="text-sm text-muted-foreground">{explanation.whyItMatters}</p>
                </div>

                <Separator />
              </>
            )}

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
