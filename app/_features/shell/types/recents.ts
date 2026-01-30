import type { DashboardMode } from "./mode";

/**
 * Types for the recents tracking system
 * Tracks recently visited items per dashboard mode
 */

export type RecentItemType =
  // Studio mode
  | "project"
  | "client"
  | "conversation"
  // Strategy mode
  | "report"
  | "audit"
  | "intelligence"
  // Serve mode
  | "portal";

export interface RecentItem {
  id: string;
  type: RecentItemType;
  label: string;
  href: string;
  mode: DashboardMode;
  lastVisited: string; // ISO date string for serialization
  icon?: string; // Optional icon name from lucide-react
  subtitle?: string; // Optional secondary text (e.g., client name for project)
}

/**
 * Storage keys per mode for localStorage persistence
 */
export const RECENTS_STORAGE_KEYS = {
  strategy: "salt-recents-strategy",
  studio: "salt-recents-studio",
  serve: "salt-recents-serve",
} as const;

/**
 * Default max items to store per mode
 */
export const MAX_RECENTS_PER_MODE = 10;

/**
 * Map item types to their allowed modes
 */
export const ITEM_TYPE_TO_MODE: Record<RecentItemType, DashboardMode> = {
  project: "studio",
  client: "studio",
  conversation: "studio",
  report: "strategy",
  audit: "strategy",
  intelligence: "strategy",
  portal: "serve",
};
