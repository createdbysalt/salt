"use client";

import { cn } from "@repo/utils";
import { PlaybookEnabledToggle } from "./PlaybookEnabledToggle";

const LAYER_OUTCOMES = {
  learn: "Auto-updates memory",
  act: "Drafts for your approval",
} as const;

export function getPlaybookLayerOutcome(
  layer: "learn" | "act",
  voice?: string | null
) {
  const outcome = LAYER_OUTCOMES[layer];
  return layer === "act" && voice ? `${outcome} · ${voice} voice` : outcome;
}

export function PlaybookStatusControl({
  slug,
  enabled = true,
  isLocked,
}: {
  slug: string;
  enabled?: boolean;
  isLocked: boolean;
}) {
  if (isLocked) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm"
        title="System playbook — always on"
      >
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Always on
      </span>
    );
  }

  return (
    <PlaybookEnabledToggle
      playbookSlug={slug}
      initialEnabled={enabled}
      variant="pill"
    />
  );
}

export function PlaybookStepDots({
  stepCount,
  dotClass,
  countClassName,
  className,
}: {
  stepCount: number;
  dotClass?: string;
  countClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.max(1, stepCount) }).map((_, idx) => (
          <span
            key={idx}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-all",
              idx === 0
                ? cn("w-4", dotClass ?? "bg-foreground")
                : "bg-foreground/15 group-hover:bg-foreground/30"
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          "text-[10px] font-semibold text-muted-foreground tabular-nums",
          countClassName
        )}
      >
        {stepCount} {stepCount === 1 ? "step" : "steps"}
      </span>
    </div>
  );
}
