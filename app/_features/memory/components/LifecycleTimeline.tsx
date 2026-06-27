"use client";

import { ArrowRight, Sparkles, User, Zap, Settings } from "lucide-react";
import { cn } from "@repo/utils";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";

interface LifecycleTimelineProps {
  events: LifecycleEventDisplay[];
  className?: string;
}

const SOURCE_ICONS = {
  manual: User,
  rule: Zap,
  ai_inference: Sparkles,
  system: Settings,
} as const;

const SOURCE_LABELS = {
  manual: "You",
  rule: "Keeper rule",
  ai_inference: "Salt",
  system: "System",
} as const;

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

export function LifecycleTimeline({ events, className }: LifecycleTimelineProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Lifecycle
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-3 bottom-3 w-px bg-border/60" />

        <div className="flex flex-col gap-3">
          {events.map((event) => {
            const Icon = SOURCE_ICONS[event.source] ?? Settings;
            const sourceLabel = SOURCE_LABELS[event.source] ?? event.source;
            const isSalt = event.source === "ai_inference" || event.source === "rule";

            return (
              <div key={event.id} className="relative flex gap-3 pl-0">
                {/* Timeline dot */}
                <div
                  className={cn(
                    "relative z-10 size-6 rounded-full grid place-items-center shrink-0",
                    isSalt ? "bg-flame/10 text-flame" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-3" strokeWidth={2.25} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {event.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {formatDate(event.createdAt)}
                    </span>
                  </div>

                  {/* Transition display */}
                  {(event.eventType === "status_change" ||
                    event.eventType === "relationship_change" ||
                    event.eventType === "health_change") && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                        {event.fromValue ?? "none"}
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-foreground/10 text-foreground font-medium">
                        {event.toValue}
                      </span>
                    </div>
                  )}

                  {/* Because text */}
                  {event.because && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {event.because}
                    </p>
                  )}

                  {/* Source badge */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isSalt ? "text-flame" : "text-muted-foreground"
                      )}
                    >
                      {sourceLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
