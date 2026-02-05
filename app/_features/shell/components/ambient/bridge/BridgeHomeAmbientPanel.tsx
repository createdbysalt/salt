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
  FolderKanban,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { usePageIntelligence } from "@/app/_features/intelligence/hooks/usePageIntelligence";

interface ProjectSummary {
  id: string;
  name: string;
  status: "active" | "review" | "completed" | "paused";
  progress: number;
}

interface UpcomingItem {
  id: string;
  type: "meeting" | "milestone" | "deliverable";
  title: string;
  date: Date;
  projectName?: string;
}

interface RecentUpdate {
  id: string;
  type: "file" | "message" | "status" | "milestone";
  description: string;
  timestamp: Date;
  projectName?: string;
}

interface BridgeHomeAmbientPanelProps {
  clientId: string;
  /** Active projects */
  projects?: ProjectSummary[];
  /** Upcoming items (meetings, milestones) */
  upcoming?: UpcomingItem[];
  /** Recent updates */
  recentUpdates?: RecentUpdate[];
  /** Pending items count */
  pendingItemsCount?: number;
}

/**
 * Ambient Panel for Bridge Home (Client Portal)
 *
 * Answers: "What's happening with my projects?"
 *
 * Uses client-friendly tone - simpler language, positive framing.
 *
 * Sections:
 * - Project Status
 * - Upcoming
 * - Recent Updates
 */
export function BridgeHomeAmbientPanel({
  clientId,
  projects = [],
  upcoming = [],
  recentUpdates = [],
  pendingItemsCount = 0,
}: BridgeHomeAmbientPanelProps) {
  const { insights, loading, refresh, pageConfig } = usePageIntelligence({
    pageType: "bridge-home",
    context: { clientId },
    autoRefresh: false,
  });

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary";
      case "review":
        return "bg-warning";
      case "completed":
        return "bg-success";
      case "paused":
        return "bg-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "In Progress";
      case "review":
        return "In Review";
      case "completed":
        return "Completed";
      case "paused":
        return "On Hold";
      default:
        return status;
    }
  };

  // Item type icon
  const getItemIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return Calendar;
      case "milestone":
        return CheckCircle;
      case "deliverable":
        return FileText;
      case "file":
        return FileText;
      case "message":
        return MessageSquare;
      case "status":
        return FolderKanban;
      default:
        return Clock;
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

      {/* Projects Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Your Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length > 0 ? (
            projects.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                href={`/bridge/projects/${project.id}`}
                className="group block"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {project.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        project.status === "active"
                          ? "text-primary border-primary/30"
                          : project.status === "completed"
                            ? "text-success border-success/30"
                            : "text-muted-foreground"
                      }`}
                    >
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="flex-1 h-1.5" />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {project.progress}%
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No active projects
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Items */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Coming Up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.slice(0, 3).map((item) => {
              const Icon = getItemIcon(item.type);
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.date), "EEE, MMM d")}
                      {item.projectName && ` • ${item.projectName}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Pending Items */}
      {pendingItemsCount > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <Link
              href="/bridge/pending"
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Items waiting for you</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingItemsCount} item{pendingItemsCount !== 1 ? "s" : ""} to review
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUpdates.slice(0, 4).map((update) => {
              const Icon = getItemIcon(update.type);
              return (
                <div key={update.id} className="flex items-start gap-3 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground">{update.description}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {formatDistanceToNow(new Date(update.timestamp), {
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
