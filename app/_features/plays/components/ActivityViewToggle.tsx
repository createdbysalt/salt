"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";

export type ActivityView = "actions" | "captures";

interface ActivityViewToggleProps {
  active: ActivityView;
  onChange: (view: ActivityView) => void;
}

export function ActivityViewToggle({ active, onChange }: ActivityViewToggleProps) {
  return (
    <nav
      aria-label="Activity views"
      className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 p-1"
    >
      <ToggleButton isActive={active === "actions"} onClick={() => onChange("actions")}>
        Actions
      </ToggleButton>
      <ToggleButton isActive={active === "captures"} onClick={() => onChange("captures")}>
        Captures
      </ToggleButton>
    </nav>
  );
}

function ToggleButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-full px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {isActive && (
        <motion.span
          layoutId="activity-view-toggle-pill"
          className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-black/[0.04]"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
