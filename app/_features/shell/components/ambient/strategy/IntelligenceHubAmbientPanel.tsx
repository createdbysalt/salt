"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import {
  Brain,
  FileText,
  Lightbulb,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  InsightSection,
  InsightEmptyState,
} from "@/app/_features/intelligence/components";
import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";
import type { OpportunityInsight } from "@/app/_features/intelligence/types/ambient-intelligence";

interface PendingAction {
  id: string;
  title: string;
  type: "review" | "approve" | "execute";
  createdAt: Date;
}

interface IntelligenceHubAmbientPanelProps {
  studioId: string;
  /** Active AI processes count */
  activeProcesses?: number;
  /** Pending actions requiring attention */
  pendingActions?: PendingAction[];
  /** Recent insights count */
  recentInsightsCount?: number;
  /** Reports in queue */
  reportsInQueue?: number;
}

/**
 * Ambient Panel for Intelligence Hub (Strategy Mode)
 *
 * Answers: "What strategic insights are available?"
 *
 * Sections:
 * - AI Status (active processes)
 * - AI Insights
 * - Opportunities
 * - Quick Actions
 */
export function IntelligenceHubAmbientPanel({
  studioId,
  activeProcesses = 0,
  pendingActions = [],
  recentInsightsCount = 0,
  reportsInQueue = 0,
}: IntelligenceHubAmbientPanelProps) {
  const { insights, loading, error, refresh, pageConfig } = usePageIntelligence({
    pageType: "strategy-intelligence",
    context: { studioId },
    autoRefresh: true,
  });

  // Get opportunity insights
  const opportunityInsights = insights.filter(
    (i): i is OpportunityInsight => i.category === "opportunity"
  );

  // Get action type styling
  const getActionTypeStyle = (type: string) => {
    switch (type) {
      case "review":
        return "bg-warning/10 text-warning border-warning/30";
      case "approve":
        return "bg-primary/10 text-primary border-primary/30";
      case "execute":
        return "bg-success/10 text-success border-success/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
      {/* Header with question */}
      {pageConfig && (
        <div className="text-xs text-muted-foreground italic px-1">
          {pageConfig.question}
        </div>
      )}

      {/* AI Status Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Active Processes */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Processes</span>
            <div className="flex items-center gap-2">
              {activeProcesses > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              )}
              <span className="font-medium">{activeProcesses}</span>
            </div>
          </div>

          {/* Recent Insights */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Recent Insights</span>
            <Badge variant="secondary">{recentInsightsCount} today</Badge>
          </div>

          {/* Reports Queue */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reports in Queue</span>
            <span className="font-medium">{reportsInQueue}</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Pending Actions
              <Badge variant="secondary" className="ml-auto">
                {pendingActions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingActions.slice(0, 3).map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getActionTypeStyle(action.type)}>
                    {action.type}
                  </Badge>
                  <span className="text-sm">{action.title}</span>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/strategy/actions/${action.id}`}>
                    <Play className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ))}
            {pendingActions.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/strategy/actions">
                  View all {pendingActions.length} actions
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Insights Section */}
      <InsightSection
        title="AI Insights"
        icon="Sparkles"
        loading={loading}
        skeletonCount={2}
      >
        {insights.length > 0 ? (
          <div className="space-y-2">
            {insights.slice(0, 3).map((insight) => {
              // Get label based on insight type
              const label = 'metric' in insight && insight.metric
                ? insight.metric.label
                : 'alert' in insight && insight.alert
                ? insight.alert.title
                : 'opportunity' in insight && insight.opportunity
                ? insight.opportunity.title
                : 'activity' in insight && insight.activity
                ? insight.activity.type
                : 'insight' in insight
                ? `AI ${insight.aiAction}`
                : "Insight";

              // Get meaning if available
              const meaning = 'meaning' in insight && insight.meaning
                ? insight.meaning.plainEnglish
                : "";

              return (
                <Card key={insight.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{label}</p>
                        {meaning && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {meaning}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : !loading ? (
          <InsightEmptyState message="AI is analyzing your data..." icon="Sparkles" />
        ) : null}
      </InsightSection>

      {/* Opportunities Section */}
      <InsightSection
        title="Opportunities"
        icon="Lightbulb"
        loading={loading}
        skeletonCount={2}
      >
        {opportunityInsights.length > 0 ? (
          <div className="space-y-2">
            {opportunityInsights.slice(0, 2).map((opportunity) => (
              <Card key={opportunity.id} className="border-l-2 border-l-primary/50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{opportunity.opportunity.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {opportunity.meaning.plainEnglish}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !loading ? (
          <InsightEmptyState message="No new opportunities" icon="Lightbulb" />
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
            <Link href="/strategy/reports/new">
              <Plus className="h-4 w-4 mr-2" />
              Generate report
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/strategy/intelligence/analysis">
              <Brain className="h-4 w-4 mr-2" />
              Run analysis
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/strategy/reports">
              <FileText className="h-4 w-4 mr-2" />
              View reports
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
  );
}
