"use client";

import { Flame, AlertCircle, Circle, ArrowDown, VolumeX } from "lucide-react";
import { cn } from "@repo/utils";
import { Badge } from "@repo/ui";
import type { PriorityTier } from "../utils/capture-priority";

interface PriorityBadgeProps {
  tier: PriorityTier;
  score?: number;
  showScore?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const TIER_CONFIG: Record<
  PriorityTier,
  {
    label: string;
    icon: typeof Flame;
    colors: string;
    iconColors: string;
  }
> = {
  urgent: {
    label: "Urgent",
    icon: Flame,
    colors: "bg-flame/10 text-flame border-flame/20",
    iconColors: "text-flame",
  },
  important: {
    label: "Important",
    icon: AlertCircle,
    colors: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    iconColors: "text-amber-500",
  },
  normal: {
    label: "Normal",
    icon: Circle,
    colors: "bg-muted text-muted-foreground border-border",
    iconColors: "text-muted-foreground",
  },
  low: {
    label: "Low",
    icon: ArrowDown,
    colors: "bg-muted/50 text-muted-foreground/70 border-border/50",
    iconColors: "text-muted-foreground/50",
  },
  noise: {
    label: "Noise",
    icon: VolumeX,
    colors: "bg-muted/30 text-muted-foreground/50 border-border/30",
    iconColors: "text-muted-foreground/30",
  },
};

export function PriorityBadge({
  tier,
  score,
  showScore = false,
  size = "sm",
  className,
}: PriorityBadgeProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        config.colors,
        size === "sm" && "text-xs px-1.5 py-0.5",
        size === "md" && "text-sm px-2 py-1",
        className
      )}
    >
      <Icon
        className={cn(
          config.iconColors,
          size === "sm" && "h-3 w-3",
          size === "md" && "h-4 w-4"
        )}
      />
      {showScore && score !== undefined ? (
        <span className="tabular-nums">{score}</span>
      ) : (
        <span>{config.label}</span>
      )}
    </Badge>
  );
}

interface PriorityIndicatorProps {
  tier: PriorityTier;
  className?: string;
}

export function PriorityIndicator({ tier, className }: PriorityIndicatorProps) {
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  if (tier === "normal" || tier === "low" || tier === "noise") {
    return null;
  }

  return (
    <Icon
      className={cn(
        "h-4 w-4",
        config.iconColors,
        tier === "urgent" && "animate-pulse",
        className
      )}
    />
  );
}
