"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/app/_components/ui/button";
import { Progress } from "@/app/_components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import {
  GripVertical,
  Circle,
  CircleDot,
  CheckCircle2,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import { cn } from "@repo/utils";
import { format, isPast, isToday } from "date-fns";

export interface MilestoneData {
  id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "complete";
  due_at: string | null;
  completed_at: string | null;
  client_visible: boolean;
  order_index: number;
  taskProgress?: { completed: number; total: number };
}

interface MilestoneItemProps {
  milestone: MilestoneData;
  onStatusChange: (id: string, status: "not_started" | "in_progress" | "complete") => void;
  onVisibilityToggle: (id: string, visible: boolean) => void;
  onEdit: (milestone: MilestoneData) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

const statusIcons = {
  not_started: Circle,
  in_progress: CircleDot,
  complete: CheckCircle2,
};

const statusColors = {
  not_started: "text-muted-foreground",
  in_progress: "text-info",
  complete: "text-success",
};

const statusLabels = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
};

export function MilestoneItem({
  milestone,
  onStatusChange,
  onVisibilityToggle,
  onEdit,
  onDelete,
  isDragging = false,
}: MilestoneItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const StatusIcon = statusIcons[milestone.status];
  const isOverdue = milestone.due_at && isPast(new Date(milestone.due_at)) && milestone.status !== "complete";
  const isDueToday = milestone.due_at && isToday(new Date(milestone.due_at));

  // Calculate progress: if tasks exist, use task progress; otherwise use status
  const progress = milestone.taskProgress && milestone.taskProgress.total > 0
    ? Math.round((milestone.taskProgress.completed / milestone.taskProgress.total) * 100)
    : milestone.status === "complete"
      ? 100
      : milestone.status === "in_progress"
        ? 50
        : 0;

  const cycleStatus = () => {
    const nextStatus: Record<string, "not_started" | "in_progress" | "complete"> = {
      not_started: "in_progress",
      in_progress: "complete",
      complete: "not_started",
    };
    onStatusChange(milestone.id, nextStatus[milestone.status]);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg",
        isHovered && "bg-accent/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab touch-none text-muted-foreground hover:text-foreground transition-opacity",
          !isHovered && "opacity-0 group-hover:opacity-100"
        )}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Status Icon (clickable to cycle) */}
      <button
        onClick={cycleStatus}
        className={cn(
          "flex-shrink-0 transition-colors hover:scale-110",
          statusColors[milestone.status]
        )}
        title={`Click to change status (${statusLabels[milestone.status]})`}
      >
        <StatusIcon className="h-5 w-5" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium truncate",
              milestone.status === "complete" && "line-through text-muted-foreground"
            )}
          >
            {milestone.title}
          </span>
        </div>

        {/* Task Progress */}
        {milestone.taskProgress && milestone.taskProgress.total > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={progress || 0} className="h-1.5 w-24" />
            <span className="text-xs text-muted-foreground">
              {milestone.taskProgress.completed}/{milestone.taskProgress.total} tasks
            </span>
          </div>
        )}
      </div>

      {/* Due Date */}
      {milestone.due_at && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-sm",
            isOverdue && "text-destructive",
            isDueToday && !isOverdue && "text-warning",
            !isOverdue && !isDueToday && "text-muted-foreground"
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(milestone.due_at), "MMM d")}</span>
        </div>
      )}

      {/* Progress Badge */}
      <span
        className={cn(
          "text-xs tabular-nums",
          progress === 100 && "text-success",
          progress > 0 && progress < 100 && "text-info",
          progress === 0 && "text-muted-foreground"
        )}
      >
        {progress}%
      </span>

      {/* Visibility Toggle */}
      <button
        onClick={() => onVisibilityToggle(milestone.id, !milestone.client_visible)}
        className={cn(
          "text-muted-foreground hover:text-foreground transition-colors",
          !isHovered && "opacity-0 group-hover:opacity-100"
        )}
        title={milestone.client_visible ? "Visible to client" : "Hidden from client"}
      >
        {milestone.client_visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4 opacity-50" />
        )}
      </button>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              !isHovered && "opacity-0 group-hover:opacity-100"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => onEdit(milestone)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(milestone.id, "not_started")}>
            <Circle className="h-4 w-4 mr-2" />
            Not Started
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(milestone.id, "in_progress")}>
            <CircleDot className="h-4 w-4 mr-2" />
            In Progress
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange(milestone.id, "complete")}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Complete
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(milestone.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
