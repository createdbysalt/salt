"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";

export type ConnectionsTab = "graph" | "insights" | "paths";

const tabs: { id: ConnectionsTab; label: string }[] = [
  { id: "graph", label: "Graph" },
  { id: "insights", label: "Insights" },
  { id: "paths", label: "Paths" },
];

export function ConnectionsTabs({
  active,
  onChange,
}: {
  active: ConnectionsTab;
  onChange: (tab: ConnectionsTab) => void;
}) {
  return (
    <div className="-mx-1 max-w-full overflow-x-auto pb-0.5">
      <nav
        aria-label="Connections sections"
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
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="connections-tab-pill"
                  className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-black/[0.04] dark:bg-foreground dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] dark:ring-foreground/20"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{tab.label}</span>
              {isActive && (
                <span className="absolute top-1.5 right-3 size-1 rounded-full bg-flame" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
