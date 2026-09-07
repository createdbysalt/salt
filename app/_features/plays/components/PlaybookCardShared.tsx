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
  runnable = true,
  grouped = false,
}: {
  slug: string;
  enabled?: boolean;
  isLocked: boolean;
  /** Whether the playbook has a wired execution path (script or steps). */
  runnable?: boolean;
  grouped?: boolean;
}) {
  if (isLocked) {
    // "Always on" is earned, not asserted: system playbooks without a wired
    // execution path show an honest "Not active yet" state instead.
    if (!runnable) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
            grouped
              ? null
              : "border border-border/50 bg-background/80 backdrop-blur-sm"
          )}
          title="System playbook. Execution is not wired yet."
        >
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
          Not active yet
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
          grouped
            ? null
            : "border border-border/50 bg-background/80 backdrop-blur-sm"
        )}
        title="System playbook. Always on."
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
      grouped={grouped}
    />
  );
}

export function PlaybookStepDots({
  stepCount,
  dotClass,
  countClassName,
  className,
  activeIndex = 0,
  label,
}: {
  stepCount: number;
  dotClass?: string;
  countClassName?: string;
  className?: string;
  /** Which step is current (0-based). Defaults to the first. */
  activeIndex?: number;
  /** Overrides the "N steps" count text — e.g. "Step 2 of 3". */
  label?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.max(1, stepCount) }).map((_, idx) => (
          <span
            key={idx}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-all",
              idx === activeIndex
                ? cn("w-4", dotClass ?? "bg-foreground")
                : idx < activeIndex
                  ? (dotClass ?? "bg-foreground")
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
        {label ?? `${stepCount} ${stepCount === 1 ? "step" : "steps"}`}
      </span>
    </div>
  );
}
