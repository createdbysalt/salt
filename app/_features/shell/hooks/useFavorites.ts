"use client";

import { useState, useEffect, useCallback } from "react";
import type { FavoriteItem } from "../types/favorites";
import { MAX_FAVORITES_DISPLAYED } from "../types/favorites";
import {
  getFavorites,
  addToFavorites as addToFavoritesStorage,
  removeFromFavorites as removeFromFavoritesStorage,
  isFavorited as isFavoritedStorage,
  toggleFavorite as toggleFavoriteStorage,
  clearAllFavorites as clearAllFavoritesStorage,
} from "../utils/favorites-storage";

interface UseFavoritesOptions {
  limit?: number;
}

interface UseFavoritesReturn {
  favorites: FavoriteItem[];
  isLoading: boolean;
  addFavorite: (item: Omit<FavoriteItem, "favoritedAt">) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (item: Omit<FavoriteItem, "favoritedAt">) => boolean;
  isFavorited: (id: string) => boolean;
  clearFavorites: () => void;
}

/**
 * Hook to manage favorites (cross-mode)
 *
 * @param options.limit - Max number of favorites to return (default: MAX_FAVORITES_DISPLAYED)
 */
export function useFavorites({
  limit = MAX_FAVORITES_DISPLAYED,
}: UseFavoritesOptions = {}): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites on mount
  useEffect(() => {
    const loadFavorites = () => {
      const items = getFavorites();
      setFavorites(items.slice(0, limit));
      setIsLoading(false);
    };

    loadFavorites();

    // Listen for updates from other components
    const handleUpdate = () => {
      loadFavorites();
    };

    window.addEventListener("salt-favorites-updated", handleUpdate);

    return () => {
      window.removeEventListener("salt-favorites-updated", handleUpdate);
    };
  }, [limit]);

  const addFavorite = useCallback(
    (item: Omit<FavoriteItem, "favoritedAt">) => {
      addToFavoritesStorage(item);
    },
    []
  );

  const removeFavorite = useCallback((id: string) => {
    removeFromFavoritesStorage(id);
  }, []);

  const toggleFavorite = useCallback(
    (item: Omit<FavoriteItem, "favoritedAt">) => {
      return toggleFavoriteStorage(item);
    },
    []
  );

  const isFavorited = useCallback((id: string) => {
    return isFavoritedStorage(id);
  }, []);

  const clearFavorites = useCallback(() => {
    clearAllFavoritesStorage();
  }, []);

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorited,
    clearFavorites,
  };
}

/**
 * Hook to check and toggle favorite status for a single item
 * Lighter weight than useFavorites when you only need toggle functionality
 */
export function useFavoriteStatus(itemId: string) {
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    // Check initial status
    setIsFavorited(isFavoritedStorage(itemId));

    // Listen for updates
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.itemId === itemId || detail.action === "clear") {
        setIsFavorited(isFavoritedStorage(itemId));
      }
    };

    window.addEventListener("salt-favorites-updated", handleUpdate);

    return () => {
      window.removeEventListener("salt-favorites-updated", handleUpdate);
    };
  }, [itemId]);

  const toggle = useCallback(
    (item: Omit<FavoriteItem, "favoritedAt">) => {
      const newStatus = toggleFavoriteStorage(item);
      setIsFavorited(newStatus);
      return newStatus;
    },
    []
  );

  return { isFavorited, toggle };
}
