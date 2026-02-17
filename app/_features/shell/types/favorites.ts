import type { DashboardMode } from "./mode";

/**
 * Types for the favorites system
 * Unlike recents, favorites are CROSS-MODE (not mode-scoped)
 * A favorited client is accessible from Studio, Strategy, or Serve mode
 */

export type FavoriteItemType =
  | "project"
  | "client"
  | "report"
  | "intelligence"
  | "portal";

export interface FavoriteItem {
  id: string;
  type: FavoriteItemType;
  label: string;
  href: string;
  /** The primary mode this item belongs to (for routing) */
  primaryMode: DashboardMode;
  /** When the item was favorited */
  favoritedAt: string; // ISO date string
  /** Optional secondary text (e.g., company name for client) */
  subtitle?: string;
  /** Optional icon name from lucide-react */
  icon?: string;
}

/**
 * Single storage key for all favorites (cross-mode)
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

/**
 * Map item types to their primary mode
 */
export const FAVORITE_TYPE_TO_MODE: Record<FavoriteItemType, DashboardMode> = {
  project: "studio",
  client: "studio",
  report: "strategy",
  intelligence: "strategy",
  portal: "serve",
};
