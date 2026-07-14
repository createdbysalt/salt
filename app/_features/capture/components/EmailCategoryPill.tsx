"use client";

import {
  AlertCircle,
  DollarSign,
  Sparkles,
  Bell,
  Newspaper,
  VolumeX,
} from "lucide-react";
import { cn } from "@repo/utils";
import { Badge } from "@repo/ui";
import type { EmailCategoryValue } from "../services/email-classification";

interface EmailCategoryPillProps {
  category: EmailCategoryValue;
  confidence?: number;
  showConfidence?: boolean;
  className?: string;
}

const CATEGORY_CONFIG: Record<
  EmailCategoryValue,
  {
    label: string;
    icon: typeof AlertCircle;
    colors: string;
    iconColors: string;
  }
> = {
  action_required: {
    label: "Action required",
    icon: AlertCircle,
    colors: "bg-flame/10 text-flame border-flame/20",
    iconColors: "text-flame",
  },
  money_moves: {
    label: "Money",
    icon: DollarSign,
    colors: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    iconColors: "text-emerald-500",
  },
  opportunities: {
    label: "Opportunity",
    icon: Sparkles,
    colors: "bg-violet/10 text-violet border-violet/20",
    iconColors: "text-violet",
  },
  updates: {
    label: "Update",
    icon: Bell,
    colors: "bg-sky/10 text-sky border-sky/20",
    iconColors: "text-sky",
  },
  subscribed: {
    label: "Subscribed",
    icon: Newspaper,
    colors: "bg-muted text-muted-foreground border-border",
    iconColors: "text-muted-foreground",
  },
  noise: {
    label: "Noise",
    icon: VolumeX,
    colors: "bg-muted/50 text-muted-foreground/60 border-border/50",
    iconColors: "text-muted-foreground/50",
  },
};

export function EmailCategoryPill({
  category,
  confidence,
  showConfidence = false,
  className,
}: EmailCategoryPillProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-xs font-medium px-1.5 py-0.5",
        config.colors,
        className
      )}
    >
      <Icon className={cn("h-3 w-3", config.iconColors)} />
      <span>{config.label}</span>
      {showConfidence && confidence !== undefined && (
        <span className="text-[10px] opacity-70 tabular-nums">
          {confidence}%
        </span>
      )}
    </Badge>
  );
}

interface EmailCategoryIndicatorProps {
  category: EmailCategoryValue;
  className?: string;
}

export function EmailCategoryIndicator({
  category,
  className,
}: EmailCategoryIndicatorProps) {
  const config = CATEGORY_CONFIG[category];

  if (category === "subscribed" || category === "noise" || category === "updates") {
    return null;
  }

  const Icon = config.icon;

  return <Icon className={cn("h-4 w-4", config.iconColors, className)} />;
}
