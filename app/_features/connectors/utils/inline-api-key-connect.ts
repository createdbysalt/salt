import type { ConnectorDefinition } from "../types";

/**
 * API-key connectors with guided setup (connectHelp) collect credentials
 * inline on the detail page — not in a separate dialog.
 * catalog_only connectors are browse-only (Sources plan 5.5): no connect UI.
 */
export function usesInlineApiKeyConnect(
  definition: Pick<ConnectorDefinition, "authMethod" | "connectHelp" | "tier">,
): boolean {
  if (definition.tier === "catalog_only") return false;
  return definition.authMethod === "api_key" && Boolean(definition.connectHelp);
}
