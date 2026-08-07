/**
 * Plays Activity is act-layer only. Memory Care (and retired Keeper) learn-layer
 * runs belong on Memory → Filter / record Activity.
 */

/**
 * True when an activity row is Memory Care / retired Keeper learn-layer work.
 */
export function isMemoryCareActivityMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata) return false;
  const source = metadata.source;
  if (source === "memory-care") return true;
  const player = metadata.player_slug ?? metadata.playerSlug;
  return player === "memory-care" || player === "keeper";
}
