"use client";

import { motion } from "framer-motion";
import { cn } from "@repo/utils";

export type CustomizeSection = "playbooks" | "connectors";

interface CustomizeSectionToggleProps {
  active: CustomizeSection;
  onChange: (section: CustomizeSection) => void;
}

const sections: { id: CustomizeSection; label: string }[] = [
  { id: "playbooks", label: "Playbooks" },
  { id: "connectors", label: "Connectors" },
];

export function CustomizeSectionToggle({ active, onChange }: CustomizeSectionToggleProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/50 p-1">
      {sections.map(({ id, label }) => (
        <ToggleButton
          key={id}
          isActive={active === id}
          onClick={() => onChange(id)}
        >
          {label}
        </ToggleButton>
      ))}
    </div>
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
        "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
        isActive
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {isActive && (
        <motion.span
          layoutId="customize-section-pill"
          className="absolute inset-0 rounded-full bg-card shadow-sm ring-1 ring-black/[0.04]"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}
