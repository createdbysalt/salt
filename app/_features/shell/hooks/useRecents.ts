"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardMode } from "../types/mode";
import type { RecentItem } from "../types/recents";
import {
  getRecentsForMode,
  addToRecents as addToRecentsStorage,
  removeFromRecents as removeFromRecentsStorage,
  clearRecentsForMode as clearRecentsStorage,
} from "../utils/recents-storage";

interface UseRecentsOptions {
  mode: DashboardMode;
  limit?: number;
}

interface UseRecentsReturn {
  recents: RecentItem[];
  isLoading: boolean;
  addRecent: (item: Omit<RecentItem, "lastVisited" | "mode">) => void;
  removeRecent: (id: string) => void;
  clearRecents: () => void;
}

/**
 * Hook to manage recents for a specific dashboard mode
 *
 * @param options.mode - The dashboard mode to get recents for
 * @param options.limit - Max number of recents to return (default: 5)
 */
export function useRecents({
  mode,
  limit = 5,
}: UseRecentsOptions): UseRecentsReturn {
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load recents on mount and when mode changes
  useEffect(() => {
    const loadRecents = () => {
      const items = getRecentsForMode(mode);
      setRecents(items.slice(0, limit));
      setIsLoading(false);
    };

    loadRecents();

    // Listen for updates from other components
    const handleUpdate = (event: CustomEvent<{ mode: DashboardMode | null }>) => {
      if (event.detail.mode === null || event.detail.mode === mode) {
        loadRecents();
      }
    };

    window.addEventListener(
      "salt-recents-updated",
      handleUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "salt-recents-updated",
        handleUpdate as EventListener
      );
    };
  }, [mode, limit]);

  const addRecent = useCallback(
    (item: Omit<RecentItem, "lastVisited" | "mode">) => {
      addToRecentsStorage({ ...item, mode });
    },
    [mode]
  );

  const removeRecent = useCallback(
    (id: string) => {
      removeFromRecentsStorage(mode, id);
    },
    [mode]
  );

  const clearRecents = useCallback(() => {
    clearRecentsStorage(mode);
  }, [mode]);

  return {
    recents,
    isLoading,
    addRecent,
    removeRecent,
    clearRecents,
  };
}

/**
 * Hook to track page visits and add them to recents
 * Call this from pages/layouts to automatically track visits
 */
export function useTrackRecentVisit(item: Omit<RecentItem, "lastVisited"> | null) {
  useEffect(() => {
    if (item) {
      addToRecentsStorage(item);
    }
  }, [item?.id]); // Only track when id changes (initial visit)
}
