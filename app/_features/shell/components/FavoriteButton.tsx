"use client";

import { Star } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";
import { useFavoriteStatus } from "../hooks/useFavorites";
import type { FavoriteItem } from "../types/favorites";
import { cn } from "@repo/utils";

interface FavoriteButtonProps {
  /** The item data to favorite (without favoritedAt) */
  item: Omit<FavoriteItem, "favoritedAt">;
  /** Optional size variant */
  size?: "sm" | "default";
  /** Optional additional class names */
  className?: string;
}

/**
 * FavoriteButton - Star toggle button for favoriting items
 *
 * Use in detail page headers to allow users to favorite clients, projects, etc.
 * Favorites are cross-mode and persist in the sidebar.
 *
 * @example
 * ```tsx
 * <FavoriteButton
 *   item={{
 *     id: client.id,
 *     type: "client",
 *     primaryMode: "studio",
 *     label: client.name,
 *     href: `/studio/clients/${client.id}`,
 *     subtitle: client.company?.name,
 *   }}
 * />
 * ```
 */
export function FavoriteButton({
  item,
  size = "default",
  className,
}: FavoriteButtonProps) {
  const { isFavorited, toggle } = useFavoriteStatus(item.id);

  const handleClick = () => {
    toggle(item);
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className={cn(
              buttonSize,
              "transition-all duration-200",
              isFavorited
                ? "text-foreground hover:text-foreground"
                : "text-muted-foreground hover:text-foreground",
              className
            )}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={cn(
                iconSize,
                "transition-transform duration-200",
                isFavorited && "fill-current scale-110"
              )}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isFavorited ? "Remove from favorites" : "Add to favorites"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
