/**
 * Connector catalog types for Settings → Connectors.
 */

import type { CaptureScope } from "@/app/_lib/composio/capture-scope";

export type ConnectorOwnership = "native" | "composio" | "internal";

export type ConnectorCategory =
  | "recommended"
  | "productivity"
  | "scheduling"
  | "files"
  | "meetings"
  | "payments"
  | "social"
  | "marketing"
  | "analytics"
  | "communication"
  | "crm"
  | "developer"
  | "design"
  | "forms"
  | "documents"
  | "ai"
  | "location"
  | "property"
  | "security"
  | "delivery"
  | "website";

export type ConnectorAuthMethod = "oauth" | "api_key" | "platform";

/**
 * Registry depth tier (mirrors ConnectorTier in
 * app/_lib/composio/connector-registry.ts — redeclared here because that
 * module is server-only). catalog_only = shallow catalog sync: no tools,
 * triggers, or capture adapter, so the connector is browse-only in the UI
 * and refused by the server-side connect gate (Sources plan 5.5).
 */
export type ConnectorTier = "catalog_only" | "action" | "capture";

export type ConnectorPhase = "1a" | "1b" | "1c" | "2" | "future" | "native";

export type ConnectorCatalogId =
  // Existing (Phase 1)
  | "google"
  | "google-calendar"
  | "google-drive"
  | "google-docs"
  | "google-sheets"
  | "google-slides"
  | "stripe"
  // Payments/Finance
  | "quickbooks"
  | "square"
  | "shopify"
  | "lemon-squeezy"
  | "ramp"
  | "mercury"
  // Social
  | "instagram"
  | "reddit"
  | "linkedin"
  | "x"
  | "facebook"
  | "tiktok"
  | "youtube"
  // Marketing
  | "meta-ads"
  | "google-ads"
  | "linkedin-ads"
  | "reddit-ads"
  | "mailchimp"
  | "semrush"
  | "kit"
  // Analytics/SEO
  | "google-analytics"
  | "google-tag-manager"
  | "posthog"
  | "pagespeed"
  | "google-search-console"
  // Communication
  | "zoom"
  | "whatsapp"
  | "slack"
  | "telegram"
  | "discord"
  // Productivity
  | "notion"
  | "clickup"
  | "asana"
  | "basecamp"
  | "trello"
  | "monday"
  | "linear"
  | "miro"
  | "airtable"
  | "jira"
  | "wrike"
  // Microsoft
  | "outlook"
  | "excel"
  | "word"
  | "powerpoint"
  | "onedrive"
  // Files
  | "dropbox"
  | "dropbox-sign"
  // Documents/Signing
  | "pandadoc"
  | "docusign"
  // Forms
  | "typeform"
  | "jotform"
  | "tally"
  // Scheduling
  | "calendly"
  | "calcom"
  // Meetings
  | "granola"
  | "fireflies"
  // CRM
  | "hubspot"
  | "salesforce"
  | "pipedrive"
  | "pipeline-crm"
  | "followup-boss"
  | "apollo"
  // Developer
  | "sanity"
  | "vercel"
  | "github"
  | "gitlab"
  | "docker-hub"
  | "resend"
  | "supabase"
  | "firecrawl"
  | "openrouter"
  | "cursor"
  | "composio"
  // Website Builders
  | "webflow"
  | "wix"
  // Design
  | "canva"
  | "brandfetch"
  | "figma"
  // AI
  | "elevenlabs"
  | "heygen"
  // Location
  | "google-maps"
  // Property/3D
  | "matterport"
  // Security
  | "onepassword"
  // Delivery
  | "instacart";

export type ConnectorTab = "discover" | "all" | "connected" | "available";

/**
 * Extra input collected by the API-key connect dialog beyond the secret key.
 * `name` is the Composio wire field (`expected_input_fields` name) and is
 * allowlisted server-side before initiation.
 */
export interface ConnectorApiKeyExtraField {
  name: string;
  label: string;
  placeholder: string;
  description?: string;
}

/** API-key connect dialog form spec for connectors that need it. */
export interface ConnectorApiKeyForm {
  /** Label for the secret input (defaults to "Secret key"). */
  keyLabel?: string;
  /** Placeholder for the secret input. */
  keyPlaceholder?: string;
  /** Additional required fields, in display order. */
  extraFields?: readonly ConnectorApiKeyExtraField[];
}

/** External link displayed in the connector detail sidebar. */
export interface ConnectorLink {
  label: string;
  href: string;
}

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
  /**
   * Registry depth tier. Undefined on legacy/static definitions — treat as
   * connectable. "catalog_only" renders browse-only (no connect CTA).
   */
  tier?: ConnectorTier;
  /** Connect dialog spec for api_key connectors with non-default inputs. */
  apiKeyForm?: ConnectorApiKeyForm;
  /**
   * Plain-language guidance shown before connecting, for connectors whose
   * provider-side flow asks for something non-obvious (e.g. WhatsApp's
   * WABA ID on Composio's hosted page).
   */
  connectHelp?: string;
  /** Short tagline describing what the connector does. */
  tagline?: string;
  /** Company/org that developed the connector (e.g. "Google", "Stripe"). */
  developedBy?: string;
  /** External links (Website, Documentation, Support). */
  links?: ConnectorLink[];
}

export interface ConnectorRuntimeStatus {
  connected: boolean;
  label?: string;
  error?: string;
  /**
   * Expired or failed live verification — Composio needs a re-auth. Distinct
   * from never-connected. Quiet connections are auto-verified server-side
   * (connection-verify.ts), so this is the single "not working" signal.
   */
  needsReconnect?: boolean;
  /** Most recent capture for this provider (ISO). Null = none since connecting. */
  lastActivityAt?: string | null;
}

/** One row of the workspace tool execution audit log, scoped to a connector. */
export interface ConnectorActivityEntry {
  id: string;
  toolSlug: string;
  provider: string | null;
  risk: "read" | "mutating" | "destructive";
  source: "ask_salt" | "server_action" | "background" | "play";
  status: "success" | "error" | "blocked";
  argsSummary: Record<string, unknown> | null;
  /** Plain-language tool summary (from classification) — friendly action copy. */
  summary?: string | null;
  error: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export type ConnectorTrustLevel = "read_only" | "act_with_approval" | "trust";
export type ConnectorEmailMode = "draft" | "send";

export interface ConnectorTrustSettings {
  trustLevel: ConnectorTrustLevel;
  /** Gmail only; draft is the safe default. */
  emailMode: ConnectorEmailMode;
}

export interface ConnectorsPageData {
  workspaceId: string | null;
  /**
   * DB-driven catalog rows (connector_catalog + connector_overrides),
   * serialized for the client — components never import a static catalog.
   */
  catalog: ConnectorDefinition[];
  /** Missing entry = not connected (catalog is larger than implemented set). */
  connectors: Partial<Record<ConnectorCatalogId, ConnectorRuntimeStatus>>;
  /** Email mode per connector; trustLevel mirrors the workspace-global value. */
  settingsByConnector: Partial<Record<ConnectorCatalogId, ConnectorTrustSettings>>;
  /**
   * Per-connection memory capture (Phase 3.3b): capable = a capture adapter
   * exists for the provider; enabled = the user's explicit opt-in. scope is
   * the 4.5 per-connection upstream filter (null = unscoped/global filters).
   */
  captureByConnector: Partial<
    Record<
      ConnectorCatalogId,
      { capable: boolean; enabled: boolean; scope: CaptureScope | null }
    >
  >;
  /** Workspace-global trust — the ONE switch in Settings. */
  workspaceTrustLevel?: ConnectorTrustLevel;
}
