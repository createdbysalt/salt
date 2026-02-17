"use client";

import { Target, Briefcase, Zap } from "lucide-react";
import { cn } from "@repo/utils";
import type { InboxMode } from "../types";

const MODE_CONFIG: Record<
  InboxMode,
  { icon: typeof Target; label: string; className: string }
> = {
  strategy: {
    icon: Target,
    label: "Strategy",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  studio: {
    icon: Briefcase,
    label: "Studio",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  serve: {
    icon: Zap,
    label: "Serve",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
};

interface InboxModeBadgeProps {
  mode: InboxMode;
  showIcon?: boolean;
  size?: "sm" | "default";
  onClick?: () => void;
}

/**
 * InboxModeBadge - Mode indicator pill
 *
 * Shows which mode (Strategy, Studio, Serve) an inbox item belongs to.
 * Clickable variant jumps to that mode's context.
 */
export function InboxModeBadge({
  mode,
  showIcon = false,
  size = "default",
  onClick,
}: InboxModeBadgeProps) {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  const Component = onClick ? "button" : "span";

  return (
    <Component
      onClick={onClick}
      className={cn(
        // Base styles
        "inline-flex items-center gap-1 rounded-full border font-medium",
        "transition-[background-color,border-color,opacity] duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        // Size variants
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        // Mode-specific colors
        config.className,
        // Interactive states
        onClick && "cursor-pointer hover:opacity-80 active:scale-[0.97]"
      )}
    >
      {showIcon && <Icon className="size-3" />}
      <span>{config.label}</span>
    </Component>
  );
}
