"use client";

import { cn } from "@repo/utils";
import * as React from "react";

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  rightSidebar?: React.ReactNode;
  rightSidebarOpen?: boolean;
  rightSidebarToggle?: React.ReactNode;
  isXl?: boolean; // Whether viewport is xl+ (1280px+) for right sidebar visibility
  statusBar?: React.ReactNode;
  className?: string;
  sidebarCollapsed?: boolean;
  mobileOpen?: boolean;
  isMobile?: boolean;
  onMobileClose?: () => void;
  mobileMenuTrigger?: React.ReactNode;
  /** Surface type for design system token overrides. Defaults to "dashboard". */
  surface?: "dashboard" | "bridge";
}

/**
 * AppShell - Claude Desktop-inspired full-height sidebar layout
 *
 * Layout structure:
 * - Full-height sidebar (left) - hidden on mobile, overlay when open
 * - Main content area (center)
 * - Optional right sidebar (right)
 * - Optional status bar (bottom)
 */
export function AppShell({
  children,
  sidebar,
  rightSidebar,
  rightSidebarOpen = true,
  rightSidebarToggle,
  isXl = false,
  statusBar,
  className,
  sidebarCollapsed = false,
  mobileOpen = false,
  isMobile = false,
  onMobileClose,
  mobileMenuTrigger,
  surface = "dashboard",
}: AppShellProps) {
  return (
    <div
      data-surface={surface}
      className={cn("flex h-screen overflow-hidden", className)}
    >
      {/* Mobile Overlay Backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Left Sidebar - Full Height */}
      {/* Mobile: fixed overlay. Desktop: static in layout */}
      <aside
        className={cn(
          "bg-sidebar flex flex-col border-r border-border transition-all duration-200 ease-in-out",
          isMobile
            ? "fixed inset-y-0 left-0 z-50"
            : "relative shrink-0"
        )}
        style={
          isMobile
            ? { width: 288, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)' }
            : { width: sidebarCollapsed ? 64 : 288 }
        }
      >
        {sidebar}
      </aside>

      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile header with menu trigger - CSS-based visibility */}
        {mobileMenuTrigger && (
          <div className="shrink-0 border-b border-border bg-sidebar px-4 py-3 lg:hidden">
            {mobileMenuTrigger}
          </div>
        )}

        {/* Right sidebar toggle button - fixed in top right corner (xl+ only) */}
        {rightSidebarToggle && rightSidebar && isXl && (
          <div className="absolute top-4 right-4 z-10">
            {rightSidebarToggle}
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-12 lg:py-10">
            {children}
          </div>
        </main>

        {/* Status Bar (optional) */}
        {statusBar && (
          <div className="border-t border-border bg-topbar shrink-0">
            {statusBar}
          </div>
        )}
      </div>

      {/* Right Sidebar - Ambient Intelligence (optional, xl+ only) */}
      {rightSidebar && isXl && (
        <aside
          className={cn(
            "border-l border-border bg-sidebar shrink-0 flex flex-col transition-all duration-200 ease-in-out",
            rightSidebarOpen ? "overflow-y-auto" : "border-l-0 overflow-hidden"
          )}
          style={{ width: rightSidebarOpen ? 288 : 0 }}
        >
          <div
            className="transition-opacity duration-200"
            style={{ width: 288, opacity: rightSidebarOpen ? 1 : 0 }}
          >
            {rightSidebar}
          </div>
        </aside>
      )}
    </div>
  );
}
