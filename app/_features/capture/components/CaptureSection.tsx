"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Flame, Play, Eye, Inbox } from "lucide-react";
import { cn } from "@repo/utils";
import { Badge, Button } from "@repo/ui";
import type { PrioritySection } from "../utils/capture-priority";
import { SECTION_CONFIG } from "../utils/capture-priority";

interface CaptureSectionProps {
  section: PrioritySection;
  count: number;
  children: ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
}

const SECTION_ICONS: Record<PrioritySection, typeof Flame> = {
  priority: Flame,
  triggered: Play,
  watching: Eye,
  standard: Inbox,
  no_action: Inbox,
};

const SECTION_BADGE_COLORS: Record<PrioritySection, string> = {
  priority: "bg-flame/10 text-flame border-flame/20",
  triggered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  watching: "bg-sky/10 text-sky border-sky/20",
  standard: "bg-muted text-muted-foreground border-border",
  no_action: "bg-muted/50 text-muted-foreground/70 border-border/50",
};

export function CaptureSection({
  section,
  count,
  children,
  defaultCollapsed,
  className,
}: CaptureSectionProps) {
  const config = SECTION_CONFIG[section];
  const [isCollapsed, setIsCollapsed] = useState(
    defaultCollapsed ?? config.defaultCollapsed
  );

  const Icon = SECTION_ICONS[section];
  const badgeColor = SECTION_BADGE_COLORS[section];

  if (count === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "w-full justify-between px-3 py-2 h-auto",
          "hover:bg-muted/50 transition-colors"
        )}
      >
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4",
              section === "priority" && "text-flame",
              section === "triggered" && "text-emerald-600",
              section === "watching" && "text-sky",
              section === "no_action" && "text-muted-foreground/50"
            )}
          />
          <span className="font-medium text-sm">{config.label}</span>
          <Badge
            variant="outline"
            className={cn("text-xs font-medium tabular-nums", badgeColor)}
          >
            {count}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isCollapsed && "-rotate-90"
          )}
        />
      </Button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pl-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CollapsedSectionSummaryProps {
  section: PrioritySection;
  count: number;
  onExpand: () => void;
}

export function CollapsedSectionSummary({
  section,
  count,
  onExpand,
}: CollapsedSectionSummaryProps) {
  const config = SECTION_CONFIG[section];

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onExpand}
      className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
    >
      <span className="text-xs">
        {count} {config.label.toLowerCase()}
      </span>
      <ChevronDown className="h-3 w-3" />
    </Button>
  );
}
