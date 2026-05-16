"use client";

/**
 * ClientContextPanel
 *
 * Displays client intelligence context during proposal creation.
 * Shows health score, LTV, project history, payment history, and pricing suggestions.
 *
 * Phase 4 of Intelligence-Powered Proposal Generation
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Skeleton } from "@/app/_components/ui/skeleton";
import {
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Clock,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import type { ClientProposalContext } from "@/app/_features/intelligence/generators/proposal-generator";

interface ClientContextPanelProps {
  clientId: string;
  onContextLoaded?: (context: ClientProposalContext | null) => void;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format relative date
 */
function formatRelativeDate(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function ClientContextPanel({
  clientId,
  onContextLoaded,
}: ClientContextPanelProps) {
  const [context, setContext] = useState<ClientProposalContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContext() {
      if (!clientId) {
        setContext(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/intelligence/client-context?clientId=${clientId}`
        );

        if (!response.ok) {
          throw new Error("Failed to load client context");
        }

        const data = await response.json();
        setContext(data);
        onContextLoaded?.(data);
      } catch (e) {
        console.error("Error loading client context:", e);
        setError("Unable to load client intelligence");
        setContext(null);
        onContextLoaded?.(null);
      } finally {
        setLoading(false);
      }
    }

    fetchContext();
  }, [clientId, onContextLoaded]);

  if (loading) {
    return <ClientContextSkeleton />;
  }

  if (error || !context) {
    return null; // Silently fail - context is optional
  }

  // Determine if we have any meaningful data to show
  const hasData =
    context.health ||
    context.ltv ||
    context.projectHistory ||
    context.paymentHistory;

  if (!hasData) {
    return null; // No data to display
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Client Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score */}
        {context.health && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>Health Score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{context.health.score}%</span>
              <HealthBadge status={context.health.status} />
            </div>
          </div>
        )}

        {/* LTV */}
        {context.ltv && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Lifetime Value</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {formatCurrency(context.ltv.totalValue, context.ltv.currency)}
              </span>
              <TrendBadge trend={context.ltv.trend} />
            </div>
          </div>
        )}

        {/* Project History */}
        {context.projectHistory && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderOpen className="h-4 w-4" />
              <span>Projects</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <span className="font-medium">
                      {context.projectHistory.completedProjects}/
                      {context.projectHistory.totalProjects}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {formatCurrency(context.projectHistory.averageValue)} avg
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Completed:</strong>{" "}
                      {context.projectHistory.completedProjects} of{" "}
                      {context.projectHistory.totalProjects}
                    </p>
                    {context.projectHistory.projectTypes.length > 0 && (
                      <p>
                        <strong>Types:</strong>{" "}
                        {context.projectHistory.projectTypes.join(", ")}
                      </p>
                    )}
                    {context.projectHistory.lastProjectDate && (
                      <p>
                        <strong>Last project:</strong>{" "}
                        {formatRelativeDate(
                          context.projectHistory.lastProjectDate
                        )}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Payment History */}
        {context.paymentHistory && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Payment History</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {context.paymentHistory.onTimePercentage}% on-time
              </span>
              {context.paymentHistory.outstandingBalance > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs text-warning">
                        {formatCurrency(
                          context.paymentHistory.outstandingBalance
                        )}{" "}
                        due
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Outstanding invoices
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* Suggested Pricing */}
        {context.suggestedPricing && (
          <div className="pt-3 mt-3 border-t border-border/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">Suggested Pricing</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(
                    context.suggestedPricing.recommendedAmount,
                    context.suggestedPricing.currency
                  )}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <ConfidenceBadge
                          confidence={context.suggestedPricing.confidence}
                        />
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <p>{context.suggestedPricing.reasoning}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Health status badge
 */
function HealthBadge({ status }: { status: "healthy" | "warning" | "critical" }) {
  switch (status) {
    case "healthy":
      return (
        <Badge
          variant="outline"
          className="text-xs border-success/30 bg-success/10 text-success"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Healthy
        </Badge>
      );
    case "warning":
      return (
        <Badge
          variant="outline"
          className="text-xs border-warning/30 bg-warning/10 text-warning"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Attention
        </Badge>
      );
    case "critical":
      return (
        <Badge
          variant="outline"
          className="text-xs border-destructive/30 bg-destructive/10 text-destructive"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          At Risk
        </Badge>
      );
  }
}

/**
 * LTV trend badge
 */
function TrendBadge({ trend }: { trend: "growing" | "stable" | "declining" }) {
  switch (trend) {
    case "growing":
      return (
        <Badge
          variant="outline"
          className="text-xs border-success/30 bg-success/10 text-success"
        >
          <TrendingUp className="h-3 w-3 mr-1" />
          Growing
        </Badge>
      );
    case "stable":
      return (
        <Badge
          variant="outline"
          className="text-xs border-info/30 bg-info/10 text-info"
        >
          <Minus className="h-3 w-3 mr-1" />
          Stable
        </Badge>
      );
    case "declining":
      return (
        <Badge
          variant="outline"
          className="text-xs border-warning/30 bg-warning/10 text-warning"
        >
          <TrendingDown className="h-3 w-3 mr-1" />
          Declining
        </Badge>
      );
  }
}

/**
 * Confidence badge for pricing suggestions
 */
function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  switch (confidence) {
    case "high":
      return (
        <Badge variant="secondary" className="text-xs">
          High confidence
        </Badge>
      );
    case "medium":
      return (
        <Badge variant="secondary" className="text-xs">
          Medium confidence
        </Badge>
      );
    case "low":
      return (
        <Badge variant="outline" className="text-xs">
          Low confidence
        </Badge>
      );
  }
}

/**
 * Loading skeleton
 */
function ClientContextSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
