"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";

/**
 * Plays Surface Tabs
 *
 * Structure (2026-08-06 reorg):
 * - Queue: Action approvals (Needs You / Auto-handled toggle)
 * - Playbooks: the library of moves Salt runs
 * - Activity: Actions audit trail
 *
 * Intake moved to Sources (Connectors / Activity); memory-admission decisions
 * moved to Memory → Filter.
 */

export type PlaysTab = "queue" | "playbooks" | "activity";

const tabs: { id: PlaysTab; label: string }[] = [
  { id: "queue", label: "Queue" },
  { id: "playbooks", label: "Playbooks" },
  { id: "activity", label: "Activity" },
];

export function PlaysTabs({
  active,
  onChange,
}: {
  active: PlaysTab;
  onChange: (tab: PlaysTab) => void;
}) {
  return (
    <div className="-mx-1 max-w-full overflow-x-auto pb-0.5">
      <nav
        aria-label="Plays sections"
        className="inline-flex min-w-max items-center rounded-full border border-border/60 bg-muted/70 p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:border-border dark:bg-background/60"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm transition-colors duration-200 sm:px-6",
                isActive
                  ? "font-semibold text-foreground dark:text-background"
                  : "font-medium text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="plays-tab-pill"
                  className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-black/[0.04] dark:bg-foreground dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] dark:ring-foreground/20"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{tab.label}</span>
              {isActive && (
                <span className="absolute right-3 top-1.5 size-1 rounded-full bg-flame" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
