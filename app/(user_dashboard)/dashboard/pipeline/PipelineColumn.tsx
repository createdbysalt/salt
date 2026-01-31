"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PipelineCard } from "./PipelineCard";
import type { PipelineClient, LifecycleStage } from "./page";

interface PipelineColumnProps {
  stage: LifecycleStage;
  label: string;
  clients: PipelineClient[];
  colorClass: string;
}

export function PipelineColumn({
  stage,
  label,
  clients,
  colorClass,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-3 flex flex-col min-h-0 transition-colors ${colorClass} ${
        isOver ? "ring-2 ring-primary ring-inset" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{label}</span>
          <span className="text-xs text-muted-foreground bg-background/50 rounded-full px-2 py-0.5">
            {clients.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No clients</p>
            <p className="text-xs mt-1">Drag clients here</p>
          </div>
        )}
      </div>
    </div>
  );
}
