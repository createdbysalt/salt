/**
 * Connector catalog types for Settings → Connectors.
 */

export type ConnectorOwnership = "native" | "composio" | "internal";

export type ConnectorCategory =
  | "recommended"
  | "productivity"
  | "scheduling"
  | "files"
  | "meetings"
  | "payments";

export type ConnectorAuthMethod = "oauth" | "api_key" | "platform";

export type ConnectorPhase = "1a" | "1b" | "1c" | "future" | "native";

export type ConnectorCatalogId =
  | "google"
  | "google-calendar"
  | "google-drive"
  | "stripe";

export type ConnectorTab = "discover" | "all" | "connected" | "available";

export interface ConnectorDefinition {
  id: ConnectorCatalogId;
  /** workspace_integrations.provider when persisted */
  providerKey?: string;
  name: string;
  description: string;
  category: ConnectorCategory;
  ownership: ConnectorOwnership;
  authMethod: ConnectorAuthMethod;
  phase: ConnectorPhase;
  showInCatalog: boolean;
  nativeBadge?: string;
  /** Composio toolkit key when ownership is composio */
  composioProviders?: readonly string[];
  comingSoon?: boolean;
}

export interface ConnectorRuntimeStatus {
  connected: boolean;
  label?: string;
  error?: string;
}

/** Persisted in workspace_integrations.config for Composio connectors. */
export interface ConnectorIntegrationConfig {
  disabledTools?: string[];
}

export interface ConnectorDetailData {
  definition: ConnectorDefinition;
  status: ConnectorRuntimeStatus;
  disabledTools: string[];
}

/** One row of the workspace tool execution audit log, scoped to a connector. */
export interface ConnectorActivityEntry {
  id: string;
  toolSlug: string;
  provider: string | null;
  risk: "read" | "mutating" | "destructive";
  source: "ask_salt" | "server_action" | "background";
  status: "success" | "error" | "blocked";
  argsSummary: Record<string, unknown> | null;
  error: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export type ConnectorTrustLevel = "read_only" | "act_with_approval";
export type ConnectorEmailMode = "draft" | "send";

export interface ConnectorTrustSettings {
  trustLevel: ConnectorTrustLevel;
  /** Gmail only; draft is the safe default. */
  emailMode: ConnectorEmailMode;
}

export interface ConnectorsPageData {
  workspaceId: string | null;
  connectors: Record<ConnectorCatalogId, ConnectorRuntimeStatus>;
  /** Per-catalog disabled Composio tool slugs (per-app: one provider each). */
  disabledToolsByConnector: Partial<Record<ConnectorCatalogId, string[]>>;
  /** Trust ladder + email mode per connector (per-app: one provider each). */
  settingsByConnector: Partial<Record<ConnectorCatalogId, ConnectorTrustSettings>>;
}
