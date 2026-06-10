"use client";

import Link from "next/link";
import { Checkbox } from "@repo/ui";
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
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
}

export function ProjectsGridView({
  projects,
  rowSelection = {},
  onRowSelectionChange,
}: ProjectsGridViewProps) {
  const handleSelect = (id: string) => {
    if (onRowSelectionChange) {
      onRowSelectionChange({
        ...rowSelection,
        [id]: !rowSelection[id],
      });
    }
  };

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
        const isSelected = rowSelection[project.id] || false;

        return (
          <div
            key={project.id}
            className={cn(
              "group relative rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors",
              isSelected && "ring-2 ring-primary"
            )}
          >
            <Link href="/work" className="block">
              {/* Top: Checkbox + Name + Client */}
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleSelect(project.id)}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="size-4 mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{project.name}</p>
                  {project.clientName && (
                    <p className="text-xs text-muted-foreground truncate mt-1">{project.clientName}</p>
                  )}
                </div>
              </div>

              {/* Bottom: Status + Value */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
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
          </div>
        );
      })}
    </div>
  );
}
