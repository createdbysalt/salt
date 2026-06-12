/** Composio app keys mapped to workspace integration provider values */
export const COMPOSIO_WORKSPACE_PROVIDERS = [
  // Existing (Phase 1)
  "gmail",
  "googlecalendar",
  "googledrive",
  "googledocs",
  "googlesheets",
  "googleslides",
  "stripe",
  // Payments/Finance
  "quickbooks",
  "square",
  "shopify",
  "lemonsqueezy",
  "ramp",
  "mercury",
  // Social
  "instagram",
  "reddit",
  "linkedin",
  "twitter",
  "facebook",
  "tiktok",
  "youtube",
  // Marketing
  "facebookads",
  "googleads",
  "linkedinads",
  "redditads",
  "mailchimp",
  "semrush",
  "convertkit",
  // Analytics/SEO
  "googleanalytics",
  "googletagmanager",
  "posthog",
  "pagespeed",
  "googlesearchconsole",
  // Communication
  "zoom",
  "whatsapp",
  "slack",
  "telegram",
  "discord",
  // Productivity
  "notion",
  "clickup",
  "asana",
  "basecamp",
  "trello",
  "monday",
  "linear",
  "miro",
  "airtable",
  "jira",
  "wrike",
  // Microsoft
  "outlook",
  "microsoftexcel",
  "microsoftword",
  "microsoftpowerpoint",
  "onedrive",
  // Files
  "dropbox",
  "dropboxsign",
  // Documents/Signing
  "pandadoc",
  "docusign",
  // Forms
  "typeform",
  "jotform",
  "tally",
  // Scheduling
  "calendly",
  "cal",
  // Meetings
  "granola",
  "fireflies",
  // CRM
  "hubspot",
  "salesforce",
  "pipedrive",
  "pipelinecrm",
  "followupboss",
  "apollo",
  // Developer
  "sanity",
  "vercel",
  "github",
  "gitlab",
  "dockerhub",
  "resend",
  "supabase",
  "firecrawl",
  "openrouter",
  "cursor",
  "composio",
  // Website Builders
  "webflow",
  "wix",
  // Design
  "canva",
  "brandfetch",
  "figma",
  // AI
  "elevenlabs",
  "heygen",
  // Location
  "googlemaps",
  // Property/3D
  "matterport",
  // Security
  "onepassword",
  // Delivery
  "instacart",
] as const;

/**
 * Providers that authenticate with a user-supplied API key instead of an
 * OAuth redirect. Connections complete synchronously via
 * `initiateApiKeyConnection` — no callback round-trip.
 */
export const COMPOSIO_API_KEY_PROVIDERS = [
  "stripe",
  "posthog",
  "linear",
  "resend",
  "openrouter",
  "semrush",
  "convertkit",
  "firecrawl",
  "brandfetch",
  "elevenlabs",
  "heygen",
  "sanity",
  "supabase",
  "composio",
] as const;

export type ComposioApiKeyProvider = (typeof COMPOSIO_API_KEY_PROVIDERS)[number];

export function isComposioApiKeyProvider(
  provider: string,
): provider is ComposioApiKeyProvider {
  return (COMPOSIO_API_KEY_PROVIDERS as readonly string[]).includes(provider);
}

export type ComposioWorkspaceProvider = (typeof COMPOSIO_WORKSPACE_PROVIDERS)[number];
export type ComposioStudioProvider = ComposioWorkspaceProvider;

