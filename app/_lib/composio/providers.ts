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
 * Providers that authenticate with a user-supplied API key or token instead
 * of an OAuth redirect. Connections complete synchronously via
 * `initiateApiKeyConnection` — no callback round-trip.
 *
 * Membership is dictated by the live Composio toolkit auth schemes
 * (audited 2026-06-12): these toolkits either only support API_KEY or have
 * no Composio-managed OAuth app, so a user key is the only viable flow.
 */
export const COMPOSIO_API_KEY_PROVIDERS = [
  "posthog",
  "resend",
  "openrouter",
  "semrush",
  "firecrawl",
  "brandfetch",
  "elevenlabs",
  "heygen",
  "sanity",
  "composio",
  // API_KEY-only toolkits (no OAuth scheme on Composio)
  "apollo",
  "cursor",
  "fireflies",
  "jotform",
  "pandadoc",
  "telegram",
  "vercel",
  "dockerhub",
  "lemonsqueezy",
  "pipelinecrm",
  // OAuth exists upstream but Composio has no managed app — user key/token
  // is the only flow that works without registering Salt's own dev app
  "shopify",
  "pipedrive",
  "tally",
  "webflow",
  "wix",
  "dropboxsign",
  "followupboss",
  "facebookads",
] as const;

export type ComposioApiKeyProvider = (typeof COMPOSIO_API_KEY_PROVIDERS)[number];

