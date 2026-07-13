"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";

/**
 * Queue Toggle — Needs You / Auto-handled / Watching
 *
 * Trust-based filtering for the Queue tab:
 * - Needs You: Items requiring human decision (low/medium confidence)
 * - Auto-handled: Items Salt handled confidently (high confidence, FYI only)
 * - Watching: Accumulating evidence, waiting for more signals
 *
 * Default view: Needs You
 */

export type QueueFilter = "needs_you" | "auto_handled" | "learning";

interface QueueToggleProps {
  active: QueueFilter;
  onChange: (filter: QueueFilter) => void;
  counts?: {
    needs_you: number;
    auto_handled: number;
    learning?: number;
  };
}

export function QueueToggle({ active, onChange, counts }: QueueToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 p-1">
      <ToggleButton
        isActive={active === "needs_you"}
        onClick={() => onChange("needs_you")}
        count={counts?.needs_you}
      >
        Needs You
      </ToggleButton>
      <ToggleButton
        isActive={active === "auto_handled"}
        onClick={() => onChange("auto_handled")}
        count={counts?.auto_handled}
      >
        Auto-handled
      </ToggleButton>
      <ToggleButton
        isActive={active === "learning"}
        onClick={() => onChange("learning")}
        count={counts?.learning}
      >
        Watching
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  isActive,
  onClick,
  count,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  count?: number;
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
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId="queue-toggle-pill"
          className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-black/[0.04]"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative">{children}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "relative min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-xs font-medium",
            isActive
              ? "bg-foreground/10 text-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
