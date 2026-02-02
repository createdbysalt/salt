"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Progress } from "@/app/_components/ui/progress";
import { studioRoutes } from "@/app/_features/shell/routes";
import { cn } from "@repo/utils";
import toast from "react-hot-toast";

// Project status stages
type ProjectStatus = "not_started" | "in_progress" | "review" | "complete" | "on_hold";

const STAGES: ProjectStatus[] = ["not_started", "in_progress", "review", "complete"];

const STAGE_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-muted" },
  in_progress: { label: "In Progress", color: "bg-info/10" },
  review: { label: "Review", color: "bg-warning/10" },
  complete: { label: "Complete", color: "bg-success/10" },
  on_hold: { label: "On Hold", color: "bg-muted" },
};

interface ProjectForBoard {
  id: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
  healthStatus: "on-track" | "at-risk" | "overdue" | null;
  milestoneProgress: { completed: number; total: number } | null;
  isRetainer: boolean;
}

interface ProjectsBoardViewProps {
  projects: ProjectForBoard[];
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
}

// Sortable project card
function SortableProjectCard({ project }: { project: ProjectForBoard }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <ProjectCard project={project} />
    </div>
  );
}

// Project card component
function ProjectCard({ project }: { project: ProjectForBoard }) {
  const router = useRouter();

  const getHealthColor = (status: string | null) => {
    switch (status) {
      case "on-track":
        return "bg-success";
      case "at-risk":
        return "bg-warning";
      case "overdue":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const progress = project.milestoneProgress
    ? (project.milestoneProgress.completed / project.milestoneProgress.total) * 100
    : 0;

  return (
    <Card
      className="mb-2 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(studioRoutes.projects.detail(project.id))}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {project.clientName}
            </p>
          </div>
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0 mt-1.5",
              getHealthColor(project.healthStatus)
            )}
            title={project.healthStatus || "Unknown"}
          />
        </div>

        {/* Milestone progress */}
        {project.milestoneProgress && project.milestoneProgress.total > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>
                {project.milestoneProgress.completed}/{project.milestoneProgress.total}
              </span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}

        {/* Type badge */}
        {project.isRetainer && (
          <Badge variant="secondary" className="mt-2 text-xs">
            Retainer
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// Board column component
function BoardColumn({
  stage,
  projects,
  isOver,
}: {
  stage: ProjectStatus;
  projects: ProjectForBoard[];
  isOver: boolean;
}) {
  const config = STAGE_CONFIG[stage];

  return (
    <div
      className={cn(
        "flex-1 min-w-[280px] max-w-[320px] rounded-lg p-3 transition-colors",
        config.color,
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">{config.label}</h3>
        <Badge variant="secondary" className="text-xs">
          {projects.length}
        </Badge>
      </div>

      {/* Cards */}
      <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[200px]">
          {projects.map((project) => (
            <SortableProjectCard key={project.id} project={project} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

/**
 * ProjectsBoardView - Kanban board for project status
 *
 * Columns: Not Started → In Progress → Review → Complete
 */
export function ProjectsBoardView({ projects, onStatusChange }: ProjectsBoardViewProps) {
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Group projects by status
  const projectsByStage = useMemo(() => {
    const grouped: Record<ProjectStatus, ProjectForBoard[]> = {
      not_started: [],
      in_progress: [],
      review: [],
      complete: [],
      on_hold: [],
    };

    for (const project of projects) {
      // Map existing status values to our stages
      let stage: ProjectStatus = "not_started";
      const status = project.status?.toLowerCase() || "not_started";

      if (status === "active" || status === "in_progress") {
        stage = "in_progress";
      } else if (status === "review" || status === "pending") {
        stage = "review";
      } else if (status === "complete" || status === "completed") {
        stage = "complete";
      } else if (status === "on_hold" || status === "paused") {
        stage = "on_hold";
      } else {
        stage = "not_started";
      }

      grouped[stage].push({ ...project, status: stage });
    }

    return grouped;
  }, [projects]);

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || !onStatusChange) return;

    const projectId = active.id as string;
    const targetStage = findStageFromId(over.id as string);

    if (!targetStage) return;

    // Find current stage
    const currentStage = findProjectStage(projectId);
    if (currentStage === targetStage) return;

    try {
      await onStatusChange(projectId, targetStage);
      toast.success(`Moved to ${STAGE_CONFIG[targetStage].label}`);
    } catch {
      toast.error("Failed to update project status");
    }
  };

  const findProjectStage = (projectId: string): ProjectStatus | null => {
    for (const stage of STAGES) {
      if (projectsByStage[stage].some((p) => p.id === projectId)) {
        return stage;
      }
    }
    return null;
  };

  const findStageFromId = (id: string): ProjectStatus | null => {
    if (STAGES.includes(id as ProjectStatus)) {
      return id as ProjectStatus;
    }
    return findProjectStage(id);
  };

  const getActiveProject = (): ProjectForBoard | null => {
    if (!activeId) return null;
    for (const stage of STAGES) {
      const project = projectsByStage[stage].find((p) => p.id === activeId);
      if (project) return project;
    }
    return null;
  };

  if (!mounted) {
    // SSR placeholder
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className={cn(
              "flex-1 min-w-[280px] max-w-[320px] rounded-lg p-3",
              STAGE_CONFIG[stage].color
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">{STAGE_CONFIG[stage].label}</h3>
              <Badge variant="secondary" className="text-xs">
                {projectsByStage[stage].length}
              </Badge>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {projectsByStage[stage].map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <BoardColumn
            key={stage}
            stage={stage}
            projects={projectsByStage[stage]}
            isOver={overId === stage || projectsByStage[stage].some((p) => p.id === overId)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId && getActiveProject() && (
          <div className="rotate-3 opacity-90">
            <ProjectCard project={getActiveProject()!} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
