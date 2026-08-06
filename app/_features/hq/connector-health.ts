/**
 * Pure helpers for the HQ side-rail Connector Health card.
 * Empty items = hide the card (appear only when something is wrong).
 */

export function shouldShowConnectorHealth(itemCount: number): boolean {
  return itemCount > 0;
}

export function connectorHealthImpactCopy(itemCount: number): string {
  return itemCount === 1
    ? "This connection expired. Reconnect so Salt can keep learning."
    : "These connections expired. Reconnect so Salt can keep learning.";
}
