"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  type DashboardMode,
  DEFAULT_MODE,
  STORAGE_KEY,
  MODE_CHANGE_EVENT,
} from "../types/mode";

/**
 * Detect mode from current pathname
 * Returns null if path doesn't map to a specific mode
 */
function getModeFromPath(pathname: string): DashboardMode | null {
  if (pathname.startsWith("/dashboard/intelligence")) return "strategy";
  if (pathname.startsWith("/dashboard/serve")) return "serve";
  return null; // Don't override stored mode for other paths
}

/**
 * Broadcast mode change to other tabs/components
 */
function broadcastModeChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MODE_CHANGE_EVENT));
  }
}

/**
 * Hook for managing dashboard mode state
 * - Persists to localStorage
 * - Syncs across tabs
 * - Auto-detects mode from URL
 */
export function useDashboardMode() {
  const [activeMode, setActiveMode] = useState<DashboardMode>(DEFAULT_MODE);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (
            parsed === "strategy" ||
            parsed === "studio" ||
            parsed === "serve"
          ) {
            setActiveMode(parsed);
          }
        } catch (e) {
          console.error("Failed to parse dashboard mode:", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  // Auto-detect mode from URL changes
  useEffect(() => {
    const detectedMode = getModeFromPath(pathname);
    if (detectedMode && detectedMode !== activeMode) {
      setActiveMode(detectedMode);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(detectedMode));
      broadcastModeChange();
    }
  }, [pathname, activeMode]);

  // Listen for changes from other tabs/components
  useEffect(() => {
    const handleModeChange = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (
              parsed === "strategy" ||
              parsed === "studio" ||
              parsed === "serve"
            ) {
              setActiveMode(parsed);
            }
          } catch (e) {
            console.error("Failed to parse dashboard mode:", e);
          }
        }
      }
    };

    // Listen for custom event (same tab) and storage event (other tabs)
    window.addEventListener(MODE_CHANGE_EVENT, handleModeChange);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        handleModeChange();
      }
    });

    return () => {
      window.removeEventListener(MODE_CHANGE_EVENT, handleModeChange);
      window.removeEventListener("storage", handleModeChange);
    };
  }, []);

  // Set mode and persist
  const setMode = useCallback((mode: DashboardMode) => {
    setActiveMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
      broadcastModeChange();
    }
  }, []);

  return {
    activeMode,
    setMode,
    isLoaded,
  };
}
