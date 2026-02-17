import type { FavoriteItem } from "../types/favorites";
import {
  FAVORITES_STORAGE_KEY,
  MAX_FAVORITES,
} from "../types/favorites";

/**
 * Get all favorites from localStorage
 */
export function getFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as FavoriteItem[];
  } catch (e) {
    console.error("Failed to parse favorites:", e);
    return [];
  }
}

/**
 * Save favorites to localStorage
 */
export function saveFavorites(favorites: FavoriteItem[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.error("Failed to save favorites:", e);
  }
}

/**
 * Add an item to favorites
 * - Removes any existing entry with the same id
 * - Adds the new item at the beginning
 * - Trims to MAX_FAVORITES
 */
export function addToFavorites(item: Omit<FavoriteItem, "favoritedAt">): void {
  if (typeof window === "undefined") return;

  const favorites = getFavorites();

  // Create the full item with timestamp
  const newItem: FavoriteItem = {
    ...item,
    favoritedAt: new Date().toISOString(),
  };

  // Remove any existing entry with the same id
  const filtered = favorites.filter((f) => f.id !== item.id);

  // Add new item at the beginning and trim
  const updated = [newItem, ...filtered].slice(0, MAX_FAVORITES);

  saveFavorites(updated);

  // Dispatch custom event so other components can react
  window.dispatchEvent(
    new CustomEvent("salt-favorites-updated", {
      detail: { action: "add", itemId: item.id },
    })
  );
}

/**
 * Remove an item from favorites by id
 */
export function removeFromFavorites(id: string): void {
  if (typeof window === "undefined") return;

  const favorites = getFavorites();
  const filtered = favorites.filter((f) => f.id !== id);
  saveFavorites(filtered);

  window.dispatchEvent(
    new CustomEvent("salt-favorites-updated", {
      detail: { action: "remove", itemId: id },
    })
  );
}

/**
 * Check if an item is favorited
 */
export function isFavorited(id: string): boolean {
  if (typeof window === "undefined") return false;
  const favorites = getFavorites();
  return favorites.some((f) => f.id === id);
}

/**
 * Toggle favorite status for an item
 * Returns the new favorited state
 */
export function toggleFavorite(
  item: Omit<FavoriteItem, "favoritedAt">
): boolean {
  if (isFavorited(item.id)) {
    removeFromFavorites(item.id);
    return false;
  } else {
    addToFavorites(item);
    return true;
  }
}

/**
 * Reorder favorites (for drag-and-drop)
 */
export function reorderFavorites(fromIndex: number, toIndex: number): void {
  if (typeof window === "undefined") return;

  const favorites = getFavorites();
  if (fromIndex < 0 || fromIndex >= favorites.length) return;
  if (toIndex < 0 || toIndex >= favorites.length) return;

  const [removed] = favorites.splice(fromIndex, 1);
  favorites.splice(toIndex, 0, removed);

  saveFavorites(favorites);

  window.dispatchEvent(
    new CustomEvent("salt-favorites-updated", {
      detail: { action: "reorder" },
    })
  );
}

/**
 * Clear all favorites
 */
export function clearAllFavorites(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(FAVORITES_STORAGE_KEY);

  window.dispatchEvent(
    new CustomEvent("salt-favorites-updated", {
      detail: { action: "clear" },
    })
  );
}
