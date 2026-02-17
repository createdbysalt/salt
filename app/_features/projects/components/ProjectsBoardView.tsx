"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  useDroppable,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/app/_components/ui/button";
import { Progress } from "@/app/_components/ui/progress";
import { studioRoutes } from "@/app/_features/shell/routes";
import {
  Circle,
  CircleDot,
  CheckCircle2,
  PauseCircle,
  Clock,
  MoreHorizontal,
  Plus,
  GripVertical,
  User,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// Project status stages for the board
type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";

const STAGES: ProjectStatus[] = ["draft", "active", "on_hold", "completed"];

const STAGE_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

// Status icons matching Linear's style
const STAGE_ICONS: Record<ProjectStatus, React.ReactNode> = {
  draft: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  active: <CircleDot className="h-3.5 w-3.5 text-info" />,
  on_hold: <PauseCircle className="h-3.5 w-3.5 text-warning" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  archived: <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />,
};

interface ProjectTag {
  id: string;
  label: string;
  color: string;
}

interface ProjectForBoard {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  status: string;
  healthStatus: "on-track" | "at-risk" | "overdue" | null;
  milestoneProgress: { completed: number; total: number } | null;
  isRetainer: boolean;
  stageEnteredAt?: string | null;
  tags?: ProjectTag[];
}

interface ProjectsBoardViewProps {
  projects: ProjectForBoard[];
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
  enabledProperties?: string[];
}

// Default enabled properties for board view
const BOARD_DEFAULT_ENABLED = ["client", "progress", "health"];

// Pipeline Card Component
function PipelineCard({
  project,
  isDragging = false,
  enabledProperties = BOARD_DEFAULT_ENABLED,
}: {
  project: ProjectForBoard;
  isDragging?: boolean;
  enabledProperties?: string[];
}) {
  const isEnabled = (prop: string) => enabledProperties.includes(prop);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getDaysInStage = (stageEnteredAt?: string | null): number => {
    if (!stageEnteredAt) return 0;
    const now = new Date();
    const entered = new Date(stageEnteredAt);
    if (isNaN(entered.getTime())) return 0;
    const diffTime = Math.abs(now.getTime() - entered.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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

  const daysInStage = getDaysInStage(project.stageEnteredAt);
  const progress = project.milestoneProgress
    ? (project.milestoneProgress.completed / project.milestoneProgress.total) * 100
    : 0;

  return (
    <Link
      href={studioRoutes.projects.detail(project.id)}
      ref={setNodeRef}
      style={style}
      className={`
        group block
        bg-card rounded-md
        border border-border/50
        shadow-[0_1px_2px_rgba(0,0,0,0.05)]
        hover:border-border hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)]
        transition-all duration-150
        ${isDragging || isSortableDragging ? "opacity-80 shadow-lg scale-[1.02]" : ""}
      `}
    >
      <div className="p-3">
        {/* Header with name and drag handle */}
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              listeners?.onPointerDown?.(e);
            }}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm hover:text-primary transition-colors block truncate">
              {project.name}
            </span>
            {isEnabled("client") && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                <User className="h-3 w-3" />
                {project.clientName}
              </p>
            )}
          </div>

          {/* Health indicator */}
          {isEnabled("health") && project.healthStatus && (
            <div
              className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${getHealthColor(project.healthStatus)}`}
              title={project.healthStatus}
            />
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Progress bar */}
        {isEnabled("progress") && project.milestoneProgress && project.milestoneProgress.total > 0 && (
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

        {/* Metadata row */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {/* Days in stage */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{daysInStage === 0 ? "Today" : `${daysInStage}d`}</span>
          </div>

          {/* Retainer badge */}
          {project.isRetainer && (
            <div className="flex items-center gap-1 text-info">
              <RefreshCw className="h-3 w-3" />
              <span>Retainer</span>
            </div>
          )}
        </div>

        {/* Tags if enabled */}
        {isEnabled("tags") && project.tags && project.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {project.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 text-[10px] rounded"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                {tag.label}
              </span>
            ))}
            {project.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{project.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// Pipeline Column Component
function PipelineColumn({
  stage,
  projects,
  isHovered = false,
  enabledProperties = BOARD_DEFAULT_ENABLED,
}: {
  stage: ProjectStatus;
  projects: ProjectForBoard[];
  isHovered?: boolean;
  enabledProperties?: string[];
}) {
  const { setNodeRef } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] h-full flex flex-col rounded-lg transition-all duration-200 ${
        isHovered
          ? "bg-accent/60 ring-2 ring-accent/40 ring-inset scale-[1.01]"
          : "bg-muted/40"
      }`}
    >
      {/* Column Header - Linear style */}
      <div className="flex items-center justify-between px-2 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {STAGE_ICONS[stage]}
          <span className="font-medium text-sm">{STAGE_LABELS[stage]}</span>
          <span className="text-muted-foreground text-sm">{projects.length}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-4 min-h-0">
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <PipelineCard key={project.id} project={project} enabledProperties={enabledProperties} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <p>No projects</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ProjectsBoardView - Pipeline/Kanban board for project status
 *
 * Redesigned to match ClientsBoardView with:
 * - Dark cohesive bg-muted/40 column backgrounds
 * - Linear-style status icons
 * - Days-in-stage metric display
 * - Hover states with grip handles
 */
export function ProjectsBoardView({
  projects,
  onStatusChange,
  enabledProperties = BOARD_DEFAULT_ENABLED,
}: ProjectsBoardViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStage, setOriginalStage] = useState<ProjectStatus | null>(null);
  const [hoveredStage, setHoveredStage] = useState<ProjectStatus | null>(null);

  // Normalize status values to our stage types
  const normalizeStatus = (status: string): ProjectStatus => {
    const s = status?.toLowerCase() || "draft";
    if (s === "active" || s === "in_progress" || s === "signed") return "active";
    if (s === "completed" || s === "complete") return "completed";
    if (s === "on_hold" || s === "paused") return "on_hold";
    if (s === "archived") return "archived";
    return "draft";
  };

  // Group projects by stage
  const getProjectsByStage = (): Record<ProjectStatus, ProjectForBoard[]> => {
    const grouped: Record<ProjectStatus, ProjectForBoard[]> = {
      draft: [],
      active: [],
      on_hold: [],
      completed: [],
      archived: [],
    };

    for (const project of projects) {
      const stage = normalizeStatus(project.status);
      if (grouped[stage]) {
        grouped[stage].push({ ...project, status: stage });
      } else {
        grouped.draft.push({ ...project, status: "draft" });
      }
    }

    return grouped;
  };

  const [localProjectsByStage, setLocalProjectsByStage] = useState(getProjectsByStage);

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update local state when props change
  useEffect(() => {
    setLocalProjectsByStage(getProjectsByStage());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find which stage contains a project
  const findStageByProjectId = (projectId: string): ProjectStatus | null => {
    for (const stage of STAGES) {
      if (localProjectsByStage[stage].some((p) => p.id === projectId)) {
        return stage;
      }
    }
    return null;
  };

  // Get the active project for drag overlay
  const getActiveProject = (): ProjectForBoard | null => {
    if (!activeId) return null;
    for (const stage of STAGES) {
      const project = localProjectsByStage[stage].find((p) => p.id === activeId);
      if (project) return project;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const projectId = event.active.id as string;
    setActiveId(projectId);
    setOriginalStage(findStageByProjectId(projectId));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeProjectId = active.id as string;
    const overId = over.id as string;

    // Find source and destination stages
    const sourceStage = findStageByProjectId(activeProjectId);
    let destStage: ProjectStatus | null = null;

    // Check if over is a stage (column) or another project
    if (STAGES.includes(overId as ProjectStatus)) {
      destStage = overId as ProjectStatus;
    } else {
      destStage = findStageByProjectId(overId);
    }

    // Update hovered stage for visual feedback
    setHoveredStage(destStage);

    if (!sourceStage || !destStage || sourceStage === destStage) return;

    // Move project to new stage (optimistic update)
    setLocalProjectsByStage((prev) => {
      const project = prev[sourceStage].find((p) => p.id === activeProjectId);
      if (!project) return prev;

      const newState = { ...prev };
      newState[sourceStage] = prev[sourceStage].filter((p) => p.id !== activeProjectId);
      newState[destStage!] = [...prev[destStage!], { ...project, status: destStage! }];

      return newState;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedProjectId = active.id as string;

    // Get the original stage before clearing state
    const sourceStage = originalStage;

    // Clear drag state
    setActiveId(null);
    setOriginalStage(null);
    setHoveredStage(null);

    if (!over || !sourceStage) return;

    const overId = over.id as string;

    // Determine destination stage
    let destStage: ProjectStatus;
    if (STAGES.includes(overId as ProjectStatus)) {
      destStage = overId as ProjectStatus;
    } else {
      const overStage = findStageByProjectId(overId);
      if (!overStage) return;
      destStage = overStage;
    }

    // If moving to a different stage, call server action
    if (sourceStage !== destStage && onStatusChange) {
      try {
        await onStatusChange(draggedProjectId, destStage);
        toast.success(`Moved to ${STAGE_LABELS[destStage]}`);
        router.refresh();
      } catch {
        toast.error("Failed to move project");
        // Revert the optimistic update
        setLocalProjectsByStage(getProjectsByStage());
      }
    }
  };

  if (!mounted) {
    const projectsByStage = getProjectsByStage();
    return (
      <div className="flex gap-3 h-[calc(100vh-220px)] overflow-x-auto">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0 w-[280px] h-full flex flex-col rounded-lg bg-muted/40"
          >
            <div className="flex items-center gap-2 px-2 py-2 text-sm shrink-0">
              {STAGE_ICONS[stage]}
              <span className="font-medium">{STAGE_LABELS[stage]}</span>
              <span className="text-muted-foreground">
                {projectsByStage[stage].length}
              </span>
            </div>
            <div className="flex-1 space-y-2 px-1 pb-4 overflow-y-auto">
              {projectsByStage[stage].map((project) => (
                <div
                  key={project.id}
                  className="bg-card rounded-md border border-border/50 p-3 shadow-sm"
                >
                  <div className="font-medium text-sm">{project.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{project.clientName}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeProject = getActiveProject();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-[calc(100vh-220px)] overflow-x-auto">
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            projects={localProjectsByStage[stage]}
            isHovered={hoveredStage === stage}
            enabledProperties={enabledProperties}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProject ? (
          <PipelineCard project={activeProject} isDragging enabledProperties={enabledProperties} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
