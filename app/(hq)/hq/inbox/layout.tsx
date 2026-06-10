"use client";

import Link from "next/link";
import { ChevronRight, Menu, Settings } from "lucide-react";
import { Button, Separator } from "@repo/ui";
import { InboxProvider, useInbox } from "@/app/_features/inbox/contexts/InboxContext";
import { useDashboardShell } from "@/app/_features/shell/contexts/DashboardShellContext";

/**
 * Inbox Header - Shows breadcrumb that updates when item is selected
 * Shows "Inbox" or "Done" based on current view mode
 */
function InboxBreadcrumbHeader() {
  const { selectedItem, viewMode } = useInbox();
  const dashboardShell = useDashboardShell();

  // Determine the root label based on view mode
  const rootLabel = viewMode === "done" ? "Done" : "Inbox";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-2 px-4 min-w-0">
        <button
          type="button"
          onClick={() => dashboardShell?.openMobileMenu()}
          className="-ml-1 grid size-8 shrink-0 place-items-center rounded-lg hover:bg-muted md:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-4" strokeWidth={1.75} />
        </button>
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

        <div className="ml-auto shrink-0">
          <Button size="xs" variant="secondary" asChild>
            <Link href="/settings/notifications">
              <Settings className="size-3" />
              Notification Settings
            </Link>
          </Button>
        </div>
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
