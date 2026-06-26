/**
 * Types for the favorites system
 * Favorites are shared across the current app.
 */

export type FavoriteItemType =
  | "project"
  | "client"
  | "org"
  | "file"
  | "meeting"
  | "play";

export interface FavoriteItem {
  id: string;
  type: FavoriteItemType;
  label: string;
  href: string;
  /** When the item was favorited */
  favoritedAt: string; // ISO date string
  /** Optional secondary text (e.g., company name for client) */
  subtitle?: string;
  /** Optional icon name from lucide-react */
  icon?: string;
}

/**
 * Single storage key for all favorites
 */
export const FAVORITES_STORAGE_KEY = "salt-favorites";

/**
 * Max items to store
 */
export const MAX_FAVORITES = 10;

/**
 * Max items to display in sidebar
 */
export const MAX_FAVORITES_DISPLAYED = 7;
