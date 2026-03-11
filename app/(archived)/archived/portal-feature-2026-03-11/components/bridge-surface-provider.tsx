"use client";

import { useEffect, useState, ReactNode } from "react";

interface BridgeSurfaceProviderProps {
  children: ReactNode;
}

const BRIDGE_THEME_KEY = "salt-bridge-theme";

/**
 * BridgeSurfaceProvider - Creates isolated light-mode context for Bridge
 *
 * The Bridge (client portal) is designed to be:
 * - Light mode by default (professional, clean for external clients)
 * - Switchable to dark if user prefers
 * - White-label friendly (studios customize for their brand)
 * - More spacious than the Dashboard (less dense, more approachable)
 *
 * IMPORTANT: This provider creates an ISOLATED theme context.
 * It does NOT affect the global theme (dashboard stays in user's preferred theme).
 * The Bridge theme is stored separately in 'salt-bridge-theme'.
 */
export function BridgeSurfaceProvider({ children }: BridgeSurfaceProviderProps) {
  const [bridgeTheme, setBridgeTheme] = useState<"light" | "dark">("light");

  // Load Bridge-specific theme preference on mount
  useEffect(() => {
    const stored = localStorage.getItem(BRIDGE_THEME_KEY);
    if (stored === "light" || stored === "dark") {
      setBridgeTheme(stored);
    } else {
      // First visit to Bridge, default to light
      localStorage.setItem(BRIDGE_THEME_KEY, "light");
    }
  }, []);

  return (
    <div
      data-surface="bridge"
      className={`min-h-screen ${bridgeTheme}`}
      data-theme={bridgeTheme}
    >
      {children}
    </div>
  );
}

/**
 * Hook to toggle Bridge theme (saves to Bridge-specific storage)
 */
export function useBridgeTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem(BRIDGE_THEME_KEY);
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setThemeState(newTheme);
    localStorage.setItem(BRIDGE_THEME_KEY, newTheme);

    // Update the bridge surface container
    const bridgeSurface = document.querySelector('[data-surface="bridge"]');
    if (bridgeSurface) {
      bridgeSurface.classList.remove("light", "dark");
      bridgeSurface.classList.add(newTheme);
      bridgeSurface.setAttribute("data-theme", newTheme);
    }
  };

  return { theme, toggleTheme };
}
