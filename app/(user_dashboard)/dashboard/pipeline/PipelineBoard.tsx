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
};

const STAGE_COLORS: Record<LifecycleStage, string> = {
  lead: "bg-slate-100 dark:bg-slate-800",
  discovery: "bg-blue-50 dark:bg-blue-950",
  pitch: "bg-amber-50 dark:bg-amber-950",
  active: "bg-green-50 dark:bg-green-950",
  complete: "bg-purple-50 dark:bg-purple-950",
};

export function PipelineBoard({ clientsByStage, stages }: PipelineBoardProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStage, setOriginalStage] = useState<LifecycleStage | null>(null);
  const [localClientsByStage, setLocalClientsByStage] = useState(clientsByStage);

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
        toast.success(`Moved to ${STAGE_LABELS[destStage]}`);
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
      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-200px)]">
        {stages.map((stage) => (
          <div
            key={stage}
            className={`rounded-lg p-4 ${STAGE_COLORS[stage]}`}
          >
            <div className="font-semibold text-sm mb-3">
              {STAGE_LABELS[stage]}
            </div>
            <div className="space-y-2">
              {clientsByStage[stage].map((client) => (
                <div
                  key={client.id}
                  className="bg-card rounded-lg border p-3 shadow-sm"
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
      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-200px)] overflow-x-auto">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            label={STAGE_LABELS[stage]}
            clients={localClientsByStage[stage]}
            colorClass={STAGE_COLORS[stage]}
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
