"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Folder, Activity } from "lucide-react";
import type { PipelineClient } from "./page";

interface PipelineCardProps {
  client: PipelineClient;
  isDragging?: boolean;
}

function getHealthColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
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
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-lg border shadow-sm transition-shadow hover:shadow-md ${
        isDragging || isSortableDragging
          ? "opacity-90 shadow-lg ring-2 ring-primary"
          : ""
      }`}
    >
      <div className="p-3">
        {/* Header with drag handle */}
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing touch-none"
            type="button"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="font-medium text-sm hover:text-primary transition-colors block truncate"
            >
              {client.name}
            </Link>
            {client.contactEmail && (
              <p className="text-xs text-muted-foreground truncate">
                {client.contactEmail}
              </p>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-3 flex items-center gap-3 text-xs">
          {/* Project count */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Folder className="h-3 w-3" />
            <span>
              {client.projectCount} {client.projectCount === 1 ? "project" : "projects"}
            </span>
          </div>

          {/* Health score */}
          <div className={`flex items-center gap-1 ${getHealthColor(client.healthScore)}`}>
            <Activity className="h-3 w-3" />
            <span>{client.healthScore}%</span>
          </div>
        </div>

        {/* Days in stage indicator */}
        <div className="mt-2 text-xs text-muted-foreground">
          {daysInStage === 0 ? (
            <span>Entered today</span>
          ) : daysInStage === 1 ? (
            <span>1 day in stage</span>
          ) : (
            <span>{daysInStage} days in stage</span>
          )}
        </div>
      </div>
    </div>
  );
}
