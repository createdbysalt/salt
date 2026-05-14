"use client";

import {
  Circle,
  Loader2,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";

// =============================================================================
// Types
// =============================================================================

type ProjectStatus = "not_started" | "in_progress" | "on_hold" | "completed";

interface ProjectsBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSetStatus?: (status: ProjectStatus) => void;
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function ProjectsBulkActionBar({
  selectedCount,
  onClearSelection,
  onSetStatus,
  className,
}: ProjectsBulkActionBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 z-50",
        "left-[calc(50%+var(--sidebar-width,16rem)/2)] -translate-x-1/2",
        "bg-background border shadow-lg rounded-lg",
        "flex items-center gap-2 px-4 py-2",
        "animate-in slide-in-from-bottom-4 fade-in-0 duration-200",
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r">
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onClearSelection}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Change Status */}
      {onSetStatus && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <Circle className="size-4" />
              Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => onSetStatus("not_started")}>
              <Circle className="size-4 mr-2 text-muted-foreground" />
              Not Started
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatus("in_progress")}>
              <Loader2 className="size-4 mr-2 text-blue-500" />
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatus("on_hold")}>
              <Clock className="size-4 mr-2 text-amber-500" />
              On Hold
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatus("completed")}>
              <CheckCircle2 className="size-4 mr-2 text-green-500" />
              Completed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
