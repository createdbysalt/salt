import type { ConnectorDefinition } from "../types";

/**
 * API-key connectors with guided setup (connectHelp) collect credentials
 * inline on the detail page — not in a separate dialog.
 */
export function usesInlineApiKeyConnect(
  definition: Pick<ConnectorDefinition, "authMethod" | "connectHelp">,
): boolean {
  return definition.authMethod === "api_key" && Boolean(definition.connectHelp);
}
