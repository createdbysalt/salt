"use client";

import Link from "next/link";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  FolderKanban,
  DollarSign,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProjectCardData {
  id: string;
  name: string;
  clientName: string;
  status: string;
  isRetainer: boolean;
  healthStatus: "on-track" | "at-risk" | "overdue" | null;
  milestoneProgress: { completed: number; total: number } | null;
  usedHours: number | null;
  includedHours: number | null;
  monthlyAmount: number | null;
  renewalDate: string | null;
  totalValue: number | null;
  deadline: string | null;
  taskCount: number;
  tags: Array<{ id: string; label: string; color: string }>;
}

interface ProjectsGridViewProps {
  projects: ProjectCardData[];
  enabledProperties?: string[];
}

function getHealthBadge(status: string | null) {
  switch (status) {
    case "on-track":
      return <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">On Track</Badge>;
    case "at-risk":
      return <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20">At Risk</Badge>;
    case "overdue":
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20">Overdue</Badge>;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  const statusLabels: Record<string, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    review: "Review",
    complete: "Complete",
    on_hold: "On Hold",
  };
  return (
    <Badge variant="outline" className="text-xs">
      {statusLabels[status] || status}
    </Badge>
  );
}

export function ProjectsGridView({
  projects,
  enabledProperties = ["client", "status", "health", "milestones", "deadline", "type"],
}: ProjectsGridViewProps) {
  const showProperty = (prop: string) => enabledProperties.includes(prop);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/studio/projects/${project.id}`}
          className="block h-full"
        >
          <Card className="hover:shadow-lg transition-shadow h-full group">
          <CardContent className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  {showProperty("client") && (
                    <p className="text-sm text-muted-foreground truncate">{project.clientName}</p>
                  )}
                </div>
                {showProperty("health") && getHealthBadge(project.healthStatus)}
              </div>

              {/* Tags */}
              {showProperty("tags") && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                  {project.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{project.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Metrics: Retainer */}
              {showProperty("type") && project.isRetainer && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hours Utilization</span>
                    <span className="font-medium">
                      {project.usedHours || 0}/{project.includedHours || 0}h
                    </span>
                  </div>
                  {project.includedHours && (
                    <Progress
                      value={((project.usedHours || 0) / project.includedHours) * 100}
                      className="h-2"
                    />
                  )}
                  {showProperty("value") && project.monthlyAmount && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>${project.monthlyAmount.toLocaleString()}/mo</span>
                      </div>
                      {project.renewalDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(project.renewalDate), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Metrics: One-Time */}
              {showProperty("milestones") && !project.isRetainer && project.milestoneProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Milestones</span>
                    <span className="font-medium">
                      {project.milestoneProgress.completed}/{project.milestoneProgress.total}
                    </span>
                  </div>
                  <Progress
                    value={
                      project.milestoneProgress.total > 0
                        ? (project.milestoneProgress.completed / project.milestoneProgress.total) * 100
                        : 0
                    }
                    className="h-2"
                  />
                  {showProperty("value") && project.totalValue && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Total: ${project.totalValue.toLocaleString()}</span>
                    </div>
                  )}
                  {showProperty("deadline") && project.deadline && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Due {formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t flex items-center justify-between text-sm">
                {showProperty("tasks") && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FolderKanban className="h-4 w-4" />
                    <span>{project.taskCount} tasks</span>
                  </div>
                )}
                {showProperty("status") && getStatusBadge(project.status)}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
