"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useDashboardMode } from "../hooks/useDashboardMode";
import { useGlobalHotkeys } from "../hooks/useGlobalHotkeys";
import type { DashboardMode } from "../types/mode";

interface DashboardModeContextValue {
  activeMode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  isLoaded: boolean;
}

const DashboardModeContext = createContext<DashboardModeContextValue | null>(
  null
);

/**
 * Provider for dashboard mode state
 * Wraps the dashboard shell and provides mode switching functionality
 */
export function DashboardModeProvider({ children }: { children: ReactNode }) {
  const { activeMode, setMode, isLoaded } = useDashboardMode();

  // Register global keyboard shortcuts for mode switching
  useGlobalHotkeys([
    {
      key: "1",
      metaKey: true,
      callback: () => setMode("strategy"),
    },
    {
      key: "2",
      metaKey: true,
      callback: () => setMode("studio"),
    },
    {
      key: "3",
      metaKey: true,
      callback: () => setMode("serve"),
    },
  ]);

  return (
    <DashboardModeContext.Provider value={{ activeMode, setMode, isLoaded }}>
      {children}
    </DashboardModeContext.Provider>
  );
}

/**
 * Hook to access dashboard mode context
 * Must be used within DashboardModeProvider
 */
export function useDashboardModeContext() {
  const context = useContext(DashboardModeContext);
  if (context === null) {
    throw new Error(
      "useDashboardModeContext must be used within DashboardModeProvider"
    );
  }
  return context;
}

/**
 * Safe hook to access dashboard mode context
 * Returns default values if context is not available (SSR, outside provider)
 * Use this in components that may render before the provider is ready
 */
export function useDashboardModeContextSafe(): DashboardModeContextValue {
  const context = useContext(DashboardModeContext);
  if (context === null) {
    return {
      activeMode: "studio",
      setMode: () => {},
      isLoaded: false,
    };
  }
  return context;
}
