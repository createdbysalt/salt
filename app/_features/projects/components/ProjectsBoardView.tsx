"use client";

import { useState, useEffect } from "react";
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
import { Avatar, AvatarFallback, Button } from "@repo/ui";
import { cn } from "@repo/utils";
import { Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";

// Project status stages for the board
type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";

const STAGES: ProjectStatus[] = ["draft", "active", "on_hold", "completed"];

const STAGE_CONFIG: Record<ProjectStatus, { label: string; dotClass: string }> = {
  draft: { label: "Draft", dotClass: "bg-muted-foreground" },
  active: { label: "Active", dotClass: "bg-muted-foreground" },
  on_hold: { label: "On Hold", dotClass: "bg-muted-foreground" },
  completed: { label: "Completed", dotClass: "bg-muted-foreground" },
  archived: { label: "Archived", dotClass: "bg-muted-foreground" },
};

interface ProjectForBoard {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  status: string;
  totalValue?: number | null;
  monthlyAmount?: number | null;
  isRetainer?: boolean;
}

interface ProjectsBoardViewProps {
  projects: ProjectForBoard[];
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
  enabledProperties?: string[];
}

// Minimal Pipeline Card (matches clients grid view style)
function PipelineCard({
  project,
  isDragging = false,
}: {
  project: ProjectForBoard;
  isDragging?: boolean;
}) {
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

  const value = project.isRetainer ? project.monthlyAmount : project.totalValue;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group block rounded-md border bg-card p-3 transition-all",
        isDragging || isSortableDragging
          ? "opacity-90 shadow-lg scale-[1.02] cursor-grabbing"
          : "hover:bg-muted/50 cursor-grab"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 touch-none opacity-0 group-hover:opacity-100 transition-opacity"
          type="button"
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </button>

        {/* Avatar */}
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="salt-avatar-company text-[11px] font-medium">
            {project.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <Link
          href={`/studio/projects/${project.id}`}
          className="min-w-0 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-medium text-[13px] leading-tight truncate hover:text-primary transition-colors">
            {project.name}
          </p>
          {project.clientName && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {project.clientName}
            </p>
          )}
        </Link>

        {/* Value */}
        {value != null && value > 0 ? (
          <span className="text-[11px] font-medium shrink-0">
            ${value.toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Static card for drag overlay
function DragOverlayCard({ project }: { project: ProjectForBoard }) {
  const value = project.isRetainer ? project.monthlyAmount : project.totalValue;

  return (
    <div className="block rounded-md border bg-card p-3 shadow-lg scale-[1.02] cursor-grabbing w-[250px]">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">
          <GripVertical className="size-4 text-muted-foreground" />
        </div>
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="salt-avatar-company text-[11px] font-medium">
            {project.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[13px] leading-tight truncate">
            {project.name}
          </p>
          {project.clientName && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {project.clientName}
            </p>
          )}
        </div>
        {value != null && value > 0 ? (
          <span className="text-[11px] font-medium shrink-0">
            ${value.toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Pipeline Column
function PipelineColumn({
  stage,
  projects,
  isHovered = false,
}: {
  stage: ProjectStatus;
  projects: ProjectForBoard[];
  isHovered?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: stage });
  const config = STAGE_CONFIG[stage];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[280px] h-full flex flex-col rounded-lg transition-all duration-200",
        isHovered ? "bg-accent/50 ring-2 ring-accent/30 ring-inset" : "bg-muted/30"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", config.dotClass)} />
          <span className="font-medium text-sm">{config.label}</span>
          <span className="text-muted-foreground text-sm">{projects.length}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 px-2 pb-3 min-h-0">
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <PipelineCard key={project.id} project={project} />
          ))}
        </SortableContext>

        {projects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No projects
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectsBoardView({
  projects,
  onStatusChange,
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

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const findStageByProjectId = (projectId: string): ProjectStatus | null => {
    for (const stage of STAGES) {
      if (localProjectsByStage[stage].some((p) => p.id === projectId)) {
        return stage;
      }
    }
    return null;
  };

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

    const sourceStage = findStageByProjectId(activeProjectId);
    let destStage: ProjectStatus | null = null;

    if (STAGES.includes(overId as ProjectStatus)) {
      destStage = overId as ProjectStatus;
    } else {
      destStage = findStageByProjectId(overId);
    }

    setHoveredStage(destStage);

    if (!sourceStage || !destStage || sourceStage === destStage) return;

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
    const sourceStage = originalStage;

    setActiveId(null);
    setOriginalStage(null);
    setHoveredStage(null);

    if (!over || !sourceStage) return;

    const overId = over.id as string;

    let destStage: ProjectStatus;
    if (STAGES.includes(overId as ProjectStatus)) {
      destStage = overId as ProjectStatus;
    } else {
      const overStage = findStageByProjectId(overId);
      if (!overStage) return;
      destStage = overStage;
    }

    if (sourceStage !== destStage) {
      if (onStatusChange) {
        try {
          await onStatusChange(draggedProjectId, destStage);
          toast.success(`Moved to ${STAGE_CONFIG[destStage].label}`);
          router.refresh();
        } catch {
          toast.error("Failed to move project");
          setLocalProjectsByStage(getProjectsByStage());
        }
      } else {
        toast.success(`Moved to ${STAGE_CONFIG[destStage].label}`);
        router.refresh();
      }
    }
  };

  // SSR fallback
  if (!mounted) {
    const projectsByStage = getProjectsByStage();
    return (
      <div className="flex gap-3 h-full overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0 w-[280px] h-full flex flex-col rounded-lg bg-muted/30"
          >
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm shrink-0">
              <span className={cn("size-2 rounded-full", STAGE_CONFIG[stage].dotClass)} />
              <span className="font-medium">{STAGE_CONFIG[stage].label}</span>
              <span className="text-muted-foreground">{projectsByStage[stage].length}</span>
            </div>
            <div className="flex-1 space-y-2 px-2 pb-3 overflow-y-auto">
              {projectsByStage[stage].map((project) => (
                <div key={project.id} className="bg-card rounded-md border p-3">
                  <div className="font-medium text-sm truncate">{project.name}</div>
                  {project.clientName && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{project.clientName}</div>
                  )}
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
      <div className="flex gap-3 h-full overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            projects={localProjectsByStage[stage]}
            isHovered={hoveredStage === stage}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProject ? <DragOverlayCard project={activeProject} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
