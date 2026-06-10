"use client";

import { Clock, ChevronRight, FolderKanban, Users, MessageSquare, FileText, Search, Eye, Sparkles, Star } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/_components/ui/dropdown-menu";
import { useRecents } from "../../hooks/useRecents";
import { useFavorites } from "../../hooks/useFavorites";
import type { DashboardMode } from "../../types/mode";
import type { RecentItemType } from "../../types/recents";

interface ModeRecentsProps {
  mode: DashboardMode;
  collapsed: boolean;
  onItemClick?: () => void;
}

// Map item types to icons
const ITEM_TYPE_ICONS: Record<RecentItemType, typeof FolderKanban> = {
  project: FolderKanban,
  client: Users,
  conversation: MessageSquare,
  report: FileText,
  audit: Search,
  intelligence: Sparkles,
  portal: Eye,
};

// Empty state messages per mode
const EMPTY_MESSAGES: Record<DashboardMode, { title: string; subtitle: string }> = {
  strategy: {
    title: "No recent intelligence",
    subtitle: "Generate reports and audits to see them here",
  },
  studio: {
    title: "No recent items",
    subtitle: "Visit projects or clients to see them here",
  },
  serve: {
    title: "No recent portals",
    subtitle: "Configure Spaces to see them here",
  },
};

// View all links per mode
const VIEW_ALL_LINKS: Record<DashboardMode, string> = {
  strategy: "/strategy/recents",
  studio: "/studio/recents",
  serve: "/serve/recents",
};

/**
 * ModeRecents - Shows recently visited items for the current mode
 * Collapsed: Shows icon that opens a dropdown menu
 * Expanded: Shows list with "View all" link
 */
export function ModeRecents({ mode, collapsed, onItemClick }: ModeRecentsProps) {
  const { recents, isLoading } = useRecents({ mode, limit: 5 });
  const { favorites } = useFavorites();

  // Create a set of favorited IDs for quick lookup
  const favoritedIds = new Set(favorites.map((f) => f.id));

  const emptyState = EMPTY_MESSAGES[mode];
  const viewAllLink = VIEW_ALL_LINKS[mode];

  // Loading state
  if (isLoading) {
    return (
      <div className={`${collapsed ? "px-0" : "px-0"}`}>
        <div className="animate-pulse space-y-2">
          {!collapsed && (
            <div className="h-4 w-16 bg-sidebar-accent/30 rounded" />
          )}
          <div className="h-8 bg-sidebar-accent/30 rounded" />
          <div className="h-8 bg-sidebar-accent/30 rounded" />
        </div>
      </div>
    );
  }

  // Collapsed mode: Icon with dropdown menu
  if (collapsed) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full py-2.5 h-auto relative"
              >
                <Clock className="h-5 w-5" />
                {recents.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Recent items</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="right"
          align="start"
          className="w-64"
          sideOffset={8}
        >
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Recents</span>
            {recents.length > 0 && (
              <a
                href={viewAllLink}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 font-normal"
                onClick={onItemClick}
              >
                View all
                <ChevronRight className="h-3 w-3" />
              </a>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {recents.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">{emptyState.title}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {emptyState.subtitle}
              </p>
            </div>
          ) : (
            recents.map((item) => {
              const Icon = ITEM_TYPE_ICONS[item.type] || FolderKanban;
              const isFavorited = favoritedIds.has(item.id);
              return (
                <DropdownMenuItem key={item.id} asChild>
                  <a
                    href={item.href}
                    onClick={onItemClick}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{item.label}</p>
                      {item.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {isFavorited && (
                      <Star className="h-3 w-3 text-foreground/70 fill-foreground/70 shrink-0" />
                    )}
                  </a>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Expanded mode: Full list (smaller visual hierarchy than nav items)
  return (
    <div className="space-y-1.5">
      <div className="px-3 flex items-center justify-between">
        <span className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider">
          Recents
        </span>
        {recents.length > 0 && (
          <a
            href={viewAllLink}
            className="text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground flex items-center gap-0.5"
            onClick={onItemClick}
          >
            View all
            <ChevronRight className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {recents.length === 0 ? (
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-sidebar-foreground/50">{emptyState.title}</p>
          <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">
            {emptyState.subtitle}
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {recents.map((item) => {
            const Icon = ITEM_TYPE_ICONS[item.type] || FolderKanban;
            const isFavorited = favoritedIds.has(item.id);
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={onItemClick}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                <span className="truncate flex-1">{item.label}</span>
                {isFavorited && (
                  <Star className="h-2.5 w-2.5 text-sidebar-foreground/60 fill-sidebar-foreground/60 shrink-0" />
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