export function isComposioApiKeyProvider(
  provider: string,
): provider is ComposioApiKeyProvider {
  return (COMPOSIO_API_KEY_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * Wire field name Composio expects for the user's key at connection
 * initiation (`expected_input_fields` on the auth config). Most toolkits
 * take `generic_api_key`; a few are token-based and require `bearer_token`.
 * Verified against the live API 2026-06-12.
 */
const COMPOSIO_API_KEY_FIELD_NAMES: Partial<
  Record<ComposioApiKeyProvider, string>
> = {
  vercel: "bearer_token",
  facebookads: "bearer_token",
};

export function toComposioApiKeyField(provider: ComposioApiKeyProvider): string {
  return COMPOSIO_API_KEY_FIELD_NAMES[provider] ?? "generic_api_key";
}

export type ComposioWorkspaceProvider = (typeof COMPOSIO_WORKSPACE_PROVIDERS)[number];
export type ComposioStudioProvider = ComposioWorkspaceProvider;

/**
 * Composio SDK toolkit slug for each provider key. Provider keys are
 * stable (stored in workspace_integrations.provider); slugs follow
 * Composio's naming, verified against the live API 2026-06-12.
 */
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
  lemonsqueezy: "lemon_squeezy",
  ramp: "ramp",
  mercury: "mercury_mcp",
  // Social
  instagram: "instagram",
  reddit: "reddit",
  linkedin: "linkedin",
  twitter: "twitter",
  facebook: "facebook",
  tiktok: "tiktok",
  youtube: "youtube",
  // Marketing
  facebookads: "metaads",
  googleads: "googleads",
  linkedinads: "linkedin_ads",
  redditads: "reddit_ads",
  mailchimp: "mailchimp",
  semrush: "semrush",
  convertkit: "kit",
  // Analytics/SEO
  googleanalytics: "google_analytics",
  googletagmanager: "googletagmanager",
  posthog: "posthog",
  pagespeed: "pagespeed",
  googlesearchconsole: "google_search_console",
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
  microsoftexcel: "excel",
  microsoftword: "microsoftword",
  microsoftpowerpoint: "microsoftpowerpoint",
  onedrive: "one_drive",
  // Files
  dropbox: "dropbox",
  dropboxsign: "dropbox_sign",
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
  granola: "granola_mcp",
  fireflies: "fireflies",
  // CRM
  hubspot: "hubspot",
  salesforce: "salesforce",
  pipedrive: "pipedrive",
  pipelinecrm: "pipeline_crm",
  followupboss: "follow_up_boss",
  apollo: "apollo",
  // Developer
  sanity: "sanity",
  vercel: "vercel",
  github: "github",
  gitlab: "gitlab",
  dockerhub: "docker_hub",
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
  googlemaps: "google_maps",
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
 * Every connectable provider MUST have a non-empty auth config ID —
 * Composio rejects connection requests without one (verified 2026-06-12;
 * there is no implicit "managed" fallback). Empty string means the
 * connector is not yet connectable; the connect flow returns an error and
 * the catalog should mark it comingSoon.
 *
 * - Google apps use custom auth configs on Salt's own OAuth client — pinned
 *   explicitly so connections never fall back to Composio's shared (managed)
 *   Google app, which blocks at consent ("app has not been verified").
 * - Other OAuth providers use `salt_<toolkit>_managed` configs created on
 *   Composio's managed apps.
 * - API-key providers use `salt_<toolkit>_user_api_key` configs; the user's
 *   key is supplied at connect time and stored only by Composio.
 *
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
  // Google-family — Composio managed (default scopes; consent screen shows
  // Composio's app). Migrate to Salt's own client when scopes are verified.
  googleanalytics:
    process.env.COMPOSIO_GOOGLEANALYTICS_AUTH_CONFIG_ID ?? "ac_6yTBLvLAuIXn",
  googlesearchconsole:
    process.env.COMPOSIO_GOOGLESEARCHCONSOLE_AUTH_CONFIG_ID ??
    "ac_awfi9qgCayzP",
  googleads: process.env.COMPOSIO_GOOGLEADS_AUTH_CONFIG_ID ?? "ac_u_eNZSVPCdL1",
  googlemaps:
    process.env.COMPOSIO_GOOGLEMAPS_AUTH_CONFIG_ID ?? "ac_TW7JiGdNTtXh",
  youtube: process.env.COMPOSIO_YOUTUBE_AUTH_CONFIG_ID ?? "ac_MJ_gcCjyQgp_",
  // Not on Composio — no toolkit exists
  googletagmanager:
    process.env.COMPOSIO_GOOGLETAGMANAGER_AUTH_CONFIG_ID ?? "",
  // Stripe — OAuth on Salt's OWN Connect client (test-mode ca_UgzrqdYu…),
  // so the consent screen shows Salt's business, not Composio's ("Sampark
  // Inc"). For production set COMPOSIO_STRIPE_AUTH_CONFIG_ID to a config
  // built from the live-mode client ID. Legacy configs still in the
  // project: ac_vhQlpWFGx17J (managed OAuth), ac_X574CtxR9zWw (api-key).
  stripe: process.env.COMPOSIO_STRIPE_AUTH_CONFIG_ID ?? "ac_Uk-_Q-Y3razH",
  // API-key auth configs (user-supplied key, stored by Composio)
  posthog: process.env.COMPOSIO_POSTHOG_AUTH_CONFIG_ID ?? "ac_hA8-rGazV_8E",
  // Managed OAuth (flipped from API key 2026-06-12 — managed apps exist)
  linear: process.env.COMPOSIO_LINEAR_AUTH_CONFIG_ID ?? "ac_RAJvBF7-k1De",
  resend: process.env.COMPOSIO_RESEND_AUTH_CONFIG_ID ?? "ac_b2nBtYl2NF70",
  openrouter:
    process.env.COMPOSIO_OPENROUTER_AUTH_CONFIG_ID ?? "ac_gqmxrWGzA4Jb",
  semrush: process.env.COMPOSIO_SEMRUSH_AUTH_CONFIG_ID ?? "ac_-USZvjuTJPUP",
  firecrawl: process.env.COMPOSIO_FIRECRAWL_AUTH_CONFIG_ID ?? "ac_XyDZLgpCDp2-",
  brandfetch:
    process.env.COMPOSIO_BRANDFETCH_AUTH_CONFIG_ID ?? "ac_ArmGNjlaicCC",
  elevenlabs:
    process.env.COMPOSIO_ELEVENLABS_AUTH_CONFIG_ID ?? "ac_urEJWIckfYuK",
  heygen: process.env.COMPOSIO_HEYGEN_AUTH_CONFIG_ID ?? "ac_taeHN0p8qw55",
  sanity: process.env.COMPOSIO_SANITY_AUTH_CONFIG_ID ?? "ac_7KhUk3jK8p10",
  supabase: process.env.COMPOSIO_SUPABASE_AUTH_CONFIG_ID ?? "ac_nAT8XjQBOFkZ",
  apollo: process.env.COMPOSIO_APOLLO_AUTH_CONFIG_ID ?? "ac_rdgIKaHgZPOe",
  cursor: process.env.COMPOSIO_CURSOR_AUTH_CONFIG_ID ?? "ac_lE4It_MO8yck",
  fireflies: process.env.COMPOSIO_FIREFLIES_AUTH_CONFIG_ID ?? "ac_wKbPxBuKJD40",
  jotform: process.env.COMPOSIO_JOTFORM_AUTH_CONFIG_ID ?? "ac_dBInDgbI0Zef",
  pandadoc: process.env.COMPOSIO_PANDADOC_AUTH_CONFIG_ID ?? "ac_kBTJocPtK1gq",
  telegram: process.env.COMPOSIO_TELEGRAM_AUTH_CONFIG_ID ?? "ac_Oe1EXWv0rz7g",
  vercel: process.env.COMPOSIO_VERCEL_AUTH_CONFIG_ID ?? "ac_lp5QItNgC6Hy",
  shopify: process.env.COMPOSIO_SHOPIFY_AUTH_CONFIG_ID ?? "ac_Jot2Rj948pVp",
  pipedrive: process.env.COMPOSIO_PIPEDRIVE_AUTH_CONFIG_ID ?? "ac_b1vOhnLILsus",
  tally: process.env.COMPOSIO_TALLY_AUTH_CONFIG_ID ?? "ac_3nbkUy9DLawH",
  webflow: process.env.COMPOSIO_WEBFLOW_AUTH_CONFIG_ID ?? "ac_uKF_FIQFwIsD",
  wix: process.env.COMPOSIO_WIX_AUTH_CONFIG_ID ?? "ac_Set8_LjqSi-_",
  dropboxsign:
    process.env.COMPOSIO_DROPBOXSIGN_AUTH_CONFIG_ID ?? "ac_gJ6iO26g3DmE",
  followupboss:
    process.env.COMPOSIO_FOLLOWUPBOSS_AUTH_CONFIG_ID ?? "ac__oXANnEcBtA-",
  facebookads:
    process.env.COMPOSIO_FACEBOOKADS_AUTH_CONFIG_ID ?? "ac_885OTZMyfH2o",
  dockerhub: process.env.COMPOSIO_DOCKERHUB_AUTH_CONFIG_ID ?? "ac_TLRtpzRvxPco",
  lemonsqueezy:
    process.env.COMPOSIO_LEMONSQUEEZY_AUTH_CONFIG_ID ?? "ac_1i8XRA7_UBbP",
  pipelinecrm:
    process.env.COMPOSIO_PIPELINECRM_AUTH_CONFIG_ID ?? "ac_7LDAuVNe2MFQ",
  // Composio toolkit is NO_AUTH — not connectable as a user connector
  composio: process.env.COMPOSIO_COMPOSIO_AUTH_CONFIG_ID ?? "",
  // OAuth providers — salt_<toolkit>_managed configs on Composio managed apps
  quickbooks:
    process.env.COMPOSIO_QUICKBOOKS_AUTH_CONFIG_ID ?? "ac_vUqirBfZMIcK",
  square: process.env.COMPOSIO_SQUARE_AUTH_CONFIG_ID ?? "ac_1EUCpu-1wUa7",
  instagram: process.env.COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID ?? "ac_-wyX_6uwzBxt",
  reddit: process.env.COMPOSIO_REDDIT_AUTH_CONFIG_ID ?? "ac_nBN65UVb7jJV",
  linkedin: process.env.COMPOSIO_LINKEDIN_AUTH_CONFIG_ID ?? "ac_Gzn9BwBOsk2U",
  facebook: process.env.COMPOSIO_FACEBOOK_AUTH_CONFIG_ID ?? "ac_sQHX6kK9fUxf",
  redditads: process.env.COMPOSIO_REDDITADS_AUTH_CONFIG_ID ?? "ac_iq_VBfXXU2aE",
  mailchimp: process.env.COMPOSIO_MAILCHIMP_AUTH_CONFIG_ID ?? "ac_VNGOdHM4YcoA",
  convertkit: process.env.COMPOSIO_CONVERTKIT_AUTH_CONFIG_ID ?? "ac_oQDH1sy5YVUj",
  zoom: process.env.COMPOSIO_ZOOM_AUTH_CONFIG_ID ?? "ac_FC0R3qiHh966",
  whatsapp: process.env.COMPOSIO_WHATSAPP_AUTH_CONFIG_ID ?? "ac_CHlWe4-_to6i",
  slack: process.env.COMPOSIO_SLACK_AUTH_CONFIG_ID ?? "ac_oelk6kw9n_nD",
  discord: process.env.COMPOSIO_DISCORD_AUTH_CONFIG_ID ?? "ac_D00NBFG_mYk2",
  notion: process.env.COMPOSIO_NOTION_AUTH_CONFIG_ID ?? "ac_3_qGIgO2Qqjz",
  clickup: process.env.COMPOSIO_CLICKUP_AUTH_CONFIG_ID ?? "ac_VihgjdqRtlJB",
  asana: process.env.COMPOSIO_ASANA_AUTH_CONFIG_ID ?? "ac_gVjkZlDD4hsB",
  basecamp: process.env.COMPOSIO_BASECAMP_AUTH_CONFIG_ID ?? "ac_N4Noa88_IpLU",
  trello: process.env.COMPOSIO_TRELLO_AUTH_CONFIG_ID ?? "ac_gGSGauCB7kEV",
  monday: process.env.COMPOSIO_MONDAY_AUTH_CONFIG_ID ?? "ac_5i_fAw_1F6K1",
  miro: process.env.COMPOSIO_MIRO_AUTH_CONFIG_ID ?? "ac_pbwmuH6EO6jV",
  airtable: process.env.COMPOSIO_AIRTABLE_AUTH_CONFIG_ID ?? "ac_WJAchGxkLtT4",
  jira: process.env.COMPOSIO_JIRA_AUTH_CONFIG_ID ?? "ac_Aw67c8LkLutR",
  wrike: process.env.COMPOSIO_WRIKE_AUTH_CONFIG_ID ?? "ac_7HIIrh3QK0uL",
  outlook: process.env.COMPOSIO_OUTLOOK_AUTH_CONFIG_ID ?? "ac_3rmVF0kue3SI",
  microsoftexcel:
    process.env.COMPOSIO_MICROSOFTEXCEL_AUTH_CONFIG_ID ?? "ac_226EeeRlITjz",
  onedrive: process.env.COMPOSIO_ONEDRIVE_AUTH_CONFIG_ID ?? "ac_LBvfy54JscZW",
  dropbox: process.env.COMPOSIO_DROPBOX_AUTH_CONFIG_ID ?? "ac_h-HWBjd1lOLZ",
  typeform: process.env.COMPOSIO_TYPEFORM_AUTH_CONFIG_ID ?? "ac_cYELH1QrwrxS",
  calendly: process.env.COMPOSIO_CALENDLY_AUTH_CONFIG_ID ?? "ac_EptFqOE-HcbH",
  cal: process.env.COMPOSIO_CAL_AUTH_CONFIG_ID ?? "ac_h_SxNGiJ_r2p",
  hubspot: process.env.COMPOSIO_HUBSPOT_AUTH_CONFIG_ID ?? "ac_xnt7oRMMSIa2",
  salesforce:
    process.env.COMPOSIO_SALESFORCE_AUTH_CONFIG_ID ?? "ac_O7djgWWbE3Zn",
  github: process.env.COMPOSIO_GITHUB_AUTH_CONFIG_ID ?? "ac_R8b51QqILM-c",
  gitlab: process.env.COMPOSIO_GITLAB_AUTH_CONFIG_ID ?? "ac_nm_6qVVreWlO",
  canva: process.env.COMPOSIO_CANVA_AUTH_CONFIG_ID ?? "ac_5rP7cJGi4ajM",
  figma: process.env.COMPOSIO_FIGMA_AUTH_CONFIG_ID ?? "ac_OF0OzzHWku38",
  // DCR OAuth (dynamic client registration MCP toolkits — no dev app needed)
  mercury: process.env.COMPOSIO_MERCURY_AUTH_CONFIG_ID ?? "ac_OIT4hVaigadW",
  granola: process.env.COMPOSIO_GRANOLA_AUTH_CONFIG_ID ?? "ac_-aZNtGYokuv9",
  // No Composio managed app and no Salt dev app registered — not connectable
  // until Salt registers its own OAuth client with each platform
  // (.scratch/composio-create-custom-oauth.ts activates one once you have
  // client credentials).
  ramp: "",
  twitter: "",
  tiktok: "",
  linkedinads: "",
  pagespeed: "",
  microsoftword: "",
  microsoftpowerpoint: "",
  docusign: "",
  matterport: "",
  onepassword: "",
  instacart: "",
};

export function toComposioAuthConfigId(
  provider: ComposioWorkspaceProvider,
): string {
  return COMPOSIO_AUTH_CONFIG_IDS[provider] ?? "";
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
