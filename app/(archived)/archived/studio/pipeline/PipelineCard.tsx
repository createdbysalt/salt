"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Folder, MoreHorizontal } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import type { PipelineClient } from "./page";

interface PipelineCardProps {
  client: PipelineClient;
  isDragging?: boolean;
}

function getDaysInStage(stageEnteredAt: string): number {
  const now = new Date();
  const entered = new Date(stageEnteredAt);
  const diffTime = Math.abs(now.getTime() - entered.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function PipelineCard({ client, isDragging = false }: PipelineCardProps) {
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

  const daysInStage = getDaysInStage(client.stageEnteredAt);

  return (
    <Link
      href={`/studio/pipeline/${client.id}`}
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
        </div>
      </div>
    </Link>
  );
}
