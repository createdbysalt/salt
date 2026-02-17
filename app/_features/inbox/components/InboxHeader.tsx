"use client";

import { useState } from "react";
import {
  Inbox,
  Clock,
  CheckCircle2,
  Target,
  Briefcase,
  Zap,
  Search,
  MoreHorizontal,
  Archive,
} from "lucide-react";
import { cn } from "@repo/utils";
import { Button, Badge, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@repo/ui";
import type { InboxMode, InboxState } from "../types";

const STATE_CONFIG: Record<
  InboxState,
  { icon: typeof Inbox; label: string; shortcut: string }
> = {
  inbox: { icon: Inbox, label: "Inbox", shortcut: "1" },
  snoozed: { icon: Clock, label: "Snoozed", shortcut: "2" },
  done: { icon: CheckCircle2, label: "Done", shortcut: "3" },
};

const MODE_FILTERS: { mode: InboxMode | "all"; icon: typeof Target; label: string }[] = [
  { mode: "all", icon: Inbox, label: "All" },
  { mode: "strategy", icon: Target, label: "Strategy" },
  { mode: "studio", icon: Briefcase, label: "Studio" },
  { mode: "serve", icon: Zap, label: "Serve" },
];

interface InboxHeaderProps {
  currentState: InboxState;
  currentMode: InboxMode | "all";
  counts: Record<InboxState, number>;
  selectedCount: number;
  onStateChange: (state: InboxState) => void;
  onModeChange: (mode: InboxMode | "all") => void;
  onBulkArchive?: () => void;
  onSearch?: (query: string) => void;
}

/**
 * InboxHeader - State tabs, mode filters, and bulk actions
 *
 * Three-state system: Inbox → Snoozed → Done
 * Mode filters: All, Strategy, Studio, Serve
 * Bulk actions appear when items are selected
 */
export function InboxHeader({
  currentState,
  currentMode,
  counts,
  selectedCount,
  onStateChange,
  onModeChange,
  onBulkArchive,
  onSearch,
}: InboxHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-3">
      {/* State Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          {(Object.entries(STATE_CONFIG) as [InboxState, typeof STATE_CONFIG.inbox][]).map(
            ([state, config]) => {
              const Icon = config.icon;
              const isActive = currentState === state;
              const count = counts[state];

              return (
                <TooltipProvider key={state} delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onStateChange(state)}
                        className={cn(
                          // Base styles
                          "relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
                          "transition-all duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
                          // State-specific styles
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        <Icon className="size-4" />
                        <span>{config.label}</span>
                        {count > 0 && (
                          <Badge
                            variant={isActive ? "default" : "secondary"}
                            className="h-5 min-w-5 px-1.5 text-[10px]"
                          >
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span className="flex items-center gap-2">
                        {config.label}
                        <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                          {config.shortcut}
                        </kbd>
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search inbox..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            className={cn(
              "h-9 w-64 pl-9 pr-3 rounded-lg",
              "bg-muted/50 border-0 text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring/20",
              "transition-all duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
            )}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-background/80 text-[10px] text-muted-foreground font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Mode Filters + Bulk Actions */}
      <div className="flex items-center justify-between">
        {/* Mode Filter Pills */}
        <div className="flex items-center gap-1">
          {MODE_FILTERS.map(({ mode, icon: Icon, label }) => {
            const isActive = currentMode === mode;

            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                className={cn(
                  // Base styles
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                  "border transition-all duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
                  // State-specific styles
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                )}
              >
                <Icon className="size-3" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Bulk Actions (shown when items selected) */}
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBulkArchive}
                    className="gap-1.5"
                  >
                    <Archive className="size-4" />
                    <span>Archive</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="flex items-center gap-2">
                    Archive selected
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">E</kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-mono">
              J/K
            </kbd>
            <span className="text-xs text-muted-foreground">to navigate</span>
          </div>
        )}
      </div>
    </div>
  );
}
