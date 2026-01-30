import type { DashboardMode } from "../types/mode";
import type { RecentItem } from "../types/recents";
import {
  RECENTS_STORAGE_KEYS,
  MAX_RECENTS_PER_MODE,
} from "../types/recents";

/**
 * Get recents for a specific mode from localStorage
 */
export function getRecentsForMode(mode: DashboardMode): RecentItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(RECENTS_STORAGE_KEYS[mode]);
    if (!stored) return [];
    return JSON.parse(stored) as RecentItem[];
  } catch (e) {
    console.error(`Failed to parse recents for mode ${mode}:`, e);
    return [];
  }
}

/**
 * Save recents for a specific mode to localStorage
 */
export function saveRecentsForMode(
  mode: DashboardMode,
  recents: RecentItem[]
): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(RECENTS_STORAGE_KEYS[mode], JSON.stringify(recents));
  } catch (e) {
    console.error(`Failed to save recents for mode ${mode}:`, e);
  }
}

/**
 * Add an item to recents for a specific mode
 * - Removes any existing entry with the same id
 * - Adds the new item at the beginning
 * - Trims to MAX_RECENTS_PER_MODE
 */
export function addToRecents(item: Omit<RecentItem, "lastVisited">): void {
  if (typeof window === "undefined") return;

  const { mode } = item;
  const recents = getRecentsForMode(mode);

  // Create the full item with timestamp
  const newItem: RecentItem = {
    ...item,
    lastVisited: new Date().toISOString(),
  };

  // Remove any existing entry with the same id
  const filtered = recents.filter((r) => r.id !== item.id);

  // Add new item at the beginning and trim
  const updated = [newItem, ...filtered].slice(0, MAX_RECENTS_PER_MODE);

  saveRecentsForMode(mode, updated);

  // Dispatch custom event so other components can react
  window.dispatchEvent(
    new CustomEvent("salt-recents-updated", {
      detail: { mode },
    })
  );
}

/**
 * Remove an item from recents by id
 */
export function removeFromRecents(mode: DashboardMode, id: string): void {
  if (typeof window === "undefined") return;

  const recents = getRecentsForMode(mode);
  const filtered = recents.filter((r) => r.id !== id);
  saveRecentsForMode(mode, filtered);

  window.dispatchEvent(
    new CustomEvent("salt-recents-updated", {
      detail: { mode },
    })
  );
}

/**
 * Clear all recents for a specific mode
 */
export function clearRecentsForMode(mode: DashboardMode): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(RECENTS_STORAGE_KEYS[mode]);

  window.dispatchEvent(
    new CustomEvent("salt-recents-updated", {
      detail: { mode },
    })
  );
}

/**
 * Clear all recents across all modes
 */
export function clearAllRecents(): void {
  if (typeof window === "undefined") return;

  Object.values(RECENTS_STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });

  window.dispatchEvent(
    new CustomEvent("salt-recents-updated", {
      detail: { mode: null },
    })
  );
}
