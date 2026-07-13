/**
 * Unified Connector Registry — Single Source of Truth
 *
 * Every connector is defined ONCE here. All other systems derive from this:
 * - Capture adapters (trigger slugs)
 * - Enrichment registry (category mapping)
 * - Ask Salt manifest (AI tool access)
 * - Connector meta (UI display: links, developed by)
 * - Tool policy (approval requirements)
 *
 * To add a connector:
 * 1. Add an entry to CONNECTOR_REGISTRY below
 * 2. That's it. Everything else derives automatically.
 */

export type ConnectorCategory =
  | "email"
  | "calendar"
  | "billing"
  | "crm"
  | "meetings"
  | "documents"
  | "storage"
  | "project_management"
  | "communication";

export type ConnectorAuthMethod = "oauth" | "api_key";

export interface ConnectorLink {
  label: string;
  href: string;
}

export interface ConnectorMeta {
  displayName: string;
  tagline: string;
  developedBy: string;
  links: ConnectorLink[];
}

export interface AskSaltConfig {
  enabled: boolean;
  slugPrefix: string;
}

export interface ConnectorDefinition {
  /** Provider key used in workspace_integrations (e.g., "gmail", "hubspot") */
  providerKey: string;

  /** Catalog ID for UI (e.g., "google", "hubspot") */
  catalogId: string;

  /** Category for enrichment and capture routing */
  category: ConnectorCategory;

  /** Auth method */
  authMethod: ConnectorAuthMethod;

  /** Composio trigger slugs for real-time capture (empty = backfill only) */
  triggerSlugs: string[];

  /** Ask Salt AI tool configuration */
  askSalt: AskSaltConfig;

  /** UI display metadata */
  meta: ConnectorMeta;

  /** Whether connector is ready for production */
  phase: "released" | "beta" | "coming_soon";
}

/**
 * THE REGISTRY — Single source of truth for all connectors
 */
