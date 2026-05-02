"use client";

import * as React from "react";
import {
  Search,
  Inbox,
  CheckCircle2,
  MessageSquare,
  Mail,
  Receipt,
  Flag,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Input,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@repo/ui";
import { TableInboxItemCard } from "./TableInboxItemCard";
import type { InboxItem } from "@/app/_features/inbox/types";

// =============================================================================
// TYPES
// =============================================================================

type BridgeViewMode = "inbox" | "done";

// Bridge only shows these types
type BridgeItemType = "message" | "email" | "invoice" | "milestone" | "meeting";

const TYPE_OPTIONS: { value: BridgeItemType; label: string; icon: React.ElementType }[] = [
  { value: "message", label: "Messages", icon: MessageSquare },
  { value: "email", label: "Emails", icon: Mail },
  { value: "invoice", label: "Invoices", icon: Receipt },
  { value: "milestone", label: "Milestones", icon: Flag },
  { value: "meeting", label: "Meetings", icon: Calendar },
];

// =============================================================================
// HELPERS
// =============================================================================

function isItemUnread(item: InboxItem): boolean {
  if (item.metadata?.is_read === true) return false;
  if (item.metadata?.is_read === false) return true;
  return item.urgency === "unread";
}

// =============================================================================
// COMPONENT
// =============================================================================

interface TableInboxSidebarProps {
  items: InboxItem[];
  isLoading?: boolean;
  selectedId?: string;
  viewMode: BridgeViewMode;
  onViewModeChange: (_mode: BridgeViewMode) => void;
  onSelect: (_item: InboxItem) => void;
  className?: string;
}

export function TableInboxSidebar({
  items,
  isLoading,
  selectedId,
  viewMode,
  onViewModeChange,
  onSelect,
  className,
}: TableInboxSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilters, setTypeFilters] = React.useState<BridgeItemType[]>([]);

  // Check if any filters are active
  const hasActiveFilters = typeFilters.length > 0;

  // Filter items
  const filteredItems = React.useMemo(() => {
    let result = [...items];

    // Apply type filter
    if (typeFilters.length > 0) {
      result = result.filter((item) => typeFilters.includes(item.type as BridgeItemType));
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query) ||
          item.preview?.toLowerCase().includes(query) ||
          item.project_name?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [items, typeFilters, searchQuery]);

  // Count unread
  const unreadCount = items.filter(isItemUnread).length;

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full",
        "bg-[var(--bridge-bg-elevated)]",
        className
      )}
    >
      {/* Header */}
      <div className="shrink-0 p-4 space-y-3 border-b border-[var(--bridge-border-subtle)]">
        {/* View Toggle: Inbox / Done */}
        <div className="flex items-center gap-1 p-1 bg-[var(--bridge-bg-surface)] rounded-[var(--bridge-radius-md)]">
          <button
            onClick={() => onViewModeChange("inbox")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[var(--bridge-font-size-sm)] font-medium rounded-[var(--bridge-radius-sm)] transition-all",
              viewMode === "inbox"
                ? "bg-[var(--bridge-bg-elevated)] text-[var(--bridge-text-primary)] shadow-[var(--bridge-shadow-sm)]"
                : "text-[var(--bridge-text-muted)] hover:text-[var(--bridge-text-primary)]"
            )}
          >
            <Inbox className="size-4" />
            Inbox
            {unreadCount > 0 && viewMode === "inbox" && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--bridge-accent)] text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onViewModeChange("done")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[var(--bridge-font-size-sm)] font-medium rounded-[var(--bridge-radius-sm)] transition-all",
              viewMode === "done"
                ? "bg-[var(--bridge-bg-elevated)] text-[var(--bridge-text-primary)] shadow-[var(--bridge-shadow-sm)]"
                : "text-[var(--bridge-text-muted)] hover:text-[var(--bridge-text-primary)]"
            )}
          >
            <CheckCircle2 className="size-4" />
            Done
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--bridge-text-subtle)]" />
            <Input
              type="text"
              placeholder="Search updates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[var(--bridge-bg-surface)] border-[var(--bridge-border-subtle)] focus:border-[var(--bridge-accent)]"
            />
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "size-9 relative border-[var(--bridge-border-subtle)]",
                  hasActiveFilters && "border-[var(--bridge-accent)]"
                )}
              >
                <SlidersHorizontal className="size-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 size-2.5 bg-[var(--bridge-accent)] rounded-full ring-2 ring-[var(--bridge-bg-elevated)]" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" data-surface="table">
              <DropdownMenuCheckboxItem
                checked={typeFilters.length === 0}
                onCheckedChange={() => setTypeFilters([])}
              >
                All updates
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {TYPE_OPTIONS.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={typeFilters.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setTypeFilters((prev) => [...prev, option.value]);
                    } else {
                      setTypeFilters((prev) => prev.filter((t) => t !== option.value));
                    }
                  }}
                >
                  <option.icon className="size-4 mr-2" />
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex gap-4">
                <div className="size-10 bg-[var(--bridge-bg-surface)] rounded-[var(--bridge-radius-md)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[var(--bridge-bg-surface)] rounded w-1/4" />
                  <div className="h-4 bg-[var(--bridge-bg-surface)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--bridge-bg-surface)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-8">
            {viewMode === "done" ? (
              items.length === 0 ? (
                <>
                  <CheckCircle2 className="size-12 text-[var(--bridge-text-subtle)] mb-3" />
                  <span className="text-[var(--bridge-font-size-base)] font-medium text-[var(--bridge-text-secondary)]">
                    No archived items
                  </span>
                  <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)] mt-1">
                    Items you archive will appear here
                  </span>
                </>
              ) : (
                <>
                  <Search className="size-12 text-[var(--bridge-text-subtle)] mb-3" />
                  <span className="text-[var(--bridge-font-size-base)] font-medium text-[var(--bridge-text-secondary)]">
                    No matching items
                  </span>
                </>
              )
            ) : items.length === 0 ? (
              <>
                <Inbox className="size-12 text-[var(--bridge-text-subtle)] mb-3" />
                <span className="text-[var(--bridge-font-size-base)] font-medium text-[var(--bridge-text-secondary)]">
                  You&apos;re all caught up!
                </span>
                <span className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-text-muted)] mt-1">
                  New messages and updates will appear here
                </span>
              </>
            ) : (
              <>
                <Search className="size-12 text-[var(--bridge-text-subtle)] mb-3" />
                <span className="text-[var(--bridge-font-size-base)] font-medium text-[var(--bridge-text-secondary)]">
                  No matching items
                </span>
                {(hasActiveFilters || searchQuery) && (
                  <button
                    onClick={() => {
                      setTypeFilters([]);
                      setSearchQuery("");
                    }}
                    className="text-[var(--bridge-font-size-sm)] text-[var(--bridge-accent)] mt-2 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            {filteredItems.map((item) => (
              <TableInboxItemCard
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => onSelect(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
