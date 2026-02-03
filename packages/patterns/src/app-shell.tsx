"use client";

import { cn } from "@repo/utils";
import * as React from "react";

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  rightSidebar?: React.ReactNode;
  rightSidebarOpen?: boolean;
  rightSidebarToggle?: React.ReactNode;
  rightSidebarLabel?: React.ReactNode;
  isXl?: boolean; // Whether viewport is xl+ (1280px+) for right sidebar visibility
  statusBar?: React.ReactNode;
  /** Content to render in the main header bar (left side) */
  headerContent?: React.ReactNode;
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
  rightSidebarLabel,
  isXl = false,
  statusBar,
  headerContent,
  className,
  sidebarCollapsed = false,
  mobileOpen = false,
  isMobile = false,
  onMobileClose,
  mobileMenuTrigger,
  surface = "dashboard",
}: AppShellProps) {
  const showRightSidebar = rightSidebar && isXl;

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

      {/* Main + Right Sidebar wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header with menu trigger */}
        {mobileMenuTrigger && (
          <div className="shrink-0 border-b border-border bg-sidebar px-4 py-3 lg:hidden">
            {mobileMenuTrigger}
          </div>
        )}

        {/* Desktop: Header row (only if headerContent exists) */}
        {headerContent && (
          <div className="hidden lg:flex shrink-0 h-[60px]">
            <div className="flex-1 flex items-center px-8">
              {headerContent}
            </div>
          </div>
        )}

        {/* Content row: Main + Right Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content area */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-[1600px] px-6 pt-10 pb-6 lg:px-8">
              {children}
            </div>
          </main>

          {/* Right Sidebar with header */}
          {showRightSidebar && (
            <aside
              className={cn(
                "shrink-0 flex flex-col transition-all duration-200 ease-in-out",
                rightSidebarOpen
                  ? "w-[288px] border-l border-border bg-sidebar"
                  : "w-[56px]"
              )}
            >
              {/* Right sidebar header - always visible */}
              <div
                className={cn(
                  "flex items-center h-[60px] shrink-0 transition-all duration-200 ease-in-out",
                  rightSidebarOpen ? "justify-between px-6" : "justify-center px-3"
                )}
              >
                {/* Label - hidden when collapsed */}
                {rightSidebarOpen && rightSidebarLabel && (
                  <div className="flex items-center whitespace-nowrap">
                    {rightSidebarLabel}
                  </div>
                )}
                {/* Toggle - always visible */}
                {rightSidebarToggle && (
                  <div className="shrink-0">
                    {rightSidebarToggle}
                  </div>
                )}
              </div>

              {/* Right sidebar content - collapses */}
              <div
                className={cn(
                  "flex-1 overflow-y-auto transition-opacity duration-200",
                  !rightSidebarOpen && "opacity-0 overflow-hidden"
                )}
              >
                {rightSidebar}
              </div>
            </aside>
          )}
        </div>

        {/* Status Bar (optional) */}
        {statusBar && (
          <div className="border-t border-border bg-topbar shrink-0">
            {statusBar}
          </div>
        )}
      </div>
    </div>
  );
}
