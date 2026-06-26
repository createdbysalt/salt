"use client";

import { useState, useEffect, useCallback } from "react";
import type { RecentItem } from "../types/recents";
import {
  getRecents,
  addToRecents as addToRecentsStorage,
  removeFromRecents as removeFromRecentsStorage,
  clearAllRecents as clearRecentsStorage,
} from "../utils/recents-storage";

interface UseRecentsOptions {
  limit?: number;
}

interface UseRecentsReturn {
  recents: RecentItem[];
  isLoading: boolean;
  addRecent: (item: Omit<RecentItem, "lastVisited">) => void;
  removeRecent: (id: string) => void;
  clearRecents: () => void;
}

/**
 * Hook to manage recents
 *
 * @param options.limit - Max number of recents to return (default: 5)
 */
export function useRecents({
  limit = 5,
}: UseRecentsOptions = {}): UseRecentsReturn {
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load recents on mount and when storage changes
  useEffect(() => {
    const loadRecents = () => {
      const items = getRecents();
      setRecents(items.slice(0, limit));
      setIsLoading(false);
    };

    loadRecents();

    // Listen for updates from other components
    const handleUpdate = () => loadRecents();

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
  }, [limit]);

  const addRecent = useCallback(
    (item: Omit<RecentItem, "lastVisited">) => {
      addToRecentsStorage(item);
    },
    []
  );

  const removeRecent = useCallback(
    (id: string) => {
      removeFromRecentsStorage(id);
    },
    []
  );

  const clearRecents = useCallback(() => {
    clearRecentsStorage();
  }, []);

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
