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
    <div className="flex items-center justify-center">
      <nav
        aria-label="Connections sections"
        className="inline-flex items-center p-1.5 rounded-full bg-card/80 dark:bg-card/60 backdrop-blur-md border border-border dark:border-border/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative px-5 sm:px-6 py-2 rounded-full text-sm transition-colors duration-200",
                isActive
                  ? "text-foreground dark:text-background font-semibold"
                  : "text-muted-foreground font-medium hover:text-foreground",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="connections-tab-pill"
                  className="absolute inset-0 rounded-full bg-card dark:bg-white shadow-sm ring-1 ring-black/[0.04]"
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
