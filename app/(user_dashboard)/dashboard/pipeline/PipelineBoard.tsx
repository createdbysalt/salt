"use client";

import { useState, useEffect } from "react";
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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineCard } from "./PipelineCard";
import { moveClientToStage, reorderClientsInStage } from "./actions";
import type { PipelineClient, LifecycleStage } from "./page";
import toast from "react-hot-toast";

interface PipelineBoardProps {
  clientsByStage: Record<LifecycleStage, PipelineClient[]>;
  stages: LifecycleStage[];
}

const STAGE_LABELS: Record<LifecycleStage, string> = {
  lead: "Lead",
  discovery: "Discovery",
  pitch: "Pitch",
  active: "Active",
  complete: "Complete",
  on_hold: "On Hold",
  lost: "Lost",
};

export function PipelineBoard({ clientsByStage, stages }: PipelineBoardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStage, setOriginalStage] = useState<LifecycleStage | null>(null);
  const [localClientsByStage, setLocalClientsByStage] = useState(clientsByStage);
  const [hoveredStage, setHoveredStage] = useState<LifecycleStage | null>(null);

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update local state when props change
  useEffect(() => {
    setLocalClientsByStage(clientsByStage);
  }, [clientsByStage]);

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
    for (const stage of stages) {
      if (localClientsByStage[stage].some((c) => c.id === clientId)) {
        return stage;
      }
    }
    return null;
  };

  // Get the active client for drag overlay
  const getActiveClient = (): PipelineClient | null => {
    if (!activeId) return null;
    for (const stage of stages) {
      const client = localClientsByStage[stage].find((c) => c.id === activeId);
      if (client) return client;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const clientId = event.active.id as string;
    setActiveId(clientId);
    // Store the original stage before any optimistic updates
    setOriginalStage(findStageByClientId(clientId));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination stages
    const sourceStage = findStageByClientId(activeId);
    let destStage: LifecycleStage | null = null;

    // Check if over is a stage (column) or another client
    if (stages.includes(overId as LifecycleStage)) {
      destStage = overId as LifecycleStage;
    } else {
      destStage = findStageByClientId(overId);
    }

    // Update hovered stage for visual feedback
    setHoveredStage(destStage);

    if (!sourceStage || !destStage || sourceStage === destStage) return;

    // Move client to new stage (optimistic update)
    setLocalClientsByStage((prev) => {
      const client = prev[sourceStage].find((c) => c.id === activeId);
      if (!client) return prev;

      const newState = { ...prev };
      newState[sourceStage] = prev[sourceStage].filter((c) => c.id !== activeId);
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
    if (stages.includes(overId as LifecycleStage)) {
      destStage = overId as LifecycleStage;
    } else {
      const overStage = findStageByClientId(overId);
      if (!overStage) return;
      destStage = overStage;
    }

    // If moving to a different stage, call server action
    if (sourceStage !== destStage) {
      const result = await moveClientToStage(draggedClientId, destStage);
      if (!result.success) {
        toast.error(result.error || "Failed to move client");
        // Revert the optimistic update
        setLocalClientsByStage(clientsByStage);
      } else {
  router.refresh();
      }
    } else {
      // Same stage - handle reordering
      const stageClients = localClientsByStage[sourceStage];
      const activeIndex = stageClients.findIndex((c) => c.id === draggedClientId);
      const overIndex = stageClients.findIndex((c) => c.id === overId);

      if (activeIndex !== overIndex && overIndex !== -1) {
        // Reorder within stage
        const newOrder = [...stageClients];
        const [movedClient] = newOrder.splice(activeIndex, 1);
        newOrder.splice(overIndex, 0, movedClient);

        setLocalClientsByStage((prev) => ({
          ...prev,
          [sourceStage]: newOrder,
        }));

        const clientIds = newOrder.map((c) => c.id);
        const result = await reorderClientsInStage(sourceStage, clientIds);
        if (!result.success) {
          toast.error(result.error || "Failed to reorder clients");
          setLocalClientsByStage(clientsByStage);
        } else {
          router.refresh();
        }
      }
    }
  };

  if (!mounted) {
    return (
      <div className="flex gap-3 h-[calc(100vh-200px)] overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div
            key={stage}
            className="flex-shrink-0 w-[280px] flex flex-col rounded-lg bg-muted/40"
          >
            <div className="flex items-center gap-2 px-2 py-2 text-sm">
              <span className="font-medium">{STAGE_LABELS[stage]}</span>
              <span className="text-muted-foreground">
                {clientsByStage[stage].length}
              </span>
            </div>
            <div className="flex-1 space-y-2 px-1">
              {clientsByStage[stage].map((client) => (
                <div
                  key={client.id}
                  className="bg-[hsl(var(--card))] rounded-md border border-border/50 p-3 shadow-sm"
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
      <div className="flex gap-3 h-[calc(100vh-200px)] overflow-x-auto pb-4">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            label={STAGE_LABELS[stage]}
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
