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
  BarChart3,
  DollarSign,
  Info,
  Lightbulb,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  InsightSection,
  InsightEmptyState,
  TrendCard,
  OpportunityCard,
} from "@/app/_features/intelligence/components";
import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";
import type {
  TrendInsight,
  OpportunityInsight,
} from "@/app/_features/intelligence/types/ambient-intelligence";

interface InsightsDashboardAmbientPanelProps {
  studioId: string;
  /** Revenue metrics */
  revenueMetrics?: {
    mrr: number;
    mrrChange: number;
    mrrDirection: "up" | "down" | "stable";
    ltv: number;
    ltvChange: number;
    arpu: number;
  };
  /** Churn risk metrics */
  churnRisk?: {
    atRiskClients: number;
    churnRate: number;
    potentialLoss: number;
  };
  /** Growth opportunities count */
  opportunitiesCount?: number;
}

/**
 * Ambient Panel for Insights Dashboard
 *
 * Answers: "What does my data tell me?"
 *
 * Sections:
 * - Revenue Metrics (MRR, LTV, trends)
 * - Churn Risk
 * - Growth Opportunities
 * - AI Insights
 */
export function InsightsDashboardAmbientPanel({
  studioId,
  revenueMetrics,
  churnRisk,
  opportunitiesCount = 0,
}: InsightsDashboardAmbientPanelProps) {
  const { insights, loading, error, refresh, pageConfig } = usePageIntelligence({
    pageType: "studio-insights",
    context: { studioId },
    autoRefresh: true,
  });

  // Separate insights by category
  const trendInsights = insights.filter(
    (i): i is TrendInsight => i.category === "trend"
  );
  const opportunityInsights = insights.filter(
    (i): i is OpportunityInsight => i.category === "opportunity"
  );

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
        {/* Header with question */}
        {pageConfig && (
          <div className="text-xs text-muted-foreground italic px-1">
            {pageConfig.question}
          </div>
        )}

        {/* Revenue Summary Card */}
        {revenueMetrics && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Revenue Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* MRR */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(revenueMetrics.mrr)}</span>
                    <Badge
                      variant="outline"
                      className={
                        revenueMetrics.mrrDirection === "up"
                          ? "text-success border-success/30 bg-success/10"
                          : revenueMetrics.mrrDirection === "down"
                            ? "text-destructive border-destructive/30 bg-destructive/10"
                            : "text-muted-foreground"
                      }
                    >
                      {revenueMetrics.mrrDirection === "up" ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : revenueMetrics.mrrDirection === "down" ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : null}
                      {revenueMetrics.mrrChange >= 0 ? "+" : ""}
                      {revenueMetrics.mrrChange}%
                    </Badge>
                  </div>
                </div>
              </div>

              {/* LTV */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. Client LTV</span>
                <span className="font-medium">{formatCurrency(revenueMetrics.ltv)}</span>
              </div>

              {/* ARPU */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ARPU</span>
                <span className="font-medium">{formatCurrency(revenueMetrics.arpu)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Churn Risk Section */}
        {churnRisk && churnRisk.atRiskClients > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                Churn Risk
                <Badge variant="secondary" className="ml-auto">
                  {churnRisk.atRiskClients} clients
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Churn Rate</span>
                <span className="font-medium text-warning">{churnRisk.churnRate}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Potential Loss</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(churnRisk.potentialLoss)}/mo
                </span>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/people?filter=at-risk">
                  View at-risk clients
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Growth Opportunities Section */}
        <InsightSection
          title="Growth Opportunities"
          icon="Lightbulb"
          loading={loading}
          skeletonCount={2}
        >
          {opportunityInsights.length > 0 ? (
            <div className="space-y-2">
              {opportunityInsights.slice(0, 3).map((opportunity) => (
                <Card key={opportunity.id} className="border-l-2 border-l-primary/50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{opportunity.opportunity.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {opportunity.meaning.plainEnglish}
                        </p>
                        {opportunity.action && opportunity.action.href && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 mt-1 text-xs"
                            asChild
                          >
                            <Link href={opportunity.action.href}>
                              {opportunity.action.label}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !loading ? (
            <InsightEmptyState message="No new opportunities identified" icon="Lightbulb" />
          ) : null}
        </InsightSection>

        {/* AI Insights Section */}
        <InsightSection
          title="AI Insights"
          icon="Sparkles"
          loading={loading}
          skeletonCount={2}
        >
          {trendInsights.length > 0 ? (
            <div className="space-y-2">
              {trendInsights.slice(0, 3).map((insight) => (
                <Card key={insight.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {insight.meaning.plainEnglish}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !loading ? (
            <InsightEmptyState message="AI is analyzing your data..." icon="Sparkles" />
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
              <Link href="/hq/insights">
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate report
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href="/people?filter=at-risk">
                <Users className="h-4 w-4 mr-2" />
                Review at-risk clients
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
