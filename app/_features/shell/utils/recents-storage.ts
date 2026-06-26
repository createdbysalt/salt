import type { RecentItem } from "../types/recents";
import {
  RECENTS_STORAGE_KEY,
  MAX_RECENTS,
} from "../types/recents";

/**
 * Get recents from localStorage
 */
export function getRecents(): RecentItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentItem[];
  } catch (e) {
    console.error("Failed to parse recents:", e);
    return [];
  }
}

/**
 * Save recents to localStorage
 */
export function saveRecents(recents: RecentItem[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
  } catch (e) {
    console.error("Failed to save recents:", e);
  }
}

/**
 * Add an item to recents
 * - Removes any existing entry with the same id
 * - Adds the new item at the beginning
 * - Trims to MAX_RECENTS
 */
export function addToRecents(item: Omit<RecentItem, "lastVisited">): void {
  if (typeof window === "undefined") return;

  const recents = getRecents();

  // Create the full item with timestamp
  const newItem: RecentItem = {
    ...item,
    lastVisited: new Date().toISOString(),
  };

  // Remove any existing entry with the same id
  const filtered = recents.filter((r) => r.id !== item.id);

  // Add new item at the beginning and trim
  const updated = [newItem, ...filtered].slice(0, MAX_RECENTS);

  saveRecents(updated);

  // Dispatch custom event so other components can react
  window.dispatchEvent(new CustomEvent("salt-recents-updated"));
}

/**
 * Remove an item from recents by id
 */
export function removeFromRecents(id: string): void {
  if (typeof window === "undefined") return;

  const recents = getRecents();
  const filtered = recents.filter((r) => r.id !== id);
  saveRecents(filtered);

  window.dispatchEvent(new CustomEvent("salt-recents-updated"));
}

/**
 * Clear all recents
 */
export function clearAllRecents(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(RECENTS_STORAGE_KEY);

  window.dispatchEvent(new CustomEvent("salt-recents-updated"));
}

/**
 * Remove an item from recents by id.
 * Useful when an item is archived/deleted and should be removed from all recents.
 */
export function removeFromAllRecents(id: string): void {
  if (typeof window === "undefined") return;

  removeFromRecents(id);
}
