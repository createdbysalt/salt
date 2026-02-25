"use client";

import * as React from "react";
import { InboxSidebar, InboxPreviewPanel } from "@/app/_features/inbox/components";
import { useInbox } from "@/app/_features/inbox/contexts/InboxContext";
import { archiveItem, restoreItem } from "@/app/_features/inbox/actions";
import type { InboxItem } from "@/app/_features/inbox/types";

export default function InboxPage() {
  const { selectedItem, setSelectedItem } = useInbox();
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleArchive = async (item: InboxItem) => {
    // Call the archive action
    const result = await archiveItem({
      sourceTable: item.source_table,
      sourceId: item.source_id,
    });

    if (result.success) {
      // Clear selection and trigger refresh
      setSelectedItem(null);
      setRefreshKey((k) => k + 1);
    } else {
      console.error("Failed to archive:", result.error);
    }
  };

  const handleSnooze = async (item: InboxItem, until: Date) => {
    // Snooze is already handled by SnoozeDropdown, just clear selection
    setSelectedItem(null);
    setRefreshKey((k) => k + 1);
  };

  const handleRestore = async (item: InboxItem) => {
    // Call the restore action to move back to inbox
    const result = await restoreItem({
      sourceTable: item.source_table,
      sourceId: item.source_id,
    });

    if (result.success) {
      // Clear selection and trigger refresh
      setSelectedItem(null);
      setRefreshKey((k) => k + 1);
    } else {
      console.error("Failed to restore:", result.error);
    }
  };

  const handleReply = (id: string) => {
    // TODO: Open reply composer
  };

  return (
    <div className="absolute inset-0 flex">
      {/* Inbox List Column */}
      <div className="w-[350px] shrink-0 border-r border-border overflow-hidden">
        <InboxSidebar key={refreshKey} />
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden bg-muted/30">
        <InboxPreviewPanel
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onArchive={handleArchive}
          onRestore={handleRestore}
          onSnooze={handleSnooze}
          onReply={handleReply}
        />
      </div>
    </div>
  );
}
