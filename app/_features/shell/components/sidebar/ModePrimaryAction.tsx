"use client";

import { Plus, FileText, Eye, Search, Brain } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import type { DashboardMode } from "../../types/mode";

interface ModePrimaryActionProps {
  mode: DashboardMode;
  collapsed: boolean;
}

interface ActionConfig {
  label: string;
  icon: typeof Plus;
  href: string;
  shortLabel?: string;
}

const MODE_PRIMARY_ACTIONS: Record<DashboardMode, ActionConfig> = {
  strategy: {
    label: "New Report",
    icon: FileText,
    href: "/dashboard/intelligence/new",
    shortLabel: "Report",
  },
  studio: {
    label: "New Project",
    icon: Plus,
    href: "/dashboard/projects/new",
    shortLabel: "Project",
  },
  serve: {
    label: "Preview Portal",
    icon: Eye,
    href: "/dashboard/serve/preview",
    shortLabel: "Preview",
  },
};

/**
 * Mode-aware primary action button
 * Changes based on the active dashboard mode
 */
export function ModePrimaryAction({ mode, collapsed }: ModePrimaryActionProps) {
  const action = MODE_PRIMARY_ACTIONS[mode];
  const Icon = action.icon;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" className="w-full py-3 h-auto" asChild>
            <a
              href={action.href}
              className="flex items-center justify-center"
            >
              <Icon className="h-[22px] w-[22px]" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{action.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground"
      asChild
    >
      <a href={action.href}>
        <Icon className="h-4 w-4 mr-2" />
        {action.label}
      </a>
    </Button>
  );
}

interface ModeSecondaryActionProps {
  mode: DashboardMode;
  collapsed: boolean;
  onSearchClick: () => void;
}

const MODE_SECONDARY_ACTIONS: Record<
  DashboardMode,
  { label: string; icon: typeof Search; shortcut?: string }
> = {
  strategy: {
    label: "Search Intelligence",
    icon: Brain,
    shortcut: "⌘K",
  },
  studio: {
    label: "Search",
    icon: Search,
    shortcut: "⌘K",
  },
  serve: {
    label: "Search Portals",
    icon: Search,
    shortcut: "⌘K",
  },
};

/**
 * Mode-aware secondary action (search)
 * Uses the same command palette but with mode-specific labels
 */
export function ModeSecondaryAction({
  mode,
  collapsed,
  onSearchClick,
}: ModeSecondaryActionProps) {
  const action = MODE_SECONDARY_ACTIONS[mode];
  const Icon = action.icon;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="w-full py-3 h-auto"
            onClick={onSearchClick}
          >
            <Icon className="h-[22px] w-[22px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>
            {action.label} ({action.shortcut})
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground"
      onClick={onSearchClick}
    >
      <Icon className="h-4 w-4 mr-2" />
      {action.label}
      {action.shortcut && (
        <kbd className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted/50 border border-border/50 rounded">
          {action.shortcut}
        </kbd>
      )}
    </Button>
  );
}
