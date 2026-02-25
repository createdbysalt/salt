"use client";

import * as React from "react";
import {
  Search,
  ListFilter,
  SlidersHorizontal,
  ArrowUpDown,
  MessageSquare,
  Receipt,
  Calendar,
  FileText,
  Brain,
  Eye,
  Inbox,
  Target,
  Briefcase,
  Link2,
  AlertCircle,
  Mail,
  Bell,
  Clock,
  Flag,
  CheckCircle2,
  ArchiveRestore,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  Input,
  Switch,
  Separator,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { InboxItemCard } from "./InboxItemCard";
import { fetchInboxItems, markAsRead, archiveItem } from "../actions";
import { useInbox } from "../contexts/InboxContext";
import type { InboxItem, InboxItemType, InboxMode, InboxItemUrgency } from "../types";

// View mode for inbox (active items vs archived/done items)
type InboxViewMode = "inbox" | "done";

// =============================================================================
// FILTER & DISPLAY OPTIONS
// =============================================================================

// Type filters now support multi-select (array)
type InboxModeFilter = "all" | InboxMode;
type InboxUrgencyFilter = "all" | InboxItemUrgency;
type InboxOrdering = "newest" | "oldest";

const TYPE_OPTIONS = [
  { value: "message", label: "Messages", icon: MessageSquare },
  { value: "invoice", label: "Invoices", icon: Receipt },
  { value: "meeting", label: "Meetings", icon: Calendar },
  { value: "milestone", label: "Milestones", icon: Flag },
  { value: "proposal", label: "Proposals", icon: FileText },
  { value: "intelligence", label: "Intelligence", icon: Brain },
  { value: "seo_alert", label: "SEO Alerts", icon: AlertCircle },
  { value: "portal_activity", label: "Portal Activity", icon: Eye },
  { value: "client_request", label: "Client Requests", icon: Inbox },
] as const;

const MODE_OPTIONS = [
  { value: "studio", label: "Studio", icon: Briefcase },
  { value: "strategy", label: "Strategy", icon: Target },
  { value: "serve", label: "Serve", icon: Link2 },
] as const;

const URGENCY_OPTIONS = [
  { value: "overdue", label: "Overdue", icon: AlertCircle },
  { value: "unread", label: "Unread", icon: Mail },
  { value: "alert", label: "Alerts", icon: Bell },
  { value: "today", label: "Today", icon: Clock },
] as const;

// =============================================================================
// HELPER: Check if item is unread
// =============================================================================

function isItemUnread(item: InboxItem): boolean {
  // Check metadata.is_read first (explicit read state)
  if (item.metadata?.is_read === true) return false;
  if (item.metadata?.is_read === false) return true;
  // Fall back to urgency
  return item.urgency === "unread";
}

// =============================================================================
// PROPS
// =============================================================================

interface InboxSidebarProps {
  initialItems?: InboxItem[];
  selectedId?: string;
  onSelect?: (item: InboxItem) => void;
  onArchive?: (item: InboxItem) => void;
  onSnooze?: (item: InboxItem, until: Date) => void;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InboxSidebar({
  initialItems,
  selectedId,
  onSelect,
  onArchive: onArchiveProp,
  onSnooze: onSnoozeProp,
  className,
}: InboxSidebarProps) {
  // Get context for updating breadcrumb and view mode
  const { setSelectedItem, viewMode, setViewMode } = useInbox();

  // Store items in state so we can mark them as read
  const [items, setItems] = React.useState<InboxItem[]>(initialItems || []);
  const [isLoading, setIsLoading] = React.useState(!initialItems);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [internalSelectedId, setInternalSelectedId] = React.useState<string | undefined>(
    selectedId
  );

  // viewMode comes from context (for breadcrumb sync)

  // Fetch inbox items based on view mode
  const fetchItems = React.useCallback(async (mode: InboxViewMode) => {
    setIsLoading(true);
    try {
      const data = await fetchInboxItems(mode);
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch inbox items:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and when view mode changes
  React.useEffect(() => {
    if (!initialItems || viewMode !== "inbox") {
      fetchItems(viewMode);
    }
  }, [viewMode, initialItems, fetchItems]);

  // Handle archive action
  const handleArchive = React.useCallback(async (item: InboxItem) => {
    // Optimistic update - remove from list
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    // Call prop callback
    onArchiveProp?.(item);

    try {
      const result = await archiveItem({
        sourceTable: item.source_table,
        sourceId: item.source_id,
      });

      if (!result.success) {
        // Revert on error
        fetchItems(viewMode);
        console.error("Failed to archive:", result.error);
      }
    } catch (error) {
      // Revert on error
      fetchItems(viewMode);
      console.error("Failed to archive:", error);
    }
  }, [viewMode, fetchItems, onArchiveProp]);

  // Handle snooze action
  const handleSnooze = React.useCallback(async (item: InboxItem, until: Date) => {
    // Optimistic update - remove from list (will reappear when snooze expires)
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    // Call prop callback
    onSnoozeProp?.(item, until);
  }, [onSnoozeProp]);

  // Expose handlers via a ref-like pattern for parent to access
  const inboxActions = React.useMemo(() => ({
    archive: handleArchive,
    snooze: handleSnooze,
    refresh: () => fetchItems(viewMode),
  }), [handleArchive, handleSnooze, fetchItems, viewMode]);

  // Filter state - typeFilters is now an array for multi-select
  const [typeFilters, setTypeFilters] = React.useState<InboxItemType[]>([]);
  const [modeFilter, setModeFilter] = React.useState<InboxModeFilter>("all");
  const [urgencyFilter, setUrgencyFilter] = React.useState<InboxUrgencyFilter>("all");

  // Display state
  const [ordering, setOrdering] = React.useState<InboxOrdering>("newest");
  const [showSnoozed, setShowSnoozed] = React.useState(false);
  const [showRead, setShowRead] = React.useState(true);
  const [showUnreadFirst, setShowUnreadFirst] = React.useState(false);

  // Use controlled or uncontrolled selection
  const currentSelectedId = selectedId ?? internalSelectedId;

  // Check if any filters are active
  const hasActiveFilters = typeFilters.length > 0 || modeFilter !== "all" || urgencyFilter !== "all";

  // Filter and sort items
  const filteredItems = React.useMemo(() => {
    let result = [...items];

    // Apply type filter (multi-select)
    if (typeFilters.length > 0) {
      result = result.filter((item) => typeFilters.includes(item.type));
    }

    // Apply mode filter
    if (modeFilter !== "all") {
      result = result.filter((item) => item.mode === modeFilter);
    }

    // Apply urgency filter
    if (urgencyFilter !== "all") {
      result = result.filter((item) => item.urgency === urgencyFilter);
    }

    // Apply read filter - hide read items if showRead is false
    if (!showRead) {
      result = result.filter((item) => isItemUnread(item));
    }

    // Apply snoozed filter
    if (!showSnoozed) {
      result = result.filter((item) => item.state !== "snoozed");
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query) ||
          item.preview?.toLowerCase().includes(query) ||
          item.client_name?.toLowerCase().includes(query) ||
          item.project_name?.toLowerCase().includes(query)
      );
    }

    // Apply ordering
    result.sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return ordering === "newest" ? diff : -diff;
    });

    // Apply unread first
    if (showUnreadFirst) {
      result.sort((a, b) => {
        const aUnread = isItemUnread(a);
        const bUnread = isItemUnread(b);
        if (aUnread && !bUnread) return -1;
        if (!aUnread && bUnread) return 1;
        return 0;
      });
    }

    return result;
  }, [items, typeFilters, modeFilter, urgencyFilter, showRead, showSnoozed, searchQuery, ordering, showUnreadFirst]);

  // Handle item click - select and mark as read
  const handleItemClick = async (item: InboxItem) => {
    // Update selection
    setInternalSelectedId(item.id);

    // Update breadcrumb via context
    const updatedItem = {
      ...item,
      metadata: { ...item.metadata, is_read: true },
      urgency: item.urgency === "unread" ? "pending" as const : item.urgency,
    };
    setSelectedItem(updatedItem);

    // Mark as read if unread (optimistic update + persist to database)
    if (isItemUnread(item)) {
      // Optimistic update
      setItems((prevItems) =>
        prevItems.map((i) =>
          i.id === item.id ? updatedItem : i
        )
      );

      // Persist to database
      markAsRead({
        sourceTable: item.source_table,
        sourceId: item.source_id,
      }).catch((error) => {
        console.error("Failed to mark as read:", error);
      });
    }

    // Call external handler with updated item
    onSelect?.(updatedItem);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full",
        "bg-background",
        className
      )}
    >
      {/* Header */}
      <div className="shrink-0 p-4 space-y-3">
        {/* View Toggle: Inbox / Done */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => {
              setViewMode("inbox");
              setSelectedItem(null);
              setInternalSelectedId(undefined);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              viewMode === "inbox"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Inbox className="size-4" />
            Inbox
          </button>
          <button
            onClick={() => {
              setViewMode("done");
              setSelectedItem(null);
              setInternalSelectedId(undefined);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              viewMode === "done"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckCircle2 className="size-4" />
            Done
          </button>
        </div>

        {/* Search + Filter/Display Icons - all on one line */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-1">
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 relative">
                  <ListFilter className="size-4" />
                  {hasActiveFilters && (
                    <span className="absolute -top-0.5 -right-0.5 size-2.5 bg-primary rounded-full ring-2 ring-background" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Filter by
                </DropdownMenuLabel>

                {/* Type Filter - Multi-select */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center">
                    <Inbox className="size-4 mr-2" />
                    <span className="flex-1">Type</span>
                    {typeFilters.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                        {typeFilters.length}
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem
                      checked={typeFilters.length === 0}
                      onCheckedChange={() => setTypeFilters([])}
                    >
                      All types
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
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Mode Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center">
                    <Target className="size-4 mr-2" />
                    <span className="flex-1">Mode</span>
                    {modeFilter !== "all" && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                        1
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem
                      checked={modeFilter === "all"}
                      onCheckedChange={() => setModeFilter("all")}
                    >
                      All modes
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {MODE_OPTIONS.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={modeFilter === option.value}
                        onCheckedChange={() => setModeFilter(option.value as InboxModeFilter)}
                      >
                        <option.icon className="size-4 mr-2" />
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Urgency Filter */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center">
                    <AlertCircle className="size-4 mr-2" />
                    <span className="flex-1">Urgency</span>
                    {urgencyFilter !== "all" && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded-full">
                        1
                      </span>
                    )}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuCheckboxItem
                      checked={urgencyFilter === "all"}
                      onCheckedChange={() => setUrgencyFilter("all")}
                    >
                      All urgencies
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {URGENCY_OPTIONS.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={urgencyFilter === option.value}
                        onCheckedChange={() => setUrgencyFilter(option.value as InboxUrgencyFilter)}
                      >
                        <option.icon className="size-4 mr-2" />
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setTypeFilters([]);
                        setModeFilter("all");
                        setUrgencyFilter("all");
                      }}
                    >
                      Clear all filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Display/Order Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <SlidersHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Ordering */}
                <div className="flex items-center justify-between px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="size-4" />
                    <span className="text-sm">Ordering</span>
                  </div>
                  <Select value={ordering} onValueChange={(v) => setOrdering(v as InboxOrdering)}>
                    <SelectTrigger className="h-7 w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DropdownMenuSeparator />

                {/* Toggle Options */}
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm">Show snoozed</span>
                  <Switch
                    checked={showSnoozed}
                    onCheckedChange={setShowSnoozed}
                    className="scale-75"
                  />
                </div>

                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm">Show read</span>
                  <Switch
                    checked={showRead}
                    onCheckedChange={setShowRead}
                    className="scale-75"
                  />
                </div>

                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm">Show unread first</span>
                  <Switch
                    checked={showUnreadFirst}
                    onCheckedChange={setShowUnreadFirst}
                    className="scale-75"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Separator />

      {/* Item List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
            {viewMode === "done" ? (
              items.length === 0 ? (
                <>
                  <CheckCircle2 className="size-8 text-muted-foreground/50" />
                  <span>No archived items yet</span>
                </>
              ) : (
                <>
                  <Search className="size-8 text-muted-foreground/50" />
                  <span>No matching archived items</span>
                </>
              )
            ) : items.length === 0 ? (
              <>
                <Inbox className="size-8 text-muted-foreground/50" />
                <span>Your inbox is empty</span>
              </>
            ) : (
              <>
                <Search className="size-8 text-muted-foreground/50" />
                <span>No matching items</span>
                {(hasActiveFilters || searchQuery) && (
                  <span className="text-xs">Try adjusting your filters</span>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <InboxItemCard
                key={item.id}
                item={item}
                isSelected={currentSelectedId === item.id}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
