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
  Activity,
  AlertCircle,
  ArrowRight,
  Ban,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Flag,
  Info,
  ListTodo,
  MessageSquare,
  Plus,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import {
  InsightSection,
  InsightEmptyState,
  AlertCard,
} from "@/app/_features/intelligence/components";
import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";
import type { AlertInsight } from "@/app/_features/intelligence/types/ambient-intelligence";

interface ProjectDetailAmbientPanelProps {
  studioId: string;
  projectId: string;
  /** Project health score (0-100) */
  healthScore?: number;
  /** Factors contributing to health score */
  healthFactors?: Array<{
    reason: string;
    impact: number;
  }>;
  /** Project milestones */
  milestones?: Array<{
    id: string;
    name: string;
    dueDate: Date;
    status: "pending" | "in_progress" | "completed" | "overdue";
    progress: number;
  }>;
  /** Recent activity */
  recentActivity?: Array<{
    id: string;
    type: "task" | "comment" | "file" | "milestone" | "status_change";
    description: string;
    timestamp: Date;
    actor?: string;
  }>;
  /** Project completion percentage */
  completionPercent?: number;
  /** Tasks stats */
  taskStats?: {
    total: number;
    completed: number;
    overdue: number;
    inProgress: number;
  };
}

/**
 * Ambient Panel for Project Detail View
 *
 * Answers: "Is this project on track?"
 *
 * Sections:
 * - Project Health (with factors)
 * - Milestones Due
 * - Blockers (overdue tasks, issues)
 * - Recent Activity
 * - Quick Actions
 */
export function ProjectDetailAmbientPanel({
  studioId,
  projectId,
  healthScore = 75,
  healthFactors = [],
  milestones = [],
  recentActivity = [],
  completionPercent = 0,
  taskStats,
}: ProjectDetailAmbientPanelProps) {
  const { insights, loading, error, refresh, pageConfig } = usePageIntelligence({
    pageType: "studio-project-detail",
    context: { studioId, projectId },
    autoRefresh: false,
  });

  // Get alert insights (blockers)
  const alertInsights = insights.filter(
    (i): i is AlertInsight => i.category === "alert"
  );

  // Get milestones that are overdue or due soon (within 7 days)
  const upcomingMilestones = milestones.filter((m) => {
    if (m.status === "completed") return false;
    const dueDate = new Date(m.dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return m.status === "overdue" || daysUntilDue <= 7;
  });

  // Health score semantic color classes
  const getHealthColorClass = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getHealthBadgeClass = (score: number) => {
    if (score >= 80) return "text-success border-success/30 bg-success/10";
    if (score >= 60) return "text-warning border-warning/30 bg-warning/10";
    return "text-destructive border-destructive/30 bg-destructive/10";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "On Track";
    if (score >= 60) return "At Risk";
    return "Off Track";
  };

  // Milestone status styling
  const getMilestoneStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "text-success";
      case "in_progress":
        return "text-primary";
      case "overdue":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  // Activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task":
        return ListTodo;
      case "comment":
        return MessageSquare;
      case "file":
        return FileText;
      case "milestone":
        return Flag;
      case "status_change":
        return Activity;
      default:
        return Clock;
    }
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

        {/* Project Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Project Health
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-3.5 w-3.5" />
                    <span className="sr-only">How is this calculated?</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[280px] p-3">
                  <p className="font-medium mb-2">How Project Health is Calculated</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Starts at 70% base score, then adjusted by:
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <span className="text-success">+15%</span> for task completion rate
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-success">+10%</span> for milestones on track
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-destructive">−20%</span> for overdue tasks
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-destructive">−15%</span> for missed milestones
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Health Score */}
            <div className="flex items-center justify-between">
              <span
                className={`text-2xl font-bold tabular-nums ${getHealthColorClass(healthScore)}`}
              >
                {healthScore}%
              </span>
              <Badge variant="outline" className={getHealthBadgeClass(healthScore)}>
                {getHealthLabel(healthScore)}
              </Badge>
            </div>
            <Progress
              value={healthScore}
              className={`h-2 ${
                healthScore >= 80
                  ? "[&>[data-slot=progress-indicator]]:bg-success"
                  : healthScore >= 60
                    ? "[&>[data-slot=progress-indicator]]:bg-warning"
                    : "[&>[data-slot=progress-indicator]]:bg-destructive"
              }`}
            />

            {/* Completion Progress */}
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{completionPercent}%</span>
            </div>

            {/* Task Stats */}
            {taskStats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium text-success">
                      {taskStats.completed}/{taskStats.total}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Overdue</span>
                    <span
                      className={`font-medium ${taskStats.overdue > 0 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {taskStats.overdue}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Health Factors */}
            {healthFactors.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Contributing Factors
                </p>
                {healthFactors.slice(0, 3).map((factor, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    {factor.impact > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    )}
                    <span className="text-muted-foreground">
                      {factor.reason}
                      <span
                        className={`ml-1 text-xs ${factor.impact > 0 ? "text-success" : "text-destructive"}`}
                      >
                        ({factor.impact > 0 ? "+" : ""}
                        {factor.impact}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
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
                  <Link href={`/studio/projects/${projectId}?tab=tasks&filter=blocked`}>
                    View all {alertInsights.length} blockers
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
                      Project is progressing smoothly
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </InsightSection>

        {/* Milestones Due */}
        {upcomingMilestones.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                <Flag className="h-4 w-4" />
                Upcoming Milestones
                <Badge variant="secondary" className="ml-auto">
                  {upcomingMilestones.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingMilestones.slice(0, 3).map((milestone) => {
                const dueDate = new Date(milestone.dueDate);
                const isOverdue = milestone.status === "overdue";
                return (
                  <div key={milestone.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{milestone.name}</p>
                        <p
                          className={`text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {isOverdue ? "Overdue • " : ""}
                          {format(dueDate, "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={getMilestoneStatusClass(milestone.status)}
                      >
                        {milestone.progress}%
                      </Badge>
                    </div>
                    <Progress
                      value={milestone.progress}
                      className={`h-1 ${isOverdue ? "[&>[data-slot=progress-indicator]]:bg-destructive" : ""}`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.slice(0, 4).map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-muted-foreground truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        {activity.actor && <span>{activity.actor} • </span>}
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

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
              <Link href={`/studio/projects/${projectId}/tasks/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add task
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href={`/studio/projects/${projectId}?tab=milestones`}>
                <Flag className="h-4 w-4 mr-2" />
                Manage milestones
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href={`/studio/projects/${projectId}?tab=team`}>
                <Users className="h-4 w-4 mr-2" />
                View team
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link href={`/studio/projects/${projectId}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit project
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
