"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";

export type MemoryViewMode = "active" | "archived" | "trash";

const MODE_LABELS: Record<MemoryViewMode, string> = {
  active: "Active",
  archived: "Archived",
  trash: "Trash",
};

interface MemoryViewToggleProps {
  active: MemoryViewMode;
  onChange: (mode: MemoryViewMode) => void;
  counts?: Partial<Record<MemoryViewMode, number>>;
  /** Which segments to show — directory pages use all three; trash page uses archived + trash */
  modes?: MemoryViewMode[];
  layoutId?: string;
}

export function MemoryViewToggle({
  active,
  onChange,
  counts,
  modes = ["active", "archived", "trash"],
  layoutId = "memory-view-toggle",
}: MemoryViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 p-1">
      {modes.map((mode) => (
        <ToggleButton
          key={mode}
          isActive={active === mode}
          onClick={() => onChange(mode)}
          count={counts?.[mode]}
          layoutId={layoutId}
        >
          {MODE_LABELS[mode]}
        </ToggleButton>
      ))}
    </div>
  );
}

function ToggleButton({
  isActive,
  onClick,
  count,
  layoutId,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  count?: number;
  layoutId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-black/[0.04]"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative">{children}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "relative min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-medium tabular-nums",
            isActive
              ? "bg-foreground/10 text-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
