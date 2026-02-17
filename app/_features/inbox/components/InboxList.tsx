"use client";

import { useRef, useCallback } from "react";
import {
  AlertCircle,
  MessageSquare,
  AlertTriangle,
  Calendar,
  Sparkles,
  Clock,
} from "lucide-react";
import { cn } from "@repo/utils";
import { InboxItemRow } from "./InboxItemRow";
import { InboxEmptyState } from "./InboxEmptyState";
import type { InboxItem, InboxItemUrgency, InboxState } from "../types";
import { URGENCY_ORDER, URGENCY_CONFIGS } from "../types";

const URGENCY_ICONS: Record<InboxItemUrgency, typeof AlertCircle> = {
  overdue: AlertCircle,
  unread: MessageSquare,
  alert: AlertTriangle,
  today: Calendar,
  new: Sparkles,
  pending: Clock,
};

interface InboxListProps {
  items: InboxItem[];
  currentState: InboxState;
  selectedIds: Set<string>;
  focusedId: string | null;
  hasFilters: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onFocus: (id: string) => void;
  onItemClick: (item: InboxItem) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, item: InboxItem) => void;
}

/**
 * InboxList - Grouped inbox items with keyboard navigation
 *
 * Features:
 * - Groups items by urgency (Overdue → Pending)
 * - Keyboard navigation refs for J/K
 * - Empty state per tab
 */
export function InboxList({
  items,
  currentState,
  selectedIds,
  focusedId,
  hasFilters,
  onSelect,
  onFocus,
  onItemClick,
  onArchive,
  onSnooze,
  onContextMenu,
}: InboxListProps) {
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Register ref for an item
  const setItemRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      itemRefs.current.set(id, element);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  // Empty state
  if (items.length === 0) {
    return <InboxEmptyState state={currentState} hasFilters={hasFilters} />;
  }

  // Group items by urgency
  const groupedItems = URGENCY_ORDER.reduce(
    (acc, urgency) => {
      const group = items.filter((item) => item.urgency === urgency);
      if (group.length > 0) {
        acc.push({ urgency, items: group });
      }
      return acc;
    },
    [] as { urgency: InboxItemUrgency; items: InboxItem[] }[]
  );

  return (
    <div className="space-y-6" role="grid" aria-label="Inbox items">
      {groupedItems.map(({ urgency, items: groupItems }) => {
        const config = URGENCY_CONFIGS[urgency];
        const Icon = URGENCY_ICONS[urgency];

        return (
          <div key={urgency} role="rowgroup">
            {/* Group Header */}
            <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
              <Icon className={cn("size-4", config.className)} />
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  config.className
                )}
              >
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground">
                ({groupItems.length})
              </span>
            </div>

            {/* Group Items */}
            <div className="space-y-0.5">
              {groupItems.map((item) => (
                <InboxItemRow
                  key={item.id}
                  ref={(el) => setItemRef(item.id, el)}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  isFocused={focusedId === item.id}
                  onSelect={onSelect}
                  onFocus={onFocus}
                  onClick={onItemClick}
                  onArchive={onArchive}
                  onSnooze={onSnooze}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Hook for keyboard navigation
 */
export function useInboxNavigation(items: InboxItem[]) {
  const getFlatItemIds = useCallback(() => {
    return items.map((item) => item.id);
  }, [items]);

  const getNextId = useCallback(
    (currentId: string | null, direction: "up" | "down") => {
      const ids = getFlatItemIds();
      if (ids.length === 0) return null;

      if (!currentId) {
        return direction === "down" ? ids[0] : ids[ids.length - 1];
      }

      const currentIndex = ids.indexOf(currentId);
      if (currentIndex === -1) {
        return direction === "down" ? ids[0] : ids[ids.length - 1];
      }

      if (direction === "down") {
        return ids[Math.min(currentIndex + 1, ids.length - 1)];
      } else {
        return ids[Math.max(currentIndex - 1, 0)];
      }
    },
    [getFlatItemIds]
  );

  return { getNextId, getFlatItemIds };
}
