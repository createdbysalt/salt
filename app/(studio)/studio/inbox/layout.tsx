"use client";

import { ChevronRight } from "lucide-react";
import { Separator, SidebarTrigger } from "@repo/ui";
import { InboxProvider, useInbox } from "@/app/_features/inbox/contexts/InboxContext";

/**
 * Inbox Header - Shows breadcrumb that updates when item is selected
 * Shows "Inbox" or "Done" based on current view mode
 */
function InboxBreadcrumbHeader() {
  const { selectedItem, viewMode } = useInbox();

  // Determine the root label based on view mode
  const rootLabel = viewMode === "done" ? "Done" : "Inbox";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-4 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 shrink-0"
        />
        <nav className="flex items-center gap-1 text-sm min-w-0">
          <span className={selectedItem ? "text-muted-foreground" : "font-medium"}>
            {rootLabel}
          </span>
          {selectedItem && (
            <>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{selectedItem.title}</span>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/**
 * Inbox Layout - Custom layout with breadcrumb header
 * Overrides the default SiteHeader for inbox routes
 */
export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <InboxProvider>
      <div className="flex h-full flex-col">
        <InboxBreadcrumbHeader />
        {/* Content */}
        <div className="relative flex-1 overflow-hidden">{children}</div>
      </div>
    </InboxProvider>
  );
}
