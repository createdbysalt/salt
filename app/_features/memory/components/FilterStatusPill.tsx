"use client";

import { CheckCircle2, Eye, ShieldX } from "lucide-react";
import { cn } from "@repo/utils";

/**
 * Memory → Filter status pill — switches between the three transparency
 * views: what Salt is still gathering confidence on (Watching), what it
 * already handled (Handled), and what it kept out (Kept out).
 */

export type FilterStatus = "watching" | "handled" | "kept_out";

interface FilterStatusPillProps {
  active: FilterStatus;
  onChange: (status: FilterStatus) => void;
  counts: Record<FilterStatus, number>;
}

const OPTIONS: Array<{
  value: FilterStatus;
  label: string;
  icon: typeof Eye;
}> = [
  { value: "watching", label: "Watching", icon: Eye },
  { value: "handled", label: "Handled", icon: CheckCircle2 },
  { value: "kept_out", label: "Kept out", icon: ShieldX },
];

export function FilterStatusPill({
  active,
  onChange,
  counts,
}: FilterStatusPillProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter views"
      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-all",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
            {option.label}
            <span
              className={cn(
                "text-[11px] tabular-nums",
                isActive ? "text-muted-foreground" : "text-muted-foreground/60",
              )}
            >
              {counts[option.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
