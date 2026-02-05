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
  Flag,
  FolderOpen,
  Info,
  Layers,
  Plus,
  RefreshCw,
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

interface ProjectsListAmbientPanelProps {
  studioId: string;
  /** Project distribution by status */
  statusDistribution?: Record<string, number>;
  /** Active projects count */
  activeCount?: number;
  /** Total projects count */
  totalCount?: number;
  /** Overdue milestones */
  overdueMilestones?: Array<{
    id: string;
    projectId: string;
    projectName: string;
    milestoneName: string;
    dueDate: Date;
    daysOverdue: number;
  }>;
}

/**
 * Ambient Panel for Projects List View
 *
 * Answers: "What's the status of my active projects?"
 *
 * Sections:
 * - Project Distribution (by status)
 * - Blockers (projects with overdue tasks)
 * - Milestones Due
 * - Quick Actions
 */
export function ProjectsListAmbientPanel({
  studioId,
  statusDistribution = {},
  activeCount = 0,
  totalCount = 0,
  overdueMilestones = [],
}: ProjectsListAmbientPanelProps) {
  const { insights, loading, error, refresh, pageConfig } = usePageIntelligence({
    pageType: "studio-projects-list",
    context: { studioId },
    autoRefresh: false,
  });

  // Get alert insights (project blockers, overdue tasks)
  const alertInsights = insights.filter(
    (i): i is AlertInsight => i.category === "alert"
  );

  // Calculate distribution percentages
  const statuses = [
    { key: "planning", label: "Planning", color: "bg-muted-foreground/50" },
    { key: "in_progress", label: "In Progress", color: "bg-primary" },
    { key: "review", label: "Review", color: "bg-warning" },
    { key: "completed", label: "Completed", color: "bg-success" },
    { key: "on_hold", label: "On Hold", color: "bg-muted-foreground/30" },
  ];

  const totalProjects = Object.values(statusDistribution).reduce(
    (sum, count) => sum + count,
    0
  ) || totalCount;

  // Calculate health percentage (active projects without blockers)
  const blockedCount = alertInsights.length;
  const healthPercent =
    activeCount > 0
      ? Math.round(((activeCount - blockedCount) / activeCount) * 100)
      : 100;

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
        {/* Header with question */}
        {pageConfig && (
          <div className="text-xs text-muted-foreground italic px-1">
            {pageConfig.question}
          </div>
        )}

        {/* Project Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Project Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Projects */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="h-4 w-4" />
                <span>Total Projects</span>
              </div>
              <span className="font-semibold">{totalProjects}</span>
            </div>

            {/* Active Projects */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="h-4 w-4 text-primary" />
                <span>Active</span>
              </div>
              <span className="font-semibold text-primary">{activeCount}</span>
            </div>

            {/* Project Health */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Portfolio Health</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="h-3 w-3" />
                        <span className="sr-only">How is this calculated?</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[260px] p-3">
                      <p className="font-medium mb-1.5">Project Health</p>
                      <p className="text-xs text-muted-foreground">
                        Percentage of active projects without blockers or overdue
                        tasks. Projects with issues need attention.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span
                  className={`font-semibold ${
                    healthPercent >= 80
                      ? "text-success"
                      : healthPercent >= 50
                        ? "text-warning"
                        : "text-destructive"
                  }`}
                >
                  {healthPercent}%
                </span>
              </div>
              <Progress
                value={healthPercent}
                className={`h-2 ${
                  healthPercent >= 80
                    ? "[&>[data-slot=progress-indicator]]:bg-success"
                    : healthPercent >= 50
                      ? "[&>[data-slot=progress-indicator]]:bg-warning"
                      : "[&>[data-slot=progress-indicator]]:bg-destructive"
                }`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Blockers Section */}
        <InsightSection
          title="Blockers"
          icon="Ban"
          loading={loading}
          skeletonCount={2}
        >
          {alertInsights.length > 0 ? (
            <div className="space-y-2">
              {alertInsights.slice(0, 3).map((alert) => (
                <AlertCard key={alert.id} alert={alert} compact />
              ))}
              {alertInsights.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href="/studio/projects?filter=blocked">
                    View all {alertInsights.length} blocked projects
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
                    <p className="text-sm font-medium">No blockers</p>
                    <p className="text-xs text-muted-foreground">
                      All projects are progressing smoothly
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </InsightSection>

        {/* Milestones Due */}
        {overdueMilestones.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                <Flag className="h-4 w-4" />
                Milestones Overdue
                <Badge variant="secondary" className="ml-auto">
                  {overdueMilestones.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueMilestones.slice(0, 3).map((milestone) => (
                <Link
                  key={milestone.id}
                  href={`/studio/projects/${milestone.projectId}`}
                  className="group flex items-start justify-between p-2 -mx-2 rounded-md hover:bg-warning/10 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{milestone.milestoneName}</p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.projectName} • {milestone.daysOverdue}d overdue
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statuses.map((status) => {
              const count = statusDistribution[status.key] || 0;
              const percentage =
                totalProjects > 0 ? (count / totalProjects) * 100 : 0;

              return (
                <div key={status.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{status.label}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${status.color} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

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
              <Link href="/studio/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                Create new project
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href="/studio/projects?filter=overdue">
                <Clock className="h-4 w-4 mr-2" />
                View overdue tasks
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
    </TooltipProvider>
  );
}
