"use client";

import { Check, ChevronDown, FolderKanban } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { Progress } from "@/app/_components/ui/progress";
import { cn } from "@repo/utils";
import { useProjectContext, type ProjectInfo } from "../context/project-context";

/**
 * Enhanced project switcher with progress indicators
 * Displays in the Bridge header for multi-project clients
 */
export function ProjectSwitcher() {
  const {
    selectedProject,
    projects,
    selectProject,
    clearSelection,
    hasProjectSelected,
  } = useProjectContext();

  // Don't render if only one project
  if (projects.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <FolderKanban className="h-4 w-4" />
          <span className="hidden md:inline">
            {hasProjectSelected ? selectedProject?.name : "All Projects"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-72">
        <DropdownMenuLabel>Switch Project</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* All Projects Option */}
        <DropdownMenuItem
          onClick={clearSelection}
          className="flex items-center gap-2"
        >
          <div
            className={cn(
              "flex h-4 w-4 items-center justify-center",
              !hasProjectSelected ? "opacity-100" : "opacity-0"
            )}
          >
            <Check className="h-3 w-3" />
          </div>
          <span>All Projects</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Project List with Progress */}
        {projects.map((project) => (
          <ProjectMenuItem
            key={project.id}
            project={project}
            isSelected={selectedProject?.id === project.id}
            onSelect={() => selectProject(project)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ProjectMenuItemProps {
  project: ProjectInfo;
  isSelected: boolean;
  onSelect: () => void;
}

function ProjectMenuItem({
  project,
  isSelected,
  onSelect,
}: ProjectMenuItemProps) {
  const progress = project.progress ?? 0;

  return (
    <DropdownMenuItem
      onClick={onSelect}
      className="flex flex-col items-start gap-2 py-3"
    >
      <div className="flex w-full items-center gap-2">
        <div
          className={cn(
            "flex h-4 w-4 items-center justify-center shrink-0",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        >
          <Check className="h-3 w-3" />
        </div>
        <span className="flex-1 truncate font-medium">{project.name}</span>
        <span className="text-xs text-muted-foreground">{progress}%</span>
      </div>
      <div className="w-full pl-6">
        <Progress value={progress} className="h-1.5" />
      </div>
    </DropdownMenuItem>
  );
}
