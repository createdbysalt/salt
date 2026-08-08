"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";

/**
 * Memory → Activity status pill — switches between the two transparency
 * views: what Salt is still gathering confidence on (Watching) and what it
 * already handled (Handled).
 *
 * Visuals mirror the Plays QueueToggle (sliding pill, count badges).
 *
 * P11: Kept out moved to Sources → Activity (it's intake policy, not Memory).
 */

export type FilterStatus = "watching" | "handled";

interface FilterStatusPillProps {
  active: FilterStatus;
  onChange: (status: FilterStatus) => void;
  counts: Record<FilterStatus, number>;
}

const OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: "watching", label: "Watching" },
  { value: "handled", label: "Handled" },
];

export function FilterStatusPill({
  active,
  onChange,
  counts,
}: FilterStatusPillProps) {
  return (
    <div
      role="tablist"
      aria-label="Activity views"
      className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 p-1"
    >
      {OPTIONS.map((option) => {
        const isActive = active === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="filter-status-pill"
                className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-black/[0.04]"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative">{option.label}</span>
            <span
              className={cn(
                "relative min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-medium tabular-nums",
                isActive
                  ? "bg-foreground/10 text-foreground"
                  : "bg-muted text-muted-foreground",
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
