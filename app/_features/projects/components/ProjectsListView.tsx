"use client";

import Link from "next/link";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/_components/ui/table";
import { formatDistanceToNow, format } from "date-fns";

interface ProjectListData {
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
  totalValue: number | null;
  deadline: string | null;
  createdAt: string;
  taskCount: number;
  tags: Array<{ id: string; label: string; color: string }>;
}

interface ProjectsListViewProps {
  projects: ProjectListData[];
  enabledProperties?: string[];
}

function getHealthBadge(status: string | null) {
  switch (status) {
    case "on-track":
      return <Badge className="bg-success/15 text-success border-success/30 text-xs">On Track</Badge>;
    case "at-risk":
      return <Badge className="bg-warning/15 text-warning border-warning/30 text-xs">At Risk</Badge>;
    case "overdue":
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">Overdue</Badge>;
    default:
      return <span className="text-muted-foreground text-xs">—</span>;
  }
}

function getStatusBadge(status: string) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    not_started: { label: "Not Started", className: "bg-muted text-muted-foreground" },
    in_progress: { label: "In Progress", className: "bg-info/15 text-info border-info/30" },
    review: { label: "Review", className: "bg-warning/15 text-warning border-warning/30" },
    complete: { label: "Complete", className: "bg-success/15 text-success border-success/30" },
    on_hold: { label: "On Hold", className: "bg-muted text-muted-foreground" },
  };
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
}

export function ProjectsListView({
  projects,
  enabledProperties = ["client", "status", "health", "milestones", "deadline", "type"],
}: ProjectsListViewProps) {
  const showProperty = (prop: string) => enabledProperties.includes(prop);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[280px]">Project</TableHead>
            {showProperty("client") && <TableHead>Client</TableHead>}
            {showProperty("status") && <TableHead>Status</TableHead>}
            {showProperty("health") && <TableHead>Health</TableHead>}
            {showProperty("milestones") && <TableHead>Progress</TableHead>}
            {showProperty("type") && <TableHead>Type</TableHead>}
            {showProperty("value") && <TableHead className="text-right">Value</TableHead>}
            {showProperty("deadline") && <TableHead>Due</TableHead>}
            {showProperty("tasks") && <TableHead className="text-right">Tasks</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className="group">
              <TableCell>
                <Link
                  href="/work"
                  className="font-medium hover:text-primary transition-colors"
                >
                  {project.name}
                </Link>
                {showProperty("tags") && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.tags.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                      >
                        {tag.label}
                      </Badge>
                    ))}
                    {project.tags.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{project.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </TableCell>

              {showProperty("client") && (
                <TableCell className="text-muted-foreground">{project.clientName}</TableCell>
              )}

              {showProperty("status") && (
                <TableCell>{getStatusBadge(project.status)}</TableCell>
              )}

              {showProperty("health") && (
                <TableCell>{getHealthBadge(project.healthStatus)}</TableCell>
              )}

              {showProperty("milestones") && (
                <TableCell>
                  {project.isRetainer ? (
                    // Hours for retainers
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {project.usedHours || 0}/{project.includedHours || 0}h
                      </div>
                      {project.includedHours && (
                        <Progress
                          value={((project.usedHours || 0) / project.includedHours) * 100}
                          className="h-1.5 w-20"
                        />
                      )}
                    </div>
                  ) : project.milestoneProgress ? (
                    // Milestones for one-time
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {project.milestoneProgress.completed}/{project.milestoneProgress.total}
                      </div>
                      <Progress
                        value={
                          project.milestoneProgress.total > 0
                            ? (project.milestoneProgress.completed / project.milestoneProgress.total) * 100
                            : 0
                        }
                        className="h-1.5 w-20"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              )}

              {showProperty("type") && (
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {project.isRetainer ? "Retainer" : "One-Time"}
                  </Badge>
                </TableCell>
              )}

              {showProperty("value") && (
                <TableCell className="text-right">
                  {project.isRetainer && project.monthlyAmount ? (
                    <span className="text-sm">${project.monthlyAmount.toLocaleString()}/mo</span>
                  ) : project.totalValue ? (
                    <span className="text-sm">${project.totalValue.toLocaleString()}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              )}

              {showProperty("deadline") && (
                <TableCell>
                  {project.deadline ? (
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(project.deadline), "MMM d")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              )}

              {showProperty("tasks") && (
                <TableCell className="text-right text-muted-foreground">
                  {project.taskCount}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
