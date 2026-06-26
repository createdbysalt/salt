import { removeFromRecents } from "./recents-storage";
import { removeFromFavorites } from "./favorites-storage";

/**
 * Remove an item from both recents and favorites
 * Call this when archiving or deleting an entity
 *
 * @param id - The entity ID to remove
 */
export function cleanupRecentsAndFavorites(id: string): void {
  removeFromFavorites(id);
  removeFromRecents(id);
}

/**
 * Remove a client from recents and favorites
 */
export function cleanupClientFromRecents(clientId: string): void {
  cleanupRecentsAndFavorites(clientId);
}

/**
 * Remove a project from recents and favorites
 */
export function cleanupProjectFromRecents(projectId: string): void {
  cleanupRecentsAndFavorites(projectId);
}

/**
 * Remove a portal from recents and favorites
 * @deprecated Portals are retired.
 */
export function cleanupPortalFromRecents(portalId: string): void {
  cleanupRecentsAndFavorites(portalId);
}

/**
 * Remove intelligence/report/audit from recents and favorites
 * @deprecated Intelligence module routes are retired.
 */
export function cleanupIntelligenceFromRecents(itemId: string): void {
  cleanupRecentsAndFavorites(itemId);
}
