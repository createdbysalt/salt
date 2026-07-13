"use client";

import { cn } from "@repo/utils";

interface PlayCardSkeletonProps {
  variant?: "needs_you" | "auto_handled" | "watching";
  className?: string;
}

export function PlayCardSkeleton({
  variant = "needs_you",
  className,
}: PlayCardSkeletonProps) {
  const isCompact = variant === "auto_handled" || variant === "watching";

  return (
    <div
      className={cn(
        "glass-card animate-pulse overflow-hidden rounded-3xl",
        isCompact ? "p-4" : "p-5 lg:p-6",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Icon placeholder */}
          <div className="size-10 shrink-0 rounded-2xl bg-muted/60" />
          <div className="space-y-1.5">
            {/* Section · Playbook */}
            <div className="h-4 w-32 rounded bg-muted/60" />
            {/* Age · Trigger */}
            <div className="h-3 w-24 rounded bg-muted/40" />
          </div>
        </div>
        {/* Confidence badge */}
        <div className="h-6 w-12 rounded-full bg-muted/40" />
      </div>

      {/* Subject line */}
      <div className="mb-2 h-5 w-3/4 rounded bg-muted/60" />

      {/* Target / preview */}
      <div className="mb-4 h-4 w-1/2 rounded bg-muted/40" />

      {!isCompact && (
        <>
          {/* Body preview area */}
          <div className="mb-4 space-y-2 rounded-2xl bg-muted/20 p-4">
            <div className="h-3 w-full rounded bg-muted/40" />
            <div className="h-3 w-5/6 rounded bg-muted/40" />
            <div className="h-3 w-4/6 rounded bg-muted/40" />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <div className="h-9 w-20 rounded-full bg-muted/40" />
        <div className="h-9 w-28 rounded-full bg-muted/60" />
      </div>
    </div>
  );
}

export function PlayCardSkeletonList({
  count = 3,
  variant = "needs_you",
}: {
  count?: number;
  variant?: "needs_you" | "auto_handled" | "watching";
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PlayCardSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