/** Composio SDK appName for initiateConnection */
const COMPOSIO_APP_NAMES: Record<ComposioWorkspaceProvider, string> = {
  // Existing (Phase 1)
  gmail: "gmail",
  googlecalendar: "googlecalendar",
  googledrive: "googledrive",
  googledocs: "googledocs",
  googlesheets: "googlesheets",
  googleslides: "googleslides",
  stripe: "stripe",
  // Payments/Finance
  quickbooks: "quickbooks",
  square: "square",
  shopify: "shopify",
  lemonsqueezy: "lemonsqueezy",
  ramp: "ramp",
  mercury: "mercury",
  // Social
  instagram: "instagram",
  reddit: "reddit",
  linkedin: "linkedin",
  twitter: "twitter",
  facebook: "facebook",
  tiktok: "tiktok",
  youtube: "youtube",
  // Marketing
  facebookads: "facebookads",
  googleads: "googleads",
  linkedinads: "linkedinads",
  redditads: "redditads",
  mailchimp: "mailchimp",
  semrush: "semrush",
  convertkit: "convertkit",
  // Analytics/SEO
  googleanalytics: "googleanalytics",
  googletagmanager: "googletagmanager",
  posthog: "posthog",
  pagespeed: "pagespeed",
  googlesearchconsole: "googlesearchconsole",
  // Communication
  zoom: "zoom",
  whatsapp: "whatsapp",
  slack: "slack",
  telegram: "telegram",
  discord: "discord",
  // Productivity
  notion: "notion",
  clickup: "clickup",
  asana: "asana",
  basecamp: "basecamp",
  trello: "trello",
  monday: "monday",
  linear: "linear",
  miro: "miro",
  airtable: "airtable",
  jira: "jira",
  wrike: "wrike",
  // Microsoft
  outlook: "outlook",
  microsoftexcel: "microsoftexcel",
  microsoftword: "microsoftword",
  microsoftpowerpoint: "microsoftpowerpoint",
  onedrive: "onedrive",
  // Files
  dropbox: "dropbox",
  dropboxsign: "dropboxsign",
  // Documents/Signing
  pandadoc: "pandadoc",
  docusign: "docusign",
  // Forms
  typeform: "typeform",
  jotform: "jotform",
  tally: "tally",
  // Scheduling
  calendly: "calendly",
  cal: "cal",
  // Meetings
  granola: "granola",
  fireflies: "fireflies",
  // CRM
  hubspot: "hubspot",
  salesforce: "salesforce",
  pipedrive: "pipedrive",
  pipelinecrm: "pipelinecrm",
  followupboss: "followupboss",
  apollo: "apollo",
  // Developer
  sanity: "sanity",
  vercel: "vercel",
  github: "github",
  gitlab: "gitlab",
  dockerhub: "dockerhub",
  resend: "resend",
  supabase: "supabase",
  firecrawl: "firecrawl",
  openrouter: "openrouter",
  cursor: "cursor",
  composio: "composio",
  // Website Builders
  webflow: "webflow",
  wix: "wix",
  // Design
  canva: "canva",
  brandfetch: "brandfetch",
  figma: "figma",
  // AI
  elevenlabs: "elevenlabs",
  heygen: "heygen",
  // Location
  googlemaps: "googlemaps",
  // Property/3D
  matterport: "matterport",
  // Security
  onepassword: "onepassword",
  // Delivery
  instacart: "instacart",
};

export function toComposioAppName(provider: ComposioWorkspaceProvider): string {
  return COMPOSIO_APP_NAMES[provider];
}

/**
 * Composio auth config IDs.
 *
 * Google apps use custom auth configs on Salt's own OAuth client — pinned
 * explicitly so connections never fall back to Composio's shared (managed)
 * Google app, which blocks at consent ("app has not been verified").
 *
 * Other providers use Composio's managed auth (empty string = managed).
 * Env vars allow per-environment overrides; IDs are not secrets.
 */
