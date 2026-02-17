import { removeFromRecents } from "./recents-storage";
import { removeFromFavorites } from "./favorites-storage";
import type { DashboardMode } from "../types/mode";

/**
 * Remove an item from both recents and favorites
 * Call this when archiving or deleting an entity
 *
 * @param id - The entity ID to remove
 * @param modes - Which modes to clean recents from (defaults to all)
 */
export function cleanupRecentsAndFavorites(
  id: string,
  modes: DashboardMode[] = ["studio", "strategy", "serve"]
): void {
  // Remove from favorites (cross-mode)
  removeFromFavorites(id);

  // Remove from recents for each specified mode
  modes.forEach((mode) => {
    removeFromRecents(mode, id);
  });
}

/**
 * Remove a client from recents and favorites
 * Clients exist in studio mode
 */
export function cleanupClientFromRecents(clientId: string): void {
  cleanupRecentsAndFavorites(clientId, ["studio"]);
}

/**
 * Remove a project from recents and favorites
 * Projects exist in studio mode
 */
export function cleanupProjectFromRecents(projectId: string): void {
  cleanupRecentsAndFavorites(projectId, ["studio"]);
}

/**
 * Remove a portal from recents and favorites
 * Portals exist in serve mode
 */
export function cleanupPortalFromRecents(portalId: string): void {
  cleanupRecentsAndFavorites(portalId, ["serve"]);
}

/**
 * Remove intelligence/report/audit from recents and favorites
 * These exist in strategy mode
 */
export function cleanupIntelligenceFromRecents(itemId: string): void {
  cleanupRecentsAndFavorites(itemId, ["strategy"]);
}
