"use client";

import * as React from "react";
import { TableInboxSidebar, TableInboxPreviewPanel } from "./components";
import {
  fetchBridgeInboxItems,
  archiveBridgeItem,
  restoreBridgeItem,
  snoozeBridgeItem,
  markBridgeItemAsRead,
} from "./actions";
import type { InboxItem } from "@/app/_features/inbox/types";

type BridgeViewMode = "inbox" | "done";

export default function BridgeInboxPage() {
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedItem, setSelectedItem] = React.useState<InboxItem | null>(null);
  const [viewMode, setViewMode] = React.useState<BridgeViewMode>("inbox");

  // Fetch items on mount and when view mode changes
  const fetchItems = React.useCallback(async (mode: BridgeViewMode) => {
    setIsLoading(true);
    try {
      const data = await fetchBridgeInboxItems(mode);
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch inbox items:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchItems(viewMode);
  }, [viewMode, fetchItems]);

  // Handle view mode change
  const handleViewModeChange = (mode: BridgeViewMode) => {
    setViewMode(mode);
    setSelectedItem(null);
  };

  // Handle item selection
  const handleSelect = async (item: InboxItem) => {
    // Update selection
    setSelectedItem(item);

    // Mark as read if unread
    if (item.metadata?.is_read === false) {
      // Optimistic update
      const updatedItem = {
        ...item,
        metadata: { ...item.metadata, is_read: true },
        urgency: item.urgency === "unread" ? ("pending" as const) : item.urgency,
      };
      setSelectedItem(updatedItem);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? updatedItem : i))
      );

      // Persist
      await markBridgeItemAsRead({
        sourceTable: item.source_table,
        sourceId: item.source_id,
      });
    }
  };

  // Handle archive
  const handleArchive = async (item: InboxItem) => {
    // Optimistic update - remove from list
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setSelectedItem(null);

    const result = await archiveBridgeItem({
      sourceTable: item.source_table,
      sourceId: item.source_id,
    });

    if (!result.success) {
      // Revert on error
      fetchItems(viewMode);
      console.error("Failed to archive:", result.error);
    }
  };

  // Handle restore
  const handleRestore = async (item: InboxItem) => {
    // Optimistic update - remove from done list
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setSelectedItem(null);

    const result = await restoreBridgeItem({
      sourceTable: item.source_table,
      sourceId: item.source_id,
    });

    if (!result.success) {
      // Revert on error
      fetchItems(viewMode);
      console.error("Failed to restore:", result.error);
    }
  };

  // Handle snooze
  const handleSnooze = async (item: InboxItem, until: Date) => {
    // Optimistic update - remove from list
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setSelectedItem(null);

    const result = await snoozeBridgeItem({
      sourceTable: item.source_table,
      sourceId: item.source_id,
      until,
    });

    if (!result.success) {
      // Revert on error
      fetchItems(viewMode);
      console.error("Failed to snooze:", result.error);
    }
  };

  return (
    <div className="flex h-full">
      {/* Inbox List Column */}
      <div className="w-[380px] shrink-0 border-r border-[var(--bridge-border-subtle)] overflow-hidden">
        <TableInboxSidebar
          items={items}
          isLoading={isLoading}
          selectedId={selectedItem?.id}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onSelect={handleSelect}
        />
      </div>

      {/* Preview Panel */}
      <div className="flex-1 overflow-hidden">
        <TableInboxPreviewPanel
          item={selectedItem}
          isOpen={!!selectedItem}
          isArchived={viewMode === "done"}
          onClose={() => setSelectedItem(null)}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onSnooze={handleSnooze}
        />
      </div>
    </div>
  );
}
