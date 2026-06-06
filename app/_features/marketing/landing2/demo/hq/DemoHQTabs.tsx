import { motion } from "framer-motion";
import { cn } from "@repo/utils";

export type HQTab = "today" | "upcoming" | "stats";

const tabs: { id: HQTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "stats", label: "Stats" },
];

export function HQTabs({
  active,
  onChange,
  demoMode = false,
}: {
  active: HQTab;
  onChange: (t: HQTab) => void;
  demoMode?: boolean;
}) {
  return (
    <nav
      aria-label="Sections"
      className="inline-flex items-center p-1.5 rounded-full bg-muted/70 border border-border/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:bg-background/60 dark:border-border"
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative py-2 rounded-full text-sm transition-colors duration-200",
              demoMode ? "px-6" : "px-5 sm:px-6",
              isActive
                ? "text-foreground font-semibold dark:text-background"
                : "text-muted-foreground font-medium hover:text-foreground",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="hq-tab-pill"
                className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-black/[0.04] dark:bg-foreground dark:ring-foreground/20 dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{t.label}</span>
            {isActive && (
              <span className="absolute top-1.5 right-3 size-1 rounded-full bg-flame" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
