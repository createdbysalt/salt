"use client";

import { forwardRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Mail,
  Calendar,
  Receipt,
  Flag,
  FileText,
  Brain,
  TrendingDown,
  Eye,
  Inbox,
  Archive,
  Clock,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@repo/utils";
import { Checkbox, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@repo/ui";
import { InboxModeBadge } from "./InboxModeBadge";
import type { InboxItem, InboxItemType } from "../types";

const TYPE_ICONS: Record<InboxItemType, typeof MessageSquare> = {
  message: MessageSquare,
  email: Mail,
  meeting: Calendar,
  invoice: Receipt,
  milestone: Flag,
  proposal: FileText,
  intelligence: Brain,
  seo_alert: TrendingDown,
  portal_activity: Eye,
  client_request: Inbox,
};

interface InboxItemRowProps {
  item: InboxItem;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onFocus: (id: string) => void;
  onClick: (item: InboxItem) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: InboxItem) => void;
}

/**
 * InboxItemRow - Single inbox item with selection, hover actions, and keyboard focus
 *
 * Features:
 * - Checkbox for bulk selection
 * - Mode badge (Strategy/Studio/Serve)
 * - Type icon with semantic color
 * - Client/Project badge
 * - Hover actions (Archive, Snooze, Open)
 * - Keyboard focus ring
 * - Right-click context menu
 */
export const InboxItemRow = forwardRef<HTMLDivElement, InboxItemRowProps>(
  function InboxItemRow(
    {
      item,
      isSelected,
      isFocused,
      onSelect,
      onFocus,
      onClick,
      onArchive,
      onSnooze,
      onContextMenu,
    },
    ref
  ) {
    const [isHovered, setIsHovered] = useState(false);
    const Icon = TYPE_ICONS[item.type];

    return (
      <div
        ref={ref}
        role="row"
        tabIndex={-1}
        data-item-id={item.id}
        onClick={() => onClick(item)}
        onContextMenu={(e) => onContextMenu(e, item)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => onFocus(item.id)}
        className={cn(
          // Base styles
          "group relative flex items-center gap-3 px-4 py-3 rounded-lg",
          "cursor-pointer select-none",
          "transition-all duration-[160ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          // Background states
          isSelected
            ? "bg-primary/5 dark:bg-primary/10"
            : isHovered
              ? "bg-accent/50"
              : "bg-transparent",
          // Focus ring
          isFocused &&
            "ring-2 ring-ring/30 ring-offset-0"
        )}
      >
        {/* Checkbox */}
        <div
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.id, !isSelected);
          }}
        >
          <Checkbox
            checked={isSelected}
            className={cn(
              "transition-opacity duration-[160ms]",
              isSelected || isHovered || isFocused
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            )}
          />
        </div>

        {/* Type Icon */}
        <div className="shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title only - keep it clean and calm */}
          <span className="font-medium text-sm truncate block">{item.title}</span>
        </div>

        {/* Right side: Time or Hover Actions */}
        <div className="shrink-0 flex items-center">
          {/* Hover Actions */}
          <div
            className={cn(
              "flex items-center gap-0.5 mr-2",
              "transition-opacity duration-[100ms]",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(item.id);
                    }}
                    className={cn(
                      "p-1.5 rounded-md",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-muted/80",
                      "transition-colors duration-[100ms]"
                    )}
                  >
                    <Archive className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span className="flex items-center gap-1.5">
                    Archive
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                      E
                    </kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSnooze(item.id);
                    }}
                    className={cn(
                      "p-1.5 rounded-md",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-muted/80",
                      "transition-colors duration-[100ms]"
                    )}
                  >
                    <Clock className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span className="flex items-center gap-1.5">
                    Snooze
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                      H
                    </kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(item.href, "_blank");
                    }}
                    className={cn(
                      "p-1.5 rounded-md",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-muted/80",
                      "transition-colors duration-[100ms]"
                    )}
                  >
                    <ExternalLink className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span className="flex items-center gap-1.5">
                    Open in new tab
                    <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">
                      ⌘↵
                    </kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onContextMenu(
                  {
                    ...e,
                    preventDefault: () => {},
                    clientX: e.currentTarget.getBoundingClientRect().left,
                    clientY: e.currentTarget.getBoundingClientRect().bottom,
                  } as React.MouseEvent,
                  item
                );
              }}
              className={cn(
                "p-1.5 rounded-md",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted/80",
                "transition-colors duration-[100ms]"
              )}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </div>

          {/* Timestamp */}
          <span
            className={cn(
              "text-xs text-muted-foreground tabular-nums",
              "transition-opacity duration-[100ms]",
              isHovered ? "opacity-50" : "opacity-100"
            )}
          >
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: false })}
          </span>
        </div>
      </div>
    );
  }
);
