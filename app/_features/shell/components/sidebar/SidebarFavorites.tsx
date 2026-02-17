"use client";

import { Star, ChevronRight, FolderKanban, Users, FileText, Sparkles, Eye } from "lucide-react";
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
import { useFavorites } from "../../hooks/useFavorites";
import type { FavoriteItemType } from "../../types/favorites";

interface SidebarFavoritesProps {
  collapsed: boolean;
  onItemClick?: () => void;
}

// Map item types to icons
const ITEM_TYPE_ICONS: Record<FavoriteItemType, typeof FolderKanban> = {
  project: FolderKanban,
  client: Users,
  report: FileText,
  intelligence: Sparkles,
  portal: Eye,
};

/**
 * SidebarFavorites - Shows user's favorited items (cross-mode)
 * Unlike recents, favorites persist across mode switches
 *
 * Collapsed: Shows star icon that opens a dropdown menu
 * Expanded: Shows list with "Favorites" header
 */
export function SidebarFavorites({ collapsed, onItemClick }: SidebarFavoritesProps) {
  const { favorites, isLoading } = useFavorites({ limit: 7 });

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
                <Star className="h-5 w-5" />
                {favorites.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sidebar-foreground/60" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Favorites</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="right"
          align="start"
          className="w-64"
          sideOffset={8}
        >
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-sidebar-foreground/70" />
              Favorites
            </span>
            {favorites.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">
                {favorites.length} item{favorites.length !== 1 ? "s" : ""}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {favorites.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <Star className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No favorites yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Star items to access them quickly
              </p>
            </div>
          ) : (
            favorites.map((item) => {
              const Icon = ITEM_TYPE_ICONS[item.type] || FolderKanban;
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
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
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
        <span className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider flex items-center gap-1">
          <Star className="h-2.5 w-2.5" />
          Favorites
        </span>
        {favorites.length > 0 && (
          <span className="text-[10px] text-sidebar-foreground/40">
            {favorites.length}
          </span>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-sidebar-foreground/50">No favorites yet</p>
          <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">
            Star items to access them quickly
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {favorites.map((item) => {
            const Icon = ITEM_TYPE_ICONS[item.type] || FolderKanban;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={onItemClick}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors group"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                <span className="truncate flex-1">{item.label}</span>
                <Star className="h-2.5 w-2.5 text-sidebar-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
