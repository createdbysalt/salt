/**
 * Toggle public marketing routes without deleting route modules.
 * Flip to `true` when Learn is ready to ship.
 */
export const LEARN_PUBLIC_ENABLED = false;

export function isLearnPublicEnabled(): boolean {
  return LEARN_PUBLIC_ENABLED;
}