export const CONNECTOR_REGISTRY: Record<string, ConnectorDefinition> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL
  // ═══════════════════════════════════════════════════════════════════════════
  gmail: {
    providerKey: "gmail",
    catalogId: "google",
    category: "email",
    authMethod: "oauth",
    triggerSlugs: ["GMAIL_NEW_GMAIL_MESSAGE"],
    askSalt: { enabled: true, slugPrefix: "GMAIL_" },
    meta: {
      displayName: "Gmail",
      tagline: "Search, read, and send email — sends only after you approve.",
      developedBy: "Google",
      links: [
        { label: "Website", href: "https://www.google.com/gmail/about/" },
        { label: "Documentation", href: "https://developers.google.com/workspace/gmail/api/guides" },
        { label: "Support", href: "https://support.google.com/mail" },
      ],
    },
    phase: "released",
  },

  outlook: {
    providerKey: "outlook",
    catalogId: "outlook",
    category: "email",
    authMethod: "oauth",
    triggerSlugs: ["OUTLOOK_MESSAGE_TRIGGER", "OUTLOOK_SENT_MESSAGE_TRIGGER"],
    askSalt: { enabled: false, slugPrefix: "OUTLOOK_" },
    meta: {
      displayName: "Outlook",
      tagline: "Email and calendar from Microsoft 365.",
      developedBy: "Microsoft",
      links: [
        { label: "Website", href: "https://outlook.com" },
        { label: "Documentation", href: "https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview" },
        { label: "Support", href: "https://support.microsoft.com/en-us/outlook" },
      ],
    },
    phase: "beta",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR
  // ═══════════════════════════════════════════════════════════════════════════
  googlecalendar: {
    providerKey: "googlecalendar",
    catalogId: "google-calendar",
    category: "calendar",
    authMethod: "oauth",
    triggerSlugs: ["GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER"],
    askSalt: { enabled: true, slugPrefix: "GOOGLECALENDAR_" },
    meta: {
      displayName: "Google Calendar",
      tagline: "Events and availability — Salt schedules only with your approval.",
      developedBy: "Google",
      links: [
        { label: "Website", href: "https://calendar.google.com" },
        { label: "Documentation", href: "https://developers.google.com/workspace/calendar/api/guides/overview" },
        { label: "Support", href: "https://support.google.com/calendar" },
      ],
    },
    phase: "released",
  },

  cal: {
    providerKey: "cal",
    catalogId: "calcom",
    category: "calendar",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only — Composio has no Cal.com triggers
    askSalt: { enabled: false, slugPrefix: "CAL_" },
    meta: {
      displayName: "Cal.com",
      tagline: "Booking links and scheduled meetings.",
      developedBy: "Cal.com",
      links: [
        { label: "Website", href: "https://cal.com" },
        { label: "Documentation", href: "https://cal.com/docs" },
        { label: "Support", href: "https://cal.com/support" },
      ],
    },
    phase: "beta",
  },

  calendly: {
    providerKey: "calendly",
    catalogId: "calendly",
    category: "calendar",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only — Composio has no Calendly triggers
    askSalt: { enabled: false, slugPrefix: "CALENDLY_" },
    meta: {
      displayName: "Calendly",
      tagline: "Scheduling and meeting bookings.",
      developedBy: "Calendly",
      links: [
        { label: "Website", href: "https://calendly.com" },
        { label: "Documentation", href: "https://developer.calendly.com" },
        { label: "Support", href: "https://help.calendly.com" },
      ],
    },
    phase: "beta",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STORAGE
  // ═══════════════════════════════════════════════════════════════════════════
  googledrive: {
    providerKey: "googledrive",
    catalogId: "google-drive",
    category: "storage",
    authMethod: "oauth",
    triggerSlugs: ["GOOGLEDRIVE_FILE_CREATED_TRIGGER"],
    askSalt: { enabled: true, slugPrefix: "GOOGLEDRIVE_" },
    meta: {
      displayName: "Google Drive",
      tagline: "Files and shared documents for client work.",
      developedBy: "Google",
      links: [
        { label: "Website", href: "https://www.google.com/drive/" },
        { label: "Documentation", href: "https://developers.google.com/workspace/drive/api/guides/about-sdk" },
        { label: "Support", href: "https://support.google.com/drive" },
      ],
    },
    phase: "released",
  },

  dropbox: {
    providerKey: "dropbox",
    catalogId: "dropbox",
    category: "storage",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only — Composio has no Dropbox triggers
    askSalt: { enabled: false, slugPrefix: "DROPBOX_" },
    meta: {
      displayName: "Dropbox",
      tagline: "Files and shared folders for client work.",
      developedBy: "Dropbox",
      links: [
        { label: "Website", href: "https://www.dropbox.com" },
        { label: "Documentation", href: "https://www.dropbox.com/developers/documentation" },
        { label: "Support", href: "https://help.dropbox.com" },
      ],
    },
    phase: "beta",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  googledocs: {
    providerKey: "googledocs",
    catalogId: "google-docs",
    category: "documents",
    authMethod: "oauth",
    triggerSlugs: ["GOOGLEDOCS_DOCUMENT_CREATED_TRIGGER", "GOOGLEDOCS_DOCUMENT_UPDATED_TRIGGER"],
    askSalt: { enabled: true, slugPrefix: "GOOGLEDOCS_" },
    meta: {
      displayName: "Google Docs",
      tagline: "Documents and proposals for client work.",
      developedBy: "Google",
      links: [
        { label: "Website", href: "https://docs.google.com" },
        { label: "Documentation", href: "https://developers.google.com/docs/api/how-tos/overview" },
        { label: "Support", href: "https://support.google.com/docs" },
      ],
    },
    phase: "released",
  },

  googlesheets: {
    providerKey: "googlesheets",
    catalogId: "google-sheets",
    category: "documents",
    authMethod: "oauth",
    // NEW_SPREADSHEET_CREATED watches ALL new spreadsheets in Drive (no ID required).
    // NEW_ROWS_TRIGGER requires a specific spreadsheet ID so it's not included.
    triggerSlugs: ["GOOGLESHEETS_NEW_SPREADSHEET_CREATED_TRIGGER"],
    askSalt: { enabled: true, slugPrefix: "GOOGLESHEETS_" },
    meta: {
      displayName: "Google Sheets",
      tagline: "Spreadsheets and data for client projects.",
      developedBy: "Google",
      links: [
        { label: "Website", href: "https://sheets.google.com" },
        { label: "Documentation", href: "https://developers.google.com/sheets/api/guides/concepts" },
        { label: "Support", href: "https://support.google.com/docs" },
      ],
    },
    phase: "released",
  },

  googleslides: {
    providerKey: "googleslides",
    catalogId: "google-slides",
    category: "documents",
    authMethod: "oauth",
    triggerSlugs: ["GOOGLESLIDES_SLIDE_ADDED_TRIGGER"],
    askSalt: { enabled: true, slugPrefix: "GOOGLESLIDES_" },
    meta: {
      displayName: "Google Slides",
      tagline: "Presentations for client work.",
      developedBy: "Google",
      links: [
        { label: "Website", href: "https://slides.google.com" },
        { label: "Documentation", href: "https://developers.google.com/slides/api/guides/overview" },
        { label: "Support", href: "https://support.google.com/docs" },
      ],
    },
    phase: "released",
  },

  notion: {
    providerKey: "notion",
    catalogId: "notion",
    category: "documents",
    authMethod: "oauth",
    triggerSlugs: ["NOTION_PAGE_CREATED", "NOTION_PAGE_CONTENT_UPDATED"],
    askSalt: { enabled: false, slugPrefix: "NOTION_" },
    meta: {
      displayName: "Notion",
      tagline: "Pages and databases for client knowledge.",
      developedBy: "Notion",
      links: [
        { label: "Website", href: "https://www.notion.so" },
        { label: "Documentation", href: "https://developers.notion.com" },
        { label: "Support", href: "https://www.notion.so/help" },
      ],
    },
    phase: "beta",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING
  // ═══════════════════════════════════════════════════════════════════════════
  stripe: {
    providerKey: "stripe",
    catalogId: "stripe",
    category: "billing",
    authMethod: "api_key",
    triggerSlugs: [
      "STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER",
      "STRIPE_CHECKOUT_SESSION_COMPLETED_TRIGGER",
      "STRIPE_SUBSCRIPTION_ADDED_TRIGGER",
      "STRIPE_SUBSCRIPTION_DELETED_TRIGGER",
      "STRIPE_CHARGE_FAILED_TRIGGER",
    ],
    askSalt: { enabled: true, slugPrefix: "STRIPE_" },
    meta: {
      displayName: "Stripe",
      tagline: "Revenue, invoices, and subscriptions — Salt acts only with your approval.",
      developedBy: "Stripe",
      links: [
        { label: "Website", href: "https://stripe.com" },
        { label: "Documentation", href: "https://docs.stripe.com/keys" },
        { label: "Support", href: "https://support.stripe.com" },
      ],
    },
    phase: "released",
  },

  quickbooks: {
    providerKey: "quickbooks",
    catalogId: "quickbooks",
    category: "billing",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only — Composio has no QuickBooks triggers
    askSalt: { enabled: false, slugPrefix: "QUICKBOOKS_" },
    meta: {
      displayName: "QuickBooks",
      tagline: "Invoices and accounting data.",
      developedBy: "Intuit",
      links: [
        { label: "Website", href: "https://quickbooks.intuit.com" },
        { label: "Documentation", href: "https://developer.intuit.com/app/developer/qbo/docs/get-started" },
        { label: "Support", href: "https://quickbooks.intuit.com/learn-support" },
      ],
    },
    phase: "beta",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CRM
  // ═══════════════════════════════════════════════════════════════════════════
  hubspot: {
    providerKey: "hubspot",
    catalogId: "hubspot",
    category: "crm",
    authMethod: "oauth",
    triggerSlugs: ["HUBSPOT_CONTACT_CREATED_TRIGGER", "HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER"],
    askSalt: { enabled: false, slugPrefix: "HUBSPOT_" },
    meta: {
      displayName: "HubSpot",
      tagline: "Contacts and deals — update with your approval.",
      developedBy: "HubSpot",
      links: [
        { label: "Website", href: "https://www.hubspot.com" },
        { label: "Documentation", href: "https://developers.hubspot.com/docs/api/overview" },
        { label: "Support", href: "https://help.hubspot.com" },
      ],
    },
    phase: "beta",
  },

  salesforce: {
    providerKey: "salesforce",
    catalogId: "salesforce",
    category: "crm",
    authMethod: "oauth",
    triggerSlugs: [
      "SALESFORCE_ACCOUNT_CREATED_OR_UPDATED_TRIGGER",
      "SALESFORCE_CONTACT_UPDATED_TRIGGER",
      "SALESFORCE_LEAD_CREATED_OR_UPDATED_TRIGGER",
      "SALESFORCE_OPPORTUNITY_UPDATED_TRIGGER",
    ],
    askSalt: { enabled: false, slugPrefix: "SALESFORCE_" },
    meta: {
      displayName: "Salesforce",
      tagline: "CRM contacts, leads, and opportunities.",
      developedBy: "Salesforce",
      links: [
        { label: "Website", href: "https://www.salesforce.com" },
        { label: "Documentation", href: "https://developer.salesforce.com/docs" },
        { label: "Support", href: "https://help.salesforce.com" },
      ],
    },
    phase: "coming_soon",
  },

  pipedrive: {
    providerKey: "pipedrive",
    catalogId: "pipedrive",
    category: "crm",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only
    askSalt: { enabled: false, slugPrefix: "PIPEDRIVE_" },
    meta: {
      displayName: "Pipedrive",
      tagline: "Sales pipeline and deals.",
      developedBy: "Pipedrive",
      links: [
        { label: "Website", href: "https://www.pipedrive.com" },
        { label: "Documentation", href: "https://developers.pipedrive.com" },
        { label: "Support", href: "https://support.pipedrive.com" },
      ],
    },
    phase: "coming_soon",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  slack: {
    providerKey: "slack",
    catalogId: "slack",
    category: "communication",
    authMethod: "oauth",
    triggerSlugs: ["SLACK_CHANNEL_MESSAGE_RECEIVED", "SLACK_DIRECT_MESSAGE_RECEIVED"],
    askSalt: { enabled: false, slugPrefix: "SLACK_" },
    meta: {
      displayName: "Slack",
      tagline: "Channels and messages — send with your approval.",
      developedBy: "Slack",
      links: [
        { label: "Website", href: "https://slack.com" },
        { label: "Documentation", href: "https://api.slack.com/docs" },
        { label: "Support", href: "https://slack.com/help" },
      ],
    },
    phase: "beta",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  linear: {
    providerKey: "linear",
    catalogId: "linear",
    category: "project_management",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only
    askSalt: { enabled: false, slugPrefix: "LINEAR_" },
    meta: {
      displayName: "Linear",
      tagline: "Issues and project tracking.",
      developedBy: "Linear",
      links: [
        { label: "Website", href: "https://linear.app" },
        { label: "Documentation", href: "https://developers.linear.app" },
        { label: "Support", href: "https://linear.app/docs" },
      ],
    },
    phase: "beta",
  },

  asana: {
    providerKey: "asana",
    catalogId: "asana",
    category: "project_management",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only
    askSalt: { enabled: false, slugPrefix: "ASANA_" },
    meta: {
      displayName: "Asana",
      tagline: "Tasks and project management.",
      developedBy: "Asana",
      links: [
        { label: "Website", href: "https://asana.com" },
        { label: "Documentation", href: "https://developers.asana.com" },
        { label: "Support", href: "https://asana.com/support" },
      ],
    },
    phase: "coming_soon",
  },

  clickup: {
    providerKey: "clickup",
    catalogId: "clickup",
    category: "project_management",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only
    askSalt: { enabled: false, slugPrefix: "CLICKUP_" },
    meta: {
      displayName: "ClickUp",
      tagline: "Tasks and project management.",
      developedBy: "ClickUp",
      links: [
        { label: "Website", href: "https://clickup.com" },
        { label: "Documentation", href: "https://clickup.com/api" },
        { label: "Support", href: "https://help.clickup.com" },
      ],
    },
    phase: "beta",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER
  // ═══════════════════════════════════════════════════════════════════════════
  github: {
    providerKey: "github",
    catalogId: "github",
    category: "project_management",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only
    askSalt: { enabled: false, slugPrefix: "GITHUB_" },
    meta: {
      displayName: "GitHub",
      tagline: "Repositories and issues.",
      developedBy: "GitHub",
      links: [
        { label: "Website", href: "https://github.com" },
        { label: "Documentation", href: "https://docs.github.com/en/rest" },
        { label: "Support", href: "https://support.github.com" },
      ],
    },
    phase: "beta",
  },

  mercury: {
    providerKey: "mercury",
    catalogId: "mercury",
    category: "billing",
    authMethod: "oauth",
    triggerSlugs: [], // Backfill only
    askSalt: { enabled: false, slugPrefix: "MERCURY_" },
    meta: {
      displayName: "Mercury",
      tagline: "Business banking and transactions.",
      developedBy: "Mercury",
      links: [
        { label: "Website", href: "https://mercury.com" },
        { label: "Documentation", href: "https://docs.mercury.com" },
        { label: "Support", href: "https://mercury.com/contact" },
      ],
    },
    phase: "beta",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DERIVED EXPORTS — Other systems import these instead of maintaining their own
// ═══════════════════════════════════════════════════════════════════════════════

/** All registered provider keys */
export const ALL_PROVIDER_KEYS = Object.keys(CONNECTOR_REGISTRY);

/** Get connector by provider key */
export function getConnector(providerKey: string): ConnectorDefinition | null {
  return CONNECTOR_REGISTRY[providerKey] ?? null;
}

/** Get connector by catalog ID */
export function getConnectorByCatalogId(catalogId: string): ConnectorDefinition | null {
  return Object.values(CONNECTOR_REGISTRY).find((c) => c.catalogId === catalogId) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOR CAPTURE ADAPTERS
// ─────────────────────────────────────────────────────────────────────────────

/** Get trigger slugs for a provider */
export function getTriggerSlugsForProvider(providerKey: string): string[] {
  return CONNECTOR_REGISTRY[providerKey]?.triggerSlugs ?? [];
}

/** Get all providers in a category */
export function getProvidersForCategory(category: ConnectorCategory): string[] {
  return Object.entries(CONNECTOR_REGISTRY)
    .filter(([_, def]) => def.category === category)
    .map(([key]) => key);
}

/** Check if provider is in a category */
export function isProviderInCategory(providerKey: string, category: ConnectorCategory): boolean {
  return CONNECTOR_REGISTRY[providerKey]?.category === category;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOR ENRICHMENT REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

/** Provider key → category mapping (replaces CONNECTOR_TO_CATEGORY) */
export function getCategoryForProvider(providerKey: string): ConnectorCategory | null {
  return CONNECTOR_REGISTRY[providerKey]?.category ?? null;
}

/** Build the full provider → category map */
export function buildProviderToCategoryMap(): Record<string, ConnectorCategory> {
  const map: Record<string, ConnectorCategory> = {};
  for (const [key, def] of Object.entries(CONNECTOR_REGISTRY)) {
    map[key] = def.category;
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOR ASK SALT MANIFEST
// ─────────────────────────────────────────────────────────────────────────────

export interface AskSaltManifestEntry {
  toolkit: string;
  slugPrefix: string;
  label: string;
  catalogProvider: string;
}

/** Get Ask Salt enabled connectors (replaces ASK_SALT_CONNECTOR_MANIFEST) */
export function getAskSaltManifest(): AskSaltManifestEntry[] {
  return Object.entries(CONNECTOR_REGISTRY)
    .filter(([_, def]) => def.askSalt.enabled)
    .map(([key, def]) => ({
      toolkit: key,
      slugPrefix: def.askSalt.slugPrefix,
      label: def.meta.displayName,
      catalogProvider: key,
    }));
}

/** Get Ask Salt enabled toolkit keys */
export function getAskSaltToolkits(): string[] {
  return Object.entries(CONNECTOR_REGISTRY)
    .filter(([_, def]) => def.askSalt.enabled)
    .map(([key]) => key);
}

/** Get Ask Salt slug prefixes */
export function getAskSaltSlugPrefixes(): Record<string, string> {
  const prefixes: Record<string, string> = {};
  for (const [key, def] of Object.entries(CONNECTOR_REGISTRY)) {
    if (def.askSalt.enabled) {
      prefixes[key] = def.askSalt.slugPrefix;
    }
  }
  return prefixes;
}

/** Get Ask Salt labels */
export function getAskSaltLabels(): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const [key, def] of Object.entries(CONNECTOR_REGISTRY)) {
    if (def.askSalt.enabled) {
      labels[key] = def.meta.displayName;
    }
  }
  return labels;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOR CONNECTOR META (UI)
// ─────────────────────────────────────────────────────────────────────────────

/** Get connector meta by catalog ID */
export function getConnectorMeta(catalogId: string): ConnectorMeta | null {
  const connector = getConnectorByCatalogId(catalogId);
  return connector?.meta ?? null;
}

/** Get connector meta with fallback */
export function getConnectorMetaWithFallback(
  catalogId: string,
  fallbackName: string,
  fallbackDescription: string
): ConnectorMeta {
  const meta = getConnectorMeta(catalogId);
  if (meta) return meta;

  return {
    displayName: fallbackName,
    tagline: fallbackDescription,
    developedBy: "",
    links: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FOR CATEGORY ADAPTERS
// ─────────────────────────────────────────────────────────────────────────────

/** Build trigger slugs map for a category */
export function buildCategoryTriggerMap(category: ConnectorCategory): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const [key, def] of Object.entries(CONNECTOR_REGISTRY)) {
    if (def.category === category) {
      map[key] = def.triggerSlugs;
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/** Validate registry consistency (call in tests) */
export function validateRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, def] of Object.entries(CONNECTOR_REGISTRY)) {
    // Provider key should match the object key
    if (def.providerKey !== key) {
      errors.push(`${key}: providerKey "${def.providerKey}" doesn't match key`);
    }

    // Ask Salt enabled connectors should have a slug prefix
    if (def.askSalt.enabled && !def.askSalt.slugPrefix) {
      errors.push(`${key}: Ask Salt enabled but no slugPrefix`);
    }

    // Released connectors should have complete meta
    if (def.phase === "released") {
      if (!def.meta.developedBy) {
        errors.push(`${key}: released but missing developedBy`);
      }
      if (def.meta.links.length === 0) {
        errors.push(`${key}: released but no links`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
