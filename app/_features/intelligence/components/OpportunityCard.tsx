"use client";

/**
 * OpportunityCard Component
 *
 * Displays growth suggestions and opportunities:
 * - Opportunity title and description
 * - Potential impact indicator
 * - Confidence level
 * - CTA button
 */

import * as React from "react";
import Link from "next/link";
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  Target,
  ChevronRight,
  Database,
  Clock,
  ArrowRight,
  Zap,
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

import type { DataSource, InsightAction } from "../types/ambient-intelligence";

// ============================================================================
// Types
// ============================================================================

export type OpportunityImpact = "high" | "medium" | "low";
export type OpportunityConfidence = "high" | "medium" | "low";
export type OpportunityType = "growth" | "efficiency" | "retention" | "revenue" | "engagement";

export interface OpportunityCardProps {
  /** Opportunity title */
  title: string;
  /** Short description */
  description: string;
  /** Detailed explanation for deep-dive */
  details?: string;
  /** Potential impact level */
  impact: OpportunityImpact;
  /** Impact value (e.g., "$2,400/month", "+15%") */
  impactValue?: string;
  /** Confidence in the recommendation */
  confidence?: OpportunityConfidence;
  /** Type of opportunity */
  type?: OpportunityType;
  /** Data source for traceability */
  dataSource: DataSource;
  /** Action to take */
  action: InsightAction;
  /** Secondary actions */
  secondaryActions?: InsightAction[];
  /** Compact mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const impactStyles: Record<OpportunityImpact, { badge: string; icon: string }> = {
  high: {
    badge: "bg-success/10 text-success border-success/20",
    icon: "text-success",
  },
  medium: {
    badge: "bg-warning/10 text-warning border-warning/20",
    icon: "text-warning",
  },
  low: {
    badge: "bg-muted text-muted-foreground border-border",
    icon: "text-muted-foreground",
  },
};

const confidenceLabels: Record<OpportunityConfidence, string> = {
  high: "High confidence",
  medium: "Moderate confidence",
  low: "Exploratory",
};

const typeIcons: Record<OpportunityType, typeof Lightbulb> = {
  growth: TrendingUp,
  efficiency: Zap,
  retention: Target,
  revenue: TrendingUp,
  engagement: Sparkles,
};

const typeLabels: Record<OpportunityType, string> = {
  growth: "Growth Opportunity",
  efficiency: "Efficiency Gain",
  retention: "Retention Opportunity",
  revenue: "Revenue Opportunity",
  engagement: "Engagement Opportunity",
};

// ============================================================================
// Helper Components
// ============================================================================

function ImpactBadge({ impact, value }: { impact: OpportunityImpact; value?: string }) {
  const styles = impactStyles[impact];
  return (
    <Badge variant="outline" className={styles.badge}>
      <TrendingUp className={cn("h-3 w-3 mr-1", styles.icon)} />
      {value || `${impact.charAt(0).toUpperCase() + impact.slice(1)} impact`}
    </Badge>
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
        <span>Identified {timeAgo}</span>
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

export function OpportunityCard({
  title,
  description,
  details,
  impact,
  impactValue,
  confidence = "medium",
  type = "growth",
  dataSource,
  action,
  secondaryActions,
  compact = false,
  className,
}: OpportunityCardProps) {
  const TypeIcon = typeIcons[type];
  const typeLabel = typeLabels[type];

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
                  "border-l-2 border-l-primary/50 hover:border-l-primary",
                  className
                )}
              >
                <CardContent className={cn("p-3", compact && "p-2")}>
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-muted">
                          <Lightbulb className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight">
                            {title}
                          </p>
                          {!compact && (
                            <p className="text-xs text-muted-foreground">{typeLabel}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>

                    {/* Description */}
                    {!compact && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                    )}

                    {/* Impact Badge */}
                    <div className="flex items-center gap-2">
                      <ImpactBadge impact={impact} value={impactValue} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SheetTrigger>
          </TooltipTrigger>

          {/* Tooltip (Layer 2) */}
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{title}</p>
              <p className="text-muted-foreground text-[11px]">{description}</p>
              {impactValue && (
                <p className="text-success text-xs font-medium">Potential: {impactValue}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Sheet (Layer 3) */}
        <SheetContent side="right" className="w-[360px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Opportunity
            </SheetTitle>
            <SheetDescription>{typeLabel}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Title & Description */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            {/* Impact & Confidence */}
            <div className="flex flex-wrap gap-2">
              <ImpactBadge impact={impact} value={impactValue} />
              <Badge variant="outline" className="bg-muted/50">
                {confidenceLabels[confidence]}
              </Badge>
            </div>

            {/* Details */}
            {details && (
              <>
                <Separator />
                <div>
                  <div className="text-sm font-medium mb-2">Why This Matters</div>
                  <p className="text-sm text-muted-foreground">{details}</p>
                </div>
              </>
            )}

            {/* Impact Breakdown */}
            {impactValue && (
              <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-success">Potential Impact</span>
                </div>
                <p className="text-2xl font-bold text-success">{impactValue}</p>
              </div>
            )}

            <Separator />

            {/* Data Source */}
            <div>
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Based On
              </div>
              <DataSourceDisplay dataSource={dataSource} />
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4">
              {action.href && (
                <Button asChild className="w-full">
                  <Link href={action.href}>
                    {action.label}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
              {secondaryActions?.map((secondaryAction, idx) =>
                secondaryAction.href ? (
                  <Button key={idx} asChild variant="outline" className="w-full">
                    <Link href={secondaryAction.href}>
                      {secondaryAction.label}
                    </Link>
                  </Button>
                ) : null
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
