"use client";

/**
 * SidebarContext STUB
 *
 * The custom SidebarContext has been replaced by shadcn's SidebarProvider.
 * This stub provides backward compatibility for deprecated files.
 *
 * The full implementation is preserved in _deprecated/SidebarContext.tsx
 */

import { createContext, useContext, type ReactNode } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  isMobile: boolean;
  isXl: boolean;
  isLoaded: boolean;
  toggle: () => void;
  closeMobile: () => void;
  rightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

/**
 * @deprecated Use shadcn SidebarProvider from @repo/ui instead
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  // Stub - returns children without providing context
  // This satisfies TypeScript but new code should use @repo/ui's SidebarProvider
  const value: SidebarContextValue = {
    collapsed: false,
    mobileOpen: false,
    isMobile: false,
    isXl: true,
    isLoaded: true,
    toggle: () => {},
    closeMobile: () => {},
    rightSidebarOpen: false,
    toggleRightSidebar: () => {},
  };

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

/**
 * @deprecated Use useSidebar from @repo/ui instead
 */
export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    // Return stub values for backward compatibility
    return {
      collapsed: false,
      mobileOpen: false,
      isMobile: false,
      isXl: true,
      isLoaded: true,
      toggle: () => {},
      closeMobile: () => {},
      rightSidebarOpen: false,
      toggleRightSidebar: () => {},
    };
  }
  return context;
}
