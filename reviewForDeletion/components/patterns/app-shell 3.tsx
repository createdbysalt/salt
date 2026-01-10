"use client";

import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export function AppShell({ children, sidebar, header, className }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className={cn("flex h-screen overflow-hidden", className)}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        {header && (
          <header className="sticky top-0 z-30 border-b border-topbar-border bg-topbar">
            <div className="flex h-16 items-center gap-4 px-6 lg:px-8">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
              {header}
            </div>
          </header>
        )}

        {/* Page content - more generous padding following inspiration */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-12 lg:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

