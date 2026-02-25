"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import {
  InboxHeader,
  InboxList,
  InboxPreviewPanel,
  InboxContextMenu,
  InboxSnoozePopover,
} from "@/app/_features/inbox/components";
import { useInboxKeyboard } from "@/app/_features/inbox/hooks/useInboxKeyboard";
import type { InboxItem, InboxMode, InboxState } from "@/app/_features/inbox/types";

// Placeholder data - will be replaced with real database queries
const MOCK_ITEMS: InboxItem[] = [
  {
    id: "1",
    type: "message",
    mode: "studio",
    urgency: "unread",
    state: "inbox",
    title: "New message received",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    href: "/studio/messages",
    source_table: "messages",
    source_id: "1",
  },
  {
    id: "2",
    type: "invoice",
    mode: "studio",
    urgency: "unread",
    state: "inbox",
    title: "Invoice payment received",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
    href: "/studio/billing",
    source_table: "invoices",
    source_id: "2",
  },
  {
    id: "3",
    type: "milestone",
    mode: "studio",
    urgency: "pending",
    state: "inbox",
    title: "Milestone completed",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    href: "/studio/projects",
    source_table: "milestones",
    source_id: "3",
  },
  {
    id: "4",
    type: "client_request",
    mode: "serve",
    urgency: "new",
    state: "inbox",
    title: "New client request",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000),
    href: "/bridge/requests",
    source_table: "client_requests",
    source_id: "4",
  },
  {
    id: "5",
    type: "proposal",
    mode: "strategy",
    urgency: "pending",
    state: "inbox",
    title: "Proposal viewed",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    href: "/strategy/proposals",
    source_table: "proposals",
    source_id: "5",
  },
];

/**
 * InboxPageClient - Calm, Linear-style inbox with resizable split view
 */
export function InboxPageClient() {
  const router = useRouter();

  // State
  const [currentState, setCurrentState] = useState<InboxState>("inbox");
  const [currentMode, setCurrentMode] = useState<InboxMode | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<InboxItem | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    item: InboxItem | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, item: null });

  // Snooze popover state
  const [snoozePopover, setSnoozePopover] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    itemId: string | null;
  }>({ isOpen: false, position: { x: 0, y: 0 }, itemId: null });

  // Filter items
  const filteredItems = useMemo(() => {
    let items = MOCK_ITEMS.filter((item) => item.state === currentState);

    if (currentMode !== "all") {
      items = items.filter((item) => item.mode === currentMode);
    }

    return items;
  }, [currentState, currentMode]);

  // Calculate counts
  const counts = useMemo(() => {
    return {
      inbox: MOCK_ITEMS.filter((i) => i.state === "inbox").length,
      snoozed: MOCK_ITEMS.filter((i) => i.state === "snoozed").length,
      done: MOCK_ITEMS.filter((i) => i.state === "done").length,
    };
  }, []);

  // Handlers
  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleArchive = useCallback((ids: string[]) => {
    console.log("Archive:", ids);
  }, []);

  const handleSnooze = useCallback(
    (date: Date) => {
      console.log("Snooze until:", date, "Item:", snoozePopover.itemId);
      setSnoozePopover({ isOpen: false, position: { x: 0, y: 0 }, itemId: null });
    },
    [snoozePopover.itemId]
  );

  const handleItemClick = useCallback((item: InboxItem) => {
    setPreviewItem(item);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: InboxItem) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      item,
    });
  }, []);

  const handleSnoozeOpen = useCallback((id: string) => {
    const rect = document.querySelector(`[data-item-id="${id}"]`)?.getBoundingClientRect();
    setSnoozePopover({
      isOpen: true,
      position: { x: rect?.right || 200, y: rect?.top || 200 },
      itemId: id,
    });
  }, []);

  // Keyboard navigation
  useInboxKeyboard({
    items: filteredItems,
    focusedId,
    selectedIds,
    previewItem,
    onFocusChange: setFocusedId,
    onSelectionChange: setSelectedIds,
    onStateChange: setCurrentState,
    onArchive: handleArchive,
    onSnoozeOpen: handleSnoozeOpen,
    onItemOpen: handleItemClick,
    onPreviewClose: () => setPreviewItem(null),
  });

  return (
    <div className="h-full">
      <PanelGroup orientation="horizontal">
        {/* Left Panel: Inbox List (resizable) */}
        <Panel defaultSize={30} minSize={20} maxSize={50}>
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-border/50">
              <InboxHeader
                currentState={currentState}
                currentMode={currentMode}
                counts={counts}
                selectedCount={selectedIds.size}
                onStateChange={setCurrentState}
                onModeChange={setCurrentMode}
                onBulkArchive={() => handleArchive(Array.from(selectedIds))}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
              <InboxList
                items={filteredItems}
                currentState={currentState}
                selectedIds={selectedIds}
                focusedId={focusedId}
                hasFilters={currentMode !== "all"}
                onSelect={handleSelect}
                onFocus={setFocusedId}
                onItemClick={handleItemClick}
                onArchive={(id) => handleArchive([id])}
                onSnooze={handleSnoozeOpen}
                onContextMenu={handleContextMenu}
              />
            </div>
          </div>
        </Panel>

        {/* Resize Handle - draggable divider */}
        <PanelResizeHandle className="w-1 bg-border/30 hover:bg-primary/50 transition-colors cursor-col-resize" />

        {/* Right Panel: Detail (permanent) */}
        <Panel minSize={30}>
          <InboxPreviewPanel
            item={previewItem}
            isOpen={!!previewItem}
            onClose={() => setPreviewItem(null)}
            onArchive={(id) => {
              handleArchive([id]);
              setPreviewItem(null);
            }}
            onSnooze={handleSnoozeOpen}
            onReply={(id) => {
              router.push(`/studio/messages/${id}?reply=true`);
            }}
          />
        </Panel>
      </PanelGroup>

      {/* Context Menu */}
      <InboxContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        item={contextMenu.item}
        onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, item: null })}
        onMarkDone={(id) => handleArchive([id])}
        onSnooze={handleSnoozeOpen}
        onOpen={(item) => setPreviewItem(item)}
        onOpenNewTab={(item) => window.open(item.href, "_blank")}
        onGoToClient={(clientId) => router.push(`/studio/clients/${clientId}`)}
        onGoToProject={(projectId) => router.push(`/studio/projects/${projectId}`)}
        onDelete={(id) => console.log("Delete:", id)}
      />

      {/* Snooze Popover */}
      <InboxSnoozePopover
        isOpen={snoozePopover.isOpen}
        position={snoozePopover.position}
        onSnooze={handleSnooze}
        onClose={() => setSnoozePopover({ isOpen: false, position: { x: 0, y: 0 }, itemId: null })}
      />
    </div>
  );
}
