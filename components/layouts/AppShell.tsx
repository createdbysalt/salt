import * as React from "react";
import { cn } from "@repo/utils";

interface AppShellProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * AppShell - Main layout structure matching reference design
 * Fixed left sidebar + top header + scrollable content area
 */
export function AppShell({
  sidebar,
  header,
  children,
  className,
}: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Fixed Sidebar */}
      <aside
        className="h-full overflow-y-auto bg-card border-r border-border/50"
        style={{ width: "var(--sidebar-width)" }}
      >
        {sidebar}
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Fixed Header */}
        <header
          className="border-b border-border/50 bg-background"
          style={{ height: "var(--header-height)" }}
        >
          {header}
        </header>

        {/* Scrollable Content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto bg-background",
            className
          )}
        >
          <div
            className="mx-auto w-full h-full"
            style={{
              maxWidth: "var(--content-max-width)",
              padding: "var(--content-padding)",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

