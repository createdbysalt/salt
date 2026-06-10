"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSign,
  GitBranch,
  Info,
  PauseCircle,
  PieChart,
  Plus,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  InsightSection,
  InsightEmptyState,
  AlertCard,
} from "@/app/_features/intelligence/components";
import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";
import type { AlertInsight } from "@/app/_features/intelligence/types/ambient-intelligence";

interface PipelineStage {
  key: string;
  label: string;
  count: number;
  value: number;
  color: string;
}

interface StalledDeal {
  id: string;
  clientName: string;
  value: number;
  stage: string;
  daysStalled: number;
}

interface PipelineAmbientPanelProps {
  studioId: string;
  /** Total pipeline value */
  totalValue?: number;
  /** Pipeline change percentage */
  valueChange?: number;
  /** Stage distribution */
  stages?: PipelineStage[];
  /** Stalled deals */
  stalledDeals?: StalledDeal[];
  /** Weighted pipeline value */
  weightedValue?: number;
  /** Win rate percentage */
  winRate?: number;
}

/**
 * Ambient Panel for Pipeline View
 *
 * Answers: "How healthy is my sales pipeline?"
 *
 * Sections:
 * - Pipeline Value (total, weighted)
 * - Stage Distribution
 * - Stalled Deals
 * - Quick Actions
 */
export function PipelineAmbientPanel({
  studioId,
  totalValue = 0,
  valueChange = 0,
  stages = [],
  stalledDeals = [],
  weightedValue = 0,
  winRate = 0,
}: PipelineAmbientPanelProps) {
  const { insights, loading, error, refresh, pageConfig } = usePageIntelligence({
    pageType: "studio-pipeline",
    context: { studioId },
    autoRefresh: false,
  });

  // Get alert insights (stalled deals, needs attention)
  const alertInsights = insights.filter(
    (i): i is AlertInsight => i.category === "alert"
  );

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  // Calculate total for percentages
  const totalCount = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
        {/* Header with question */}
        {pageConfig && (
          <div className="text-xs text-muted-foreground italic px-1">
            {pageConfig.question}
          </div>
        )}

        {/* Pipeline Value Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pipeline Value
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[260px] p-3">
                  <p className="font-medium mb-1.5">Pipeline Metrics</p>
                  <p className="text-xs text-muted-foreground">
                    Total value is the sum of all deals. Weighted value accounts
                    for probability at each stage.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Value */}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{formatCurrency(totalValue)}</span>
              <Badge
                variant="outline"
                className={
                  valueChange >= 0
                    ? "text-success border-success/30 bg-success/10"
                    : "text-destructive border-destructive/30 bg-destructive/10"
                }
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {valueChange >= 0 ? "+" : ""}
                {valueChange}%
              </Badge>
            </div>

            {/* Weighted Value */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Weighted Value</span>
              <span className="font-medium">{formatCurrency(weightedValue)}</span>
            </div>

            {/* Win Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Win Rate</span>
                <span className="font-medium">{winRate}%</span>
              </div>
              <Progress
                value={winRate}
                className={`h-1.5 ${
                  winRate >= 30
                    ? "[&>[data-slot=progress-indicator]]:bg-success"
                    : winRate >= 15
                      ? "[&>[data-slot=progress-indicator]]:bg-warning"
                      : "[&>[data-slot=progress-indicator]]:bg-destructive"
                }`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Stage Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stages.map((stage) => {
              const percentage = totalCount > 0 ? (stage.count / totalCount) * 100 : 0;
              return (
                <div key={stage.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{stage.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(stage.value)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {stage.count}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No deals in pipeline
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stalled Deals Section */}
        <InsightSection
          title="Stalled Deals"
          icon="PauseCircle"
          loading={loading}
          skeletonCount={2}
        >
          {stalledDeals.length > 0 ? (
            <div className="space-y-2">
              {stalledDeals.slice(0, 3).map((deal) => (
                <Link
                  key={deal.id}
                  href={`/people/${deal.id}`}
                  className="group block"
                >
                  <Card className="border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{deal.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.stage} • {formatCurrency(deal.value)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-warning border-warning/30">
                            <Clock className="h-3 w-3 mr-1" />
                            {deal.daysStalled}d
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {stalledDeals.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="/people?filter=stalled">
                    View all {stalledDeals.length} stalled deals
                  </Link>
                </Button>
              )}
            </div>
          ) : !loading ? (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Pipeline is moving</p>
                    <p className="text-xs text-muted-foreground">
                      No stalled deals detected
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </InsightSection>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href="/people/new">
                <Plus className="h-4 w-4 mr-2" />
                Add new lead
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href="/people?view=board">
                <GitBranch className="h-4 w-4 mr-2" />
                View pipeline board
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Refresh */}
        {!loading && (
          <div className="flex items-center justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={refresh}
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Refresh
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
