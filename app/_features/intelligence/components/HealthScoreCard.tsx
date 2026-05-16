"use client";

/**
 * HealthScoreCard Component
 *
 * Dedicated health score display with:
 * - Score gauge/progress
 * - Status badge (Healthy/At Risk/Critical)
 * - Contributing factors list
 * - Explainability tooltip
 * - Deep-dive sheet
 */

import * as React from "react";
import Link from "next/link";
import {
  Heart,
  Activity,
  Briefcase,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronRight,
  Database,
  Clock,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

export type HealthScoreVariant = "client" | "project" | "portfolio";

export interface HealthFactor {
  /** Factor description */
  reason: string;
  /** Impact on score (-30 to +30) */
  impact: number;
  /** Optional category */
  category?: string;
}

export interface HealthScoreCardProps {
  /** Health score (0-100) */
  score: number;
  /** Display variant */
  variant?: HealthScoreVariant;
  /** Label override (default based on variant) */
  label?: string;
  /** Factors contributing to the score */
  factors?: HealthFactor[];
  /** Data source for traceability */
  dataSource: DataSource;
  /** Calculation explanation for tooltip */
  calculationExplanation?: {
    baseScore: number;
    positiveFactors: string[];
    negativeFactors: string[];
  };
  /** Optional action */
  action?: InsightAction;
  /** Entity ID for linking */
  entityId?: string;
  /** Entity name for display */
  entityName?: string;
  /** Compact mode (less padding) */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const variantConfig: Record<HealthScoreVariant, { icon: typeof Heart; label: string; color: string }> = {
  client: { icon: Heart, label: "Client Health", color: "text-primary" },
  project: { icon: Activity, label: "Project Health", color: "text-info" },
  portfolio: { icon: Briefcase, label: "Portfolio Health", color: "text-accent" },
};

const getScoreStatus = (score: number) => {
  if (score >= 80) return { label: "Healthy", sentiment: "positive" as const };
  if (score >= 60) return { label: "At Risk", sentiment: "warning" as const };
  return { label: "Critical", sentiment: "negative" as const };
};

const sentimentStyles = {
  positive: {
    badge: "bg-success/10 text-success border-success/20",
    text: "text-success",
    progressFill: "[&>[data-slot=progress-indicator]]:bg-success",
  },
  warning: {
    badge: "bg-warning/10 text-warning border-warning/20",
    text: "text-warning",
    progressFill: "[&>[data-slot=progress-indicator]]:bg-warning",
  },
  negative: {
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    text: "text-destructive",
    progressFill: "[&>[data-slot=progress-indicator]]:bg-destructive",
  },
};

// ============================================================================
// Helper Components
// ============================================================================

function FactorItem({ factor }: { factor: HealthFactor }) {
  const isPositive = factor.impact > 0;
  return (
    <div className="flex items-start gap-2 text-sm">
      {isPositive ? (
        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
      )}
      <span className="text-muted-foreground flex-1">{factor.reason}</span>
      <span className={cn("text-xs font-medium", isPositive ? "text-success" : "text-destructive")}>
        {isPositive ? "+" : ""}{factor.impact}%
      </span>
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

export function HealthScoreCard({
  score,
  variant = "client",
  label,
  factors = [],
  dataSource,
  calculationExplanation,
  action,
  entityId,
  entityName,
  compact = false,
  className,
}: HealthScoreCardProps) {
  const config = variantConfig[variant];
  const status = getScoreStatus(score);
  const styles = sentimentStyles[status.sentiment];
  const Icon = config.icon;
  const displayLabel = label || config.label;

  const positiveFactors = factors.filter((f) => f.impact > 0);
  const negativeFactors = factors.filter((f) => f.impact < 0);

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
                <CardHeader className={cn("pb-2", compact && "py-2 px-3")}>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    {displayLabel}
                    <Info className="h-3 w-3 text-muted-foreground/50 ml-auto" />
                  </CardTitle>
                </CardHeader>
                <CardContent className={cn("space-y-3", compact && "py-2 px-3")}>
                  {/* Score Display */}
                  <div className="flex items-center justify-between">
                    <span className={cn("text-2xl font-bold tabular-nums", styles.text)}>
                      {score}%
                    </span>
                    <Badge variant="outline" className={styles.badge}>
                      {status.label}
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <Progress value={score} className={cn("h-2", styles.progressFill)} />

                  {/* Top Factors Preview */}
                  {factors.length > 0 && !compact && (
                    <div className="space-y-1.5 pt-2 border-t">
                      {factors.slice(0, 2).map((factor, idx) => (
                        <FactorItem key={idx} factor={factor} />
                      ))}
                      {factors.length > 2 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>+{factors.length - 2} more factors</span>
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </SheetTrigger>
          </TooltipTrigger>

          {/* Tooltip (Layer 2: Explain) */}
          <TooltipContent side="left" className="max-w-xs p-3">
            <p className="font-medium mb-1.5">{displayLabel}</p>
            {calculationExplanation ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Starts at {calculationExplanation.baseScore}% base, then adjusted by:</p>
                {calculationExplanation.positiveFactors.map((f, i) => (
                  <p key={i} className="text-success">+ {f}</p>
                ))}
                {calculationExplanation.negativeFactors.map((f, i) => (
                  <p key={i} className="text-destructive">- {f}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Click to see full breakdown and contributing factors.
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Sheet (Layer 3: Deep-Dive) */}
        <SheetContent side="right" className="w-[360px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Icon className={cn("h-5 w-5", config.color)} />
              {displayLabel}
              {entityName && <span className="text-muted-foreground font-normal">• {entityName}</span>}
            </SheetTitle>
            <SheetDescription>Full health breakdown and data source</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Score Display (Large) */}
            <div className="text-center">
              <div className={cn("text-5xl font-bold tabular-nums mb-2", styles.text)}>
                {score}%
              </div>
              <Badge variant="outline" className={cn("text-sm", styles.badge)}>
                {status.label}
              </Badge>
            </div>

            <Progress value={score} className={cn("h-3", styles.progressFill)} />

            <Separator />

            {/* Positive Factors */}
            {positiveFactors.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Positive Factors
                </div>
                <div className="space-y-2">
                  {positiveFactors.map((factor, idx) => (
                    <FactorItem key={idx} factor={factor} />
                  ))}
                </div>
              </div>
            )}

            {/* Negative Factors */}
            {negativeFactors.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Areas for Improvement
                </div>
                <div className="space-y-2">
                  {negativeFactors.map((factor, idx) => (
                    <FactorItem key={idx} factor={factor} />
                  ))}
                </div>
              </div>
            )}

            {factors.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No detailed factors available.
              </div>
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
                <Button asChild className="w-full" variant={action.urgency === "high" ? "default" : "outline"}>
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
