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
import { Button } from "@/app/_components/ui/button";
import { studioRoutes } from "@/app/_features/shell/routes";
import { updateClientLifecycleStage } from "@/app/actions/clients/update-client";
import {
  Circle,
  CircleDot,
  Zap,
  CheckCircle2,
  PauseCircle,
  XCircle,
  MoreHorizontal,
  Plus,
  GripVertical,
  Folder,
} from "lucide-react";
import toast from "react-hot-toast";

// Lifecycle stages for the board
type LifecycleStage = "lead" | "discovery" | "pitch" | "active" | "complete" | "on_hold" | "lost";

const STAGES: LifecycleStage[] = ["lead", "discovery", "pitch", "active", "complete"];

const STAGE_LABELS: Record<LifecycleStage, string> = {
  lead: "Lead",
  discovery: "Discovery",
  pitch: "Pitch",
  active: "Active",
  complete: "Complete",
  on_hold: "On Hold",
  lost: "Lost",
};

// Status icons matching Linear's style
const STAGE_ICONS: Record<LifecycleStage, React.ReactNode> = {
  lead: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
  discovery: <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />,
  pitch: <Zap className="h-3.5 w-3.5 text-warning" />,
  active: <CircleDot className="h-3.5 w-3.5 text-info" />,
  complete: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  on_hold: <PauseCircle className="h-3.5 w-3.5 text-warning" />,
  lost: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

interface ClientForBoard {
  id: string;
  name: string;
  company?: { name: string } | null;
  contactEmail: string | null;
  healthScore: number;
  lifecycleStage: LifecycleStage;
  mrr: number;
  projectCount: number;
  stageEnteredAt?: string;
}

interface ClientsBoardViewProps {
  clients: ClientForBoard[];
}

// Pipeline Card Component
function PipelineCard({ client, isDragging = false }: { client: ClientForBoard; isDragging?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getDaysInStage = (stageEnteredAt?: string): number => {
    if (!stageEnteredAt) return 0;
    const now = new Date();
    const entered = new Date(stageEnteredAt);
    const diffTime = Math.abs(now.getTime() - entered.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysInStage = getDaysInStage(client.stageEnteredAt);

  return (
    <Link
      href={studioRoutes.clients.detail(client.id)}
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
              {client.name}
            </span>
            {client.contactEmail && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {client.contactEmail}
              </p>
            )}
          </div>

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

        {/* Metadata row */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {/* Project count */}
          <div className="flex items-center gap-1">
            <Folder className="h-3 w-3" />
            <span>{client.projectCount}</span>
          </div>

          {/* Days in stage */}
          <span>
            {daysInStage === 0 ? "Today" : `${daysInStage}d`}
          </span>

          {/* MRR if exists */}
          {client.mrr > 0 && (
            <span className="text-success">${client.mrr}/mo</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Pipeline Column Component
function PipelineColumn({
  stage,
  clients,
  isHovered = false,
}: {
  stage: LifecycleStage;
  clients: ClientForBoard[];
  isHovered?: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] flex flex-col min-h-0 rounded-lg transition-all duration-200 ${
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
          <span className="text-muted-foreground text-sm">{clients.length}</span>
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
      <div className="flex-1 overflow-y-auto space-y-2 px-1 min-h-0">
        <SortableContext
          items={clients.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {clients.map((client) => (
            <PipelineCard key={client.id} client={client} />
          ))}
        </SortableContext>

        {/* Empty state */}
        {clients.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <p>No clients</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ClientsBoardView - Pipeline/Kanban board for client lifecycle stages
 *
 * This is the "Pipeline" view integrated into the Clients page.
 * Clients can be dragged between stages to update their lifecycle.
 */
export function ClientsBoardView({ clients }: ClientsBoardViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStage, setOriginalStage] = useState<LifecycleStage | null>(null);
  const [hoveredStage, setHoveredStage] = useState<LifecycleStage | null>(null);

  // Group clients by stage
  const getClientsByStage = (): Record<LifecycleStage, ClientForBoard[]> => {
    const grouped: Record<LifecycleStage, ClientForBoard[]> = {
      lead: [],
      discovery: [],
      pitch: [],
      active: [],
      complete: [],
      on_hold: [],
      lost: [],
    };

    for (const client of clients) {
      const stage = client.lifecycleStage || "lead";
      if (grouped[stage]) {
        grouped[stage].push(client);
      } else {
        grouped.lead.push(client);
      }
    }

    return grouped;
  };

  const [localClientsByStage, setLocalClientsByStage] = useState(getClientsByStage);

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update local state when props change
  useEffect(() => {
    setLocalClientsByStage(getClientsByStage());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find which stage contains a client
  const findStageByClientId = (clientId: string): LifecycleStage | null => {
    for (const stage of STAGES) {
      if (localClientsByStage[stage].some((c) => c.id === clientId)) {
        return stage;
      }
    }
    return null;
  };

  // Get the active client for drag overlay
  const getActiveClient = (): ClientForBoard | null => {
    if (!activeId) return null;
    for (const stage of STAGES) {
      const client = localClientsByStage[stage].find((c) => c.id === activeId);
      if (client) return client;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const clientId = event.active.id as string;
    setActiveId(clientId);
    setOriginalStage(findStageByClientId(clientId));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeClientId = active.id as string;
    const overId = over.id as string;

    // Find source and destination stages
    const sourceStage = findStageByClientId(activeClientId);
    let destStage: LifecycleStage | null = null;

    // Check if over is a stage (column) or another client
    if (STAGES.includes(overId as LifecycleStage)) {
      destStage = overId as LifecycleStage;
    } else {
      destStage = findStageByClientId(overId);
    }

    // Update hovered stage for visual feedback
    setHoveredStage(destStage);

    if (!sourceStage || !destStage || sourceStage === destStage) return;

    // Move client to new stage (optimistic update)
    setLocalClientsByStage((prev) => {
      const client = prev[sourceStage].find((c) => c.id === activeClientId);
      if (!client) return prev;

      const newState = { ...prev };
      newState[sourceStage] = prev[sourceStage].filter((c) => c.id !== activeClientId);
      newState[destStage!] = [...prev[destStage!], { ...client, lifecycleStage: destStage! }];

      return newState;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedClientId = active.id as string;

    // Get the original stage before clearing state
    const sourceStage = originalStage;

    // Clear drag state
    setActiveId(null);
    setOriginalStage(null);
    setHoveredStage(null);

    if (!over || !sourceStage) return;

    const overId = over.id as string;

    // Determine destination stage
    let destStage: LifecycleStage;
    if (STAGES.includes(overId as LifecycleStage)) {
      destStage = overId as LifecycleStage;
    } else {
      const overStage = findStageByClientId(overId);
      if (!overStage) return;
      destStage = overStage;
    }

    // If moving to a different stage, call server action
    if (sourceStage !== destStage) {
      const result = await updateClientLifecycleStage(draggedClientId, destStage);
      if (!result.success) {
        toast.error(result.error || "Failed to move client");
        // Revert the optimistic update
        setLocalClientsByStage(getClientsByStage());
      } else {
        toast.success(`Moved to ${STAGE_LABELS[destStage]}`);
        router.refresh();
      }
    }
  };

  if (!mounted) {
    const clientsByStage = getClientsByStage();
    return (
      <div className="flex gap-3 h-[calc(100vh-280px)] overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0 w-[280px] flex flex-col rounded-lg bg-muted/40"
          >
            <div className="flex items-center gap-2 px-2 py-2 text-sm">
              {STAGE_ICONS[stage]}
              <span className="font-medium">{STAGE_LABELS[stage]}</span>
              <span className="text-muted-foreground">
                {clientsByStage[stage].length}
              </span>
            </div>
            <div className="flex-1 space-y-2 px-1">
              {clientsByStage[stage].map((client) => (
                <div
                  key={client.id}
                  className="bg-card rounded-md border border-border/50 p-3 shadow-sm"
                >
                  <div className="font-medium text-sm">{client.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activeClient = getActiveClient();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-[calc(100vh-280px)] overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            clients={localClientsByStage[stage]}
            isHovered={hoveredStage === stage}
          />
        ))}
      </div>

      <DragOverlay>
        {activeClient ? (
          <PipelineCard client={activeClient} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
