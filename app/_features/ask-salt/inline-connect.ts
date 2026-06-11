import type { ConnectorCardPayload, InlineConnectAction } from "./types";

export function connectorPayloadToInline(
  card: ConnectorCardPayload,
): InlineConnectAction {
  return {
    connectorId: card.connectorId,
    name: card.name,
    connected: card.connected,
    comingSoon: card.comingSoon ?? false,
    ownership: card.ownership,
    canConnect:
      !card.connected &&
      !card.comingSoon &&
      card.ownership === "composio",
    canDisconnect: card.connected && card.ownership === "composio",
    error: card.error,
    oauthUrl: card.oauthUrl,
    statusLabel: card.statusLabel,
  };
}

export function isConnectorCardPayload(value: unknown): value is ConnectorCardPayload {
  if (!value || typeof value !== "object") return false;
  const record = value as ConnectorCardPayload;
  return typeof record.connectorId === "string" && typeof record.name === "string";
}

export function extractConnectorTurnFromMetadata(
  metadata: Record<string, unknown> | null,
): {
  inlineAction?: InlineConnectAction | null;
  showBrowseConnectors?: boolean;
  suggestions?: string[];
} | null {
  if (!metadata || metadata.kind !== "connector") return null;

  if (metadata.inlineAction && typeof metadata.inlineAction === "object") {
    return {
      inlineAction: metadata.inlineAction as InlineConnectAction,
      showBrowseConnectors: Boolean(metadata.showBrowseConnectors),
      suggestions: Array.isArray(metadata.suggestions)
        ? (metadata.suggestions as string[])
        : undefined,
    };
  }

  const connectors = metadata.connectors;
  if (!Array.isArray(connectors) || connectors.length === 0) {
    return { showBrowseConnectors: true };
  }

  const first = connectors.find(isConnectorCardPayload);
  if (!first) return { showBrowseConnectors: true };

  return {
    inlineAction: connectorPayloadToInline(first),
    showBrowseConnectors: connectors.length > 1,
  };
}