const COMPOSIO_AUTH_CONFIG_IDS: Record<ComposioWorkspaceProvider, string> = {
  // Google apps — custom auth configs (Salt's own OAuth client)
  gmail: process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID ?? "ac_BM8t2R6b86xm",
  googlecalendar:
    process.env.COMPOSIO_GOOGLECALENDAR_AUTH_CONFIG_ID ?? "ac_Zn0sRv8T9V3H",
  googledrive:
    process.env.COMPOSIO_GOOGLEDRIVE_AUTH_CONFIG_ID ?? "ac_bd8mWmrsTWY2",
  googledocs:
    process.env.COMPOSIO_GOOGLEDOCS_AUTH_CONFIG_ID ?? "ac_YdygiF5pRz0p",
  googlesheets:
    process.env.COMPOSIO_GOOGLESHEETS_AUTH_CONFIG_ID ?? "ac_jbENGOvG4Xgr",
  googleslides:
    process.env.COMPOSIO_GOOGLESLIDES_AUTH_CONFIG_ID ?? "ac_K1y1IqCGKMFA",
  googleanalytics:
    process.env.COMPOSIO_GOOGLEANALYTICS_AUTH_CONFIG_ID ?? "",
  googletagmanager:
    process.env.COMPOSIO_GOOGLETAGMANAGER_AUTH_CONFIG_ID ?? "",
  googlesearchconsole:
    process.env.COMPOSIO_GOOGLESEARCHCONSOLE_AUTH_CONFIG_ID ?? "",
  googleads: process.env.COMPOSIO_GOOGLEADS_AUTH_CONFIG_ID ?? "",
  googlemaps: process.env.COMPOSIO_GOOGLEMAPS_AUTH_CONFIG_ID ?? "",
  youtube: process.env.COMPOSIO_YOUTUBE_AUTH_CONFIG_ID ?? "",
  // API-key auth configs
  stripe: process.env.COMPOSIO_STRIPE_AUTH_CONFIG_ID ?? "ac_X574CtxR9zWw",
  posthog: process.env.COMPOSIO_POSTHOG_AUTH_CONFIG_ID ?? "",
  linear: process.env.COMPOSIO_LINEAR_AUTH_CONFIG_ID ?? "",
  resend: process.env.COMPOSIO_RESEND_AUTH_CONFIG_ID ?? "",
  openrouter: process.env.COMPOSIO_OPENROUTER_AUTH_CONFIG_ID ?? "",
  semrush: process.env.COMPOSIO_SEMRUSH_AUTH_CONFIG_ID ?? "",
  convertkit: process.env.COMPOSIO_CONVERTKIT_AUTH_CONFIG_ID ?? "",
  firecrawl: process.env.COMPOSIO_FIRECRAWL_AUTH_CONFIG_ID ?? "",
  brandfetch: process.env.COMPOSIO_BRANDFETCH_AUTH_CONFIG_ID ?? "",
  elevenlabs: process.env.COMPOSIO_ELEVENLABS_AUTH_CONFIG_ID ?? "",
  heygen: process.env.COMPOSIO_HEYGEN_AUTH_CONFIG_ID ?? "",
  sanity: process.env.COMPOSIO_SANITY_AUTH_CONFIG_ID ?? "",
  supabase: process.env.COMPOSIO_SUPABASE_AUTH_CONFIG_ID ?? "",
  composio: process.env.COMPOSIO_COMPOSIO_AUTH_CONFIG_ID ?? "",
  // OAuth providers — use Composio managed auth (empty string)
  quickbooks: "",
  square: "",
  shopify: "",
  lemonsqueezy: "",
  ramp: "",
  mercury: "",
  instagram: "",
  reddit: "",
  linkedin: "",
  twitter: "",
  facebook: "",
  tiktok: "",
  facebookads: "",
  linkedinads: "",
  redditads: "",
  mailchimp: "",
  pagespeed: "",
  zoom: "",
  whatsapp: "",
  slack: "",
  telegram: "",
  discord: "",
  notion: "",
  clickup: "",
  asana: "",
  basecamp: "",
  trello: "",
  monday: "",
  miro: "",
  airtable: "",
  jira: "",
  wrike: "",
  outlook: "",
  microsoftexcel: "",
  microsoftword: "",
  microsoftpowerpoint: "",
  onedrive: "",
  dropbox: "",
  dropboxsign: "",
  pandadoc: "",
  docusign: "",
  typeform: "",
  jotform: "",
  tally: "",
  calendly: "",
  cal: "",
  granola: "",
  fireflies: "",
  hubspot: "",
  salesforce: "",
  pipedrive: "",
  pipelinecrm: "",
  followupboss: "",
  apollo: "",
  vercel: "",
  github: "",
  gitlab: "",
  dockerhub: "",
  cursor: "",
  webflow: "",
  wix: "",
  canva: "",
  figma: "",
  matterport: "",
  onepassword: "",
  instacart: "",
};

export function toComposioAuthConfigId(
  provider: ComposioWorkspaceProvider,
): string {
  return COMPOSIO_AUTH_CONFIG_IDS[provider];
}

export function isComposioWorkspaceProvider(
  provider: string,
): provider is ComposioWorkspaceProvider {
  return (COMPOSIO_WORKSPACE_PROVIDERS as readonly string[]).includes(provider);
}

export function isComposioStudioProvider(
  provider: string,
): provider is ComposioStudioProvider {
  return isComposioWorkspaceProvider(provider);
}
