"use client";

import { useEffect, ReactNode } from "react";
import { useTheme } from "@/app/_components/theme-provider";

interface BridgeSurfaceProviderProps {
  children: ReactNode;
}

const BRIDGE_THEME_KEY = "salt-bridge-theme";

/**
 * BridgeSurfaceProvider - Defaults to light mode and applies Bridge surface tokens
 *
 * The Bridge (client portal) is designed to be:
 * - Light mode by default (professional, clean for external clients)
 * - Switchable to dark if user prefers
 * - White-label friendly (studios customize for their brand)
 * - More spacious than the Dashboard (less dense, more approachable)
 *
 * This provider:
 * 1. Defaults to light mode on first Bridge visit
 * 2. Allows user to switch themes (persisted separately from Dashboard)
 * 3. Wraps children in a data-surface="bridge" container for CSS token overrides
 */
export function BridgeSurfaceProvider({ children }: BridgeSurfaceProviderProps) {
  const { setTheme } = useTheme();

  // On first mount, check if user has a Bridge-specific theme preference
  // If not, default to light mode
  useEffect(() => {
    const bridgeTheme = localStorage.getItem(BRIDGE_THEME_KEY);

    if (bridgeTheme === "light" || bridgeTheme === "dark") {
      // User has a Bridge preference, apply it
      setTheme(bridgeTheme);
    } else {
      // First visit to Bridge, default to light
      setTheme("light");
      localStorage.setItem(BRIDGE_THEME_KEY, "light");
    }
  }, [setTheme]);

  return (
    <div data-surface="bridge" className="min-h-screen">
      {children}
    </div>
  );
}

/**
 * Hook to toggle Bridge theme (saves to Bridge-specific storage)
 */
export function useBridgeTheme() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem(BRIDGE_THEME_KEY, newTheme);
  };

  return { theme, toggleTheme };
}
