/**
 * Types for the recents tracking system
 * Tracks recently visited current-app items.
 */

export type RecentItemType =
  | "project"
  | "client"
  | "conversation"
  | "org"
  | "file"
  | "meeting"
  | "play";

export interface RecentItem {
  id: string;
  type: RecentItemType;
  label: string;
  href: string;
  lastVisited: string; // ISO date string for serialization
  icon?: string; // Optional icon name from lucide-react
  subtitle?: string; // Optional secondary text (e.g., client name for project)
}

/**
 * Storage key for localStorage persistence
 */
export const RECENTS_STORAGE_KEY = "salt-recents";

/**
 * Default max items to store
 */
export const MAX_RECENTS = 20;
