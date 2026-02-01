"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PipelineCard } from "./PipelineCard";
import { Circle, CircleDot, Zap, CheckCircle2, PauseCircle, XCircle, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import type { PipelineClient, LifecycleStage } from "./page";

interface PipelineColumnProps {
  stage: LifecycleStage;
  label: string;
  clients: PipelineClient[];
  isHovered?: boolean;
}

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

export function PipelineColumn({
  stage,
  label,
  clients,
  isHovered = false,
}: PipelineColumnProps) {
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
          <span className="font-medium text-sm">{label}</span>
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
