"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  InboxHeader,
  InboxList,
  InboxPreviewPanel,
  InboxContextMenu,
  InboxSnoozePopover,
} from "@/app/_features/inbox/components";
import { useInboxKeyboard } from "@/app/_features/inbox/hooks/useInboxKeyboard";
import type { InboxItem, InboxMode, InboxState } from "@/app/_features/inbox/types";

// Mock data for development - will be replaced with real queries
const MOCK_ITEMS: InboxItem[] = [
  {
    id: "1",
    type: "invoice",
    mode: "studio",
    urgency: "overdue",
    state: "inbox",
    title: "Invoice #1042 overdue",
    subtitle: "Website redesign - $4,500",
    client_id: "c1",
    client_name: "Acme Corp",
    project_id: "p1",
    project_name: "Website Redesign",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    href: "/studio/invoices/1042",
    source_table: "invoices",
    source_id: "1042",
    preview: "This invoice is 3 days overdue. Consider sending a follow-up reminder to the client.",
  },
  {
    id: "2",
    type: "proposal",
    mode: "strategy",
    urgency: "overdue",
    state: "inbox",
    title: "Proposal expired",
    subtitle: "Mobile App Development",
    client_id: "c2",
    client_name: "Beta Inc",
    project_id: "p2",
    project_name: "Mobile App",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    href: "/strategy/proposals/101",
    source_table: "proposals",
    source_id: "101",
    preview: "The proposal for Mobile App Development has expired. The client may still be interested - consider following up.",
  },
  {
    id: "3",
    type: "message",
    mode: "studio",
    urgency: "unread",
    state: "inbox",
    title: "Can we adjust the timeline?",
    subtitle: "Re: Project milestones",
    client_id: "c1",
    client_name: "Acme Corp",
    project_id: "p1",
    project_name: "Website Redesign",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    href: "/studio/messages/m1",
    source_table: "messages",
    source_id: "m1",
    preview: "Hi! I was wondering if we could push the launch date by a week? We need more time for internal review. Let me know if that works.",
  },
  {
    id: "4",
    type: "client_request",
    mode: "serve",
    urgency: "unread",
    state: "inbox",
    title: "New request submitted",
    subtitle: "Additional landing page",
    client_id: "c3",
    client_name: "Gamma Ltd",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000),
    href: "/bridge/requests/r1",
    source_table: "client_requests",
    source_id: "r1",
    preview: "The client has submitted a new request for an additional landing page for their upcoming product launch.",
  },
  {
    id: "5",
    type: "seo_alert",
    mode: "strategy",
    urgency: "alert",
    state: "inbox",
    title: "SEO score dropped to 45",
    subtitle: "Performance degradation detected",
    client_id: "c2",
    client_name: "Beta Inc",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000),
    href: "/strategy/seo/alerts/sa1",
    source_table: "seo_alerts",
    source_id: "sa1",
    preview: "The website's Lighthouse performance score has dropped from 78 to 45. Large images and render-blocking scripts detected.",
  },
  {
    id: "6",
    type: "portal_activity",
    mode: "serve",
    urgency: "alert",
    state: "inbox",
    title: "Client inactive for 14 days",
    subtitle: "No portal activity",
    client_id: "c4",
    client_name: "Delta Co",
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    href: "/studio/clients/c4",
    source_table: "clients",
    source_id: "c4",
    preview: "This client hasn't logged into the Bridge portal in 14 days. Consider reaching out to check on their progress.",
  },
  {
    id: "7",
    type: "meeting",
    mode: "studio",
    urgency: "today",
    state: "inbox",
    title: "Weekly sync",
    subtitle: "Google Meet at 2:00 PM",
    client_id: "c1",
    client_name: "Acme Corp",
    created_at: new Date(),
    href: "/studio/calendar?event=e1",
    source_table: "meetings",
    source_id: "e1",
    preview: "Weekly project sync meeting. Agenda: Progress review, blockers discussion, next steps.",
  },
  {
    id: "8",
    type: "intelligence",
    mode: "strategy",
    urgency: "new",
    state: "inbox",
    title: "Competitor launched v2.0",
    subtitle: "Acme's main competitor released major update",
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
    href: "/strategy/intelligence/i1",
    source_table: "intelligence_events",
    source_id: "i1",
    preview: "CompetitorX just launched their v2.0 with new AI features. This could affect positioning for Acme's upcoming release.",
  },
  {
    id: "9",
    type: "portal_activity",
    mode: "serve",
    urgency: "new",
    state: "inbox",
    title: "Client viewed proposal",
    subtitle: "Proposal viewed 3 times",
    client_id: "c3",
    client_name: "Gamma Ltd",
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    href: "/strategy/proposals/102",
    source_table: "proposals",
    source_id: "102",
    preview: "The client has viewed the proposal 3 times in the last hour. They may be ready to make a decision.",
  },
  {
    id: "10",
    type: "milestone",
    mode: "studio",
    urgency: "pending",
    state: "inbox",
    title: "Design review due Friday",
    subtitle: "Awaiting client feedback",
    client_id: "c1",
    client_name: "Acme Corp",
    project_id: "p1",
    project_name: "Website Redesign",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    href: "/studio/projects/p1/milestones/m1",
    source_table: "milestones",
    source_id: "m1",
    preview: "The design review milestone is due on Friday. The client needs to provide feedback on the mockups.",
  },
];

/**
 * InboxPageClient - Main inbox page with all interactive features
 */
export function InboxPageClient() {
  const router = useRouter();

  // State
  const [currentState, setCurrentState] = useState<InboxState>("inbox");
  const [currentMode, setCurrentMode] = useState<InboxMode | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<InboxItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query) ||
          item.client_name?.toLowerCase().includes(query) ||
          item.project_name?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [currentState, currentMode, searchQuery]);

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
    // TODO: Call server action
  }, []);

  const handleSnooze = useCallback((date: Date) => {
    console.log("Snooze until:", date, "Item:", snoozePopover.itemId);
    setSnoozePopover({ isOpen: false, position: { x: 0, y: 0 }, itemId: null });
    // TODO: Call server action
  }, [snoozePopover.itemId]);

  const handleItemClick = useCallback((item: InboxItem) => {
    setPreviewItem(item);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: InboxItem) => {
      e.preventDefault();
      setContextMenu({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        item,
      });
    },
    []
  );

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
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            onSearch={setSearchQuery}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          <InboxList
            items={filteredItems}
            currentState={currentState}
            selectedIds={selectedIds}
            focusedId={focusedId}
            hasFilters={currentMode !== "all" || !!searchQuery}
            onSelect={handleSelect}
            onFocus={setFocusedId}
            onItemClick={handleItemClick}
            onArchive={(id) => handleArchive([id])}
            onSnooze={handleSnoozeOpen}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>

      {/* Preview Panel */}
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
