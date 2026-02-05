"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Skeleton } from "@/app/_components/ui/skeleton";
import {
  AlertCircle,
  Calendar,
  CheckSquare,
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  InsightSection,
  InsightEmptyState,
  AlertCard,
  AmbientInsightRenderer,
} from "@/app/_features/intelligence/components";
import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";
import type { AlertInsight, AmbientInsight } from "@/app/_features/intelligence/types/ambient-intelligence";

interface StudioInboxAmbientPanelProps {
  studioId: string;
}

/**
 * Ambient Panel for Studio Inbox
 *
 * Answers: "What needs my attention right now?"
 *
 * Sections:
 * - Urgent Alerts (overdue invoices, clients needing attention)
 * - Today Summary (meetings, tasks due)
 * - Quick Actions (contextual shortcuts)
 */
export function StudioInboxAmbientPanel({ studioId }: StudioInboxAmbientPanelProps) {
  const { insights, loading, error, refresh, pageConfig } = usePageIntelligence({
    pageType: "studio-inbox",
    context: { studioId },
    autoRefresh: true,
  });

  // Separate insights by category
  const alertInsights = insights.filter(
    (i): i is AlertInsight => i.category === "alert"
  );
  const otherInsights = insights.filter((i) => i.category !== "alert");

  // Get urgent alerts (high/critical)
  const urgentAlerts = alertInsights.filter(
    (a) => a.action?.urgency === "critical" || a.action?.urgency === "high"
  );

  // Get medium priority alerts
  const mediumAlerts = alertInsights.filter(
    (a) => a.action?.urgency === "medium"
  );

  if (error) {
    return (
      <div className="flex h-full flex-col pt-2 px-6 pb-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm font-medium">Failed to load insights</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
      {/* Header with question */}
      {pageConfig && (
        <div className="text-xs text-muted-foreground italic px-1">
          {pageConfig.question}
        </div>
      )}

      {/* Urgent Alerts Section */}
      <InsightSection
        title="Needs Your Attention"
        icon="AlertCircle"
        loading={loading}
        skeletonCount={2}
      >
        {urgentAlerts.length > 0 ? (
          <div className="space-y-2">
            {urgentAlerts.slice(0, 3).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        ) : !loading ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-success">
                <CheckSquare className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">All clear</p>
                  <p className="text-xs text-muted-foreground">
                    No urgent items requiring attention
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </InsightSection>

      {/* Today Summary Section */}
      <InsightSection
        title="Today"
        icon="Calendar"
        loading={loading}
        skeletonCount={2}
      >
        {mediumAlerts.length > 0 ? (
          <div className="space-y-2">
            {mediumAlerts.slice(0, 3).map((alert) => (
              <AlertCard key={alert.id} alert={alert} compact />
            ))}
          </div>
        ) : !loading ? (
          <InsightEmptyState
            message="No scheduled items for today"
            icon="Calendar"
          />
        ) : null}

        {/* Show other insights (trends, etc.) */}
        {otherInsights.length > 0 && (
          <div className="space-y-2 mt-3">
            {otherInsights.slice(0, 2).map((insight) => (
              <AmbientInsightRenderer
                key={insight.id}
                insight={insight}
                compact
              />
            ))}
          </div>
        )}
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
            <Link href="/studio/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Add new client
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/studio/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Create project
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/studio/invoices/new">
              <FileText className="h-4 w-4 mr-2" />
              Send invoice
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/studio/messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Check messages
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Refresh indicator */}
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

/**
 * Loading skeleton for StudioInboxAmbientPanel
 */
export function StudioInboxAmbientPanelSkeleton() {
  return (
    <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
      {/* Urgent section skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>

      {/* Today section skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* Quick actions skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}
