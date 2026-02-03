"use client";

import { AppShell } from "@/app/_components/patterns/app-shell";
import { useSidebar } from "@/app/_features/shell/contexts/SidebarContext";
import { ModeRightSidebar, RightSidebarLabel } from "./sidebar/ModeRightSidebar";
import { Button } from "@/app/_components/ui/button";
import { PanelLeft, PanelRight } from "lucide-react";
import * as React from "react";

interface DashboardShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

/**
 * DashboardShell - Claude Desktop-inspired layout wrapper
 *
 * Full-height sidebar layout without top header bar.
 * Logo, navigation, and user profile all live in the sidebar.
 * On mobile: sidebar hidden, shown as overlay drawer when triggered.
 *
 * Right sidebar is mode-aware:
 * - Strategy: Generation Queue, Recent Insights, Research Context
 * - Studio: This Week Stats, Active Alerts, Quick Actions
 * - Serve: Portal Status, Preview Controls, Client Activity
 */
export function DashboardShell({ children, sidebar }: DashboardShellProps) {
  const { collapsed, mobileOpen, isMobile, isXl, toggle, closeMobile, isLoaded, rightSidebarOpen, toggleRightSidebar } = useSidebar();

  // Mobile menu trigger button
  const mobileMenuTrigger = (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-8 w-8"
    >
      <PanelLeft className="h-5 w-5" />
    </Button>
  );

  // Right sidebar toggle button (Claude Desktop style)
  const rightSidebarToggle = (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleRightSidebar}
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
    >
      <PanelRight className="h-5 w-5" />
    </Button>
  );

  // Don't render with transition until loaded, but always include mobileMenuTrigger
  // so CSS can show it on mobile screens before JS hydration
  if (!isLoaded) {
    return (
      <AppShell
        sidebar={sidebar}
        mobileMenuTrigger={mobileMenuTrigger}
        rightSidebar={<ModeRightSidebar />}
        rightSidebarToggle={rightSidebarToggle}
        rightSidebarLabel={<RightSidebarLabel />}
        isXl={false}
      >
        {children}
      </AppShell>
    );
  }

  return (
    <AppShell
      sidebar={sidebar}
      sidebarCollapsed={collapsed}
      mobileOpen={mobileOpen}
      isMobile={isMobile}
      isXl={isXl}
      onMobileClose={closeMobile}
      mobileMenuTrigger={mobileMenuTrigger}
      rightSidebar={<ModeRightSidebar />}
      rightSidebarOpen={rightSidebarOpen}
      rightSidebarToggle={rightSidebarToggle}
      rightSidebarLabel={<RightSidebarLabel />}
    >
      {children}
    </AppShell>
  );
}
