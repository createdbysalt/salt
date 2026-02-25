"use client";

import { ChevronRight, Plus } from "lucide-react";
import { Button, Separator, SidebarTrigger } from "@repo/ui";

interface ClientsLayoutProps {
  children: React.ReactNode;
}

/**
 * Clients Header - Shows breadcrumb that updates when a client is selected
 * Currently shows "Clients" as the root, ready for client name to be added
 */
function ClientsBreadcrumbHeader() {
  // TODO: Add client context for selected client breadcrumb
  const selectedClient = null;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 shrink-0"
        />
        <nav className="flex items-center gap-1 text-sm min-w-0">
          <span className={selectedClient ? "text-muted-foreground" : "font-medium"}>
            Clients
          </span>
          {selectedClient && (
            <>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{selectedClient}</span>
            </>
          )}
        </nav>
      </div>

      <div className="ml-auto">
        <Button size="xs" variant="secondary" className="px-4">
          <Plus className="size-3" />
          Client
        </Button>
      </div>
    </header>
  );
}

/**
 * Clients Layout - Custom layout with breadcrumb header
 * Overrides the default SiteHeader for clients routes
 */
export default function ClientsLayout({ children }: ClientsLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <ClientsBreadcrumbHeader />
      {/* Content */}
      <div className="relative flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
