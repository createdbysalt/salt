"use client";

import { cn } from "@repo/utils";
import { Button } from "@repo/ui";
import { Menu } from "lucide-react";
import * as React from "react";

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  rightSidebar?: React.ReactNode;
  statusBar?: React.ReactNode;
  className?: string;
  sidebarCollapsed?: boolean;
}

export function AppShell({ children, sidebar, header, rightSidebar, statusBar, className, sidebarCollapsed = false }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className={cn("flex h-screen flex-col overflow-hidden", className)}>
      {/* Header - Full Width at Top */}
      {header && (
        <header className="sticky top-0 z-30 border-b border-border bg-topbar">
          <div className="flex h-16 items-center">
            {/* Logo - Fixed on far left, always visible */}
            <div className="flex items-center shrink-0 px-6 lg:px-8 transition-all duration-200 ease-in-out"
                 style={{ minWidth: '140px' }}>
              <img
                src="/salt-logo-black.png"
                alt="Salt"
                className="h-8 w-auto dark:hidden"
              />
              <img
                src="/salt-logo-white.png"
                alt="Salt"
                className="h-8 w-auto hidden dark:block"
              />
            </div>

            {/* Rest of header content - search bar and actions */}
            <div
              className="flex flex-1 items-center gap-4 pr-6 lg:pr-8 transition-all duration-200 ease-in-out"
              style={{
                marginLeft: sidebarCollapsed ? '0px' : 'calc(256px - 140px)'
              }}
            >
              {header}
            </div>
          </div>
        </header>
      )}

      {/* Content Area with Sidebar(s) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Primary Navigation */}
        <aside
          className={cn(
            "border-r border-border bg-sidebar transition-all duration-200 ease-in-out shrink-0",
            sidebarCollapsed ? "w-24" : "w-64"
          )}
        >
          {sidebar}
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-12 lg:py-10">{children}</div>
        </main>

        {/* Right Sidebar - Ambient Intelligence (optional) */}
        {rightSidebar && (
          <aside className="w-80 border-l border-border bg-sidebar overflow-y-auto shrink-0 hidden xl:block">
            {rightSidebar}
          </aside>
        )}
      </div>

      {/* Status Bar (optional) */}
      {statusBar && (
        <div className="border-t border-border bg-topbar">
          {statusBar}
        </div>
      )}
    </div>
  );
}
