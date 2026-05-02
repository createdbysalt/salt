"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Flag,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";

interface Milestone {
  id: string;
  name: string;
  dueDate: Date;
  status: "upcoming" | "in_progress" | "completed";
  progress: number;
}

interface RecentActivity {
  id: string;
  type: "file" | "message" | "status" | "milestone";
  description: string;
  timestamp: Date;
}

interface TableProjectAmbientPanelProps {
  clientId: string;
  projectId: string;
  /** Project name */
  projectName?: string;
  /** Overall progress */
  progress?: number;
  /** Current phase/stage */
  currentPhase?: string;
  /** Milestones */
  milestones?: Milestone[];
  /** Recent activity */
  recentActivity?: RecentActivity[];
  /** Next milestone */
  nextMilestone?: Milestone;
}

/**
 * Ambient Panel for Bridge Project Detail (Client Portal)
 *
 * Answers: "How is this project progressing?"
 *
 * Uses client-friendly tone - simpler language, positive framing.
 *
 * Sections:
 * - Project Progress
 * - Milestones
 * - Recent Activity
 */
export function TableProjectAmbientPanel({
  clientId,
  projectId,
  projectName,
  progress = 0,
  currentPhase,
  milestones = [],
  recentActivity = [],
  nextMilestone,
}: TableProjectAmbientPanelProps) {
  const { insights, loading, refresh, pageConfig } = usePageIntelligence({
    pageType: "bridge-project-detail",
    context: { clientId, projectId },
    autoRefresh: false,
  });

  // Activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "file":
        return FileText;
      case "message":
        return MessageSquare;
      case "milestone":
        return Flag;
      default:
        return Clock;
    }
  };

  // Milestone status styling
  const getMilestoneStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "text-success border-success/30 bg-success/10";
      case "in_progress":
        return "text-primary border-primary/30 bg-primary/10";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="flex h-full flex-col pt-2 px-6 pb-6 space-y-4">
      {/* Header */}
      {pageConfig && (
        <div className="text-xs text-muted-foreground italic px-1">
          {pageConfig.question}
        </div>
      )}

      {/* Project Progress Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Project Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-primary">{progress}%</span>
              {currentPhase && (
                <Badge variant="outline">{currentPhase}</Badge>
              )}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Next Milestone */}
          {nextMilestone && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Next Milestone</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{nextMilestone.name}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(nextMilestone.dueDate), "MMM d")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestones */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.slice(0, 4).map((milestone) => (
              <div key={milestone.id} className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {milestone.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                    ) : (
                      <div
                        className={`h-4 w-4 rounded-full border-2 mt-0.5 ${
                          milestone.status === "in_progress"
                            ? "border-primary bg-primary/20"
                            : "border-muted-foreground/30"
                        }`}
                      />
                    )}
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          milestone.status === "completed"
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {milestone.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(milestone.dueDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {milestone.status !== "completed" && (
                    <Badge
                      variant="outline"
                      className={getMilestoneStatusStyle(milestone.status)}
                    >
                      {milestone.progress}%
                    </Badge>
                  )}
                </div>
                {milestone.status === "in_progress" && (
                  <Progress value={milestone.progress} className="h-1 ml-6" />
                )}
              </div>
            ))}
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
                    <p className="text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground/60">
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

      {/* Quick Actions - Client Friendly */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href={`/table/projects/${projectId}/messages`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send a message
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href={`/table/projects/${projectId}/files`}>
              <FileText className="h-4 w-4 mr-2" />
              View files
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href={`/table/projects/${projectId}/schedule`}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule a call
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
