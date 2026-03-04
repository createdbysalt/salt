"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@repo/ui";
import { cn } from "@repo/utils";

type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived" | "not_started" | "in_progress" | "review" | "complete";

const STATUS_CONFIG: Record<string, { label: string; dotClass: string }> = {
  not_started: { label: "Not Started", dotClass: "bg-muted-foreground" },
  draft: { label: "Draft", dotClass: "bg-muted-foreground" },
  active: { label: "Active", dotClass: "bg-muted-foreground" },
  in_progress: { label: "In Progress", dotClass: "bg-muted-foreground" },
  review: { label: "Review", dotClass: "bg-muted-foreground" },
  on_hold: { label: "On Hold", dotClass: "bg-muted-foreground" },
  completed: { label: "Completed", dotClass: "bg-muted-foreground" },
  complete: { label: "Complete", dotClass: "bg-muted-foreground" },
  archived: { label: "Archived", dotClass: "bg-muted-foreground" },
};

interface ProjectForGrid {
  id: string;
  name: string;
  clientName: string;
  status: string;
  totalValue: number | null;
  monthlyAmount: number | null;
  isRetainer: boolean;
}

interface ProjectsGridViewProps {
  projects: ProjectForGrid[];
  enabledProperties?: string[];
}

export function ProjectsGridView({ projects }: ProjectsGridViewProps) {
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No projects found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((project) => {
        const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
        const value = project.isRetainer ? project.monthlyAmount : project.totalValue;

        return (
          <Link
            key={project.id}
            href={`/studio/projects/${project.id}`}
            className="group block rounded-lg border bg-card p-5 hover:bg-muted/50 transition-colors"
          >
            {/* Top: Avatar + Name + Client */}
            <div className="flex items-start gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-muted text-sm font-medium">
                  {project.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{project.name}</p>
                {project.clientName && (
                  <p className="text-xs text-muted-foreground truncate mt-1">{project.clientName}</p>
                )}
              </div>
            </div>

            {/* Bottom: Status + Value */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("size-2 rounded-full", statusConfig.dotClass)} />
                <span>{statusConfig.label}</span>
              </div>
              {value != null && value > 0 ? (
                <span className="text-sm font-medium">
                  ${value.toLocaleString()}
                </span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
