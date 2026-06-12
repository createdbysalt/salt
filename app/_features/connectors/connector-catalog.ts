/**
 * Connector policy registry — single source of truth for native vs Composio scope.
 *
 * Native platform (Salt's own infrastructure, never user connectors):
 * - Supabase, Resend, OpenRouter
 * - Stripe here means Salt's own SaaS billing (the user paying Salt) —
 *   separate from the Stripe *connector* below, which is the user's own
 *   Stripe account.
 *
 * The same service can appear in both lists: NATIVE_PLATFORM_SERVICES locks
 * Salt's internal account, while a catalog entry with ownership "composio"
 * is the *user's own* account on that service (the Stripe precedent,
 * product decision 2026-06-11).
 *
 * Composio Phase 1A:
 * - Gmail and Google Calendar as separate per-app connectors, each with its
 *   own OAuth flow and its own Composio auth config scoped to that app only.
 *   No bundled "Google" connection (product decision 2026-06-11).
 *
 * Composio Phase 1B:
 * - Google Drive (catalog entry; enable when product confirms)
 *
 * Composio Phase 1C:
 * - Stripe (user's own account, API-key auth). Replaced the native Stripe
 *   Connect Express integration (product decision 2026-06-11) — Salt reads
 *   business data and drafts invoices/subscriptions on the user's account.
 *
 * Composio Phase 2 (connector expansion, plan 2026-06-11):
 * - Everything in PHASE_2_CONNECTORS below. Visible in the catalog as
 *   "Coming soon" but not connectable until each app's tool slugs are
 *   verified against the live Composio API and policies are authored.
 *   Cal.com and Fireflies live here too — legacy API-key rows may exist in
 *   workspace_integrations; they reconnect via Composio when enabled.
 */

import type { ConnectorDefinition } from "./types";

export const NATIVE_PLATFORM_SERVICES = [
  "supabase",
  "stripe",
  "resend",
  "openrouter",
] as const;

export type NativePlatformService = (typeof NATIVE_PLATFORM_SERVICES)[number];

interface Phase2ConnectorSpec {
  id: ConnectorDefinition["id"];
  /** workspace_integrations.provider / Composio toolkit key */
  providerKey: string;
  name: string;
  description: string;
  category: ConnectorDefinition["category"];
  authMethod: ConnectorDefinition["authMethod"];
}

/**
 * Phase 2 connectors — in the catalog as "Coming soon", not yet connectable.
 * Every providerKey must exist in COMPOSIO_WORKSPACE_PROVIDERS
 * (app/_lib/composio/providers.ts). authMethod "api_key" must match
 * COMPOSIO_API_KEY_PROVIDERS there; extend that list when enabling a
 * connector so the connect flow routes correctly.
 */
const PHASE_2_CONNECTORS: readonly Phase2ConnectorSpec[] = [
  // Payments & Finance
  {
    id: "quickbooks",
    providerKey: "quickbooks",
    name: "QuickBooks",
    description: "Bookkeeping — invoices, expenses, and cash flow in view",
    category: "payments",
    authMethod: "oauth",
  },
  {
    id: "square",
    providerKey: "square",
    name: "Square",
    description: "Payments and POS — sales and customers in view",
    category: "payments",
    authMethod: "oauth",
  },
  {
    id: "shopify",
    providerKey: "shopify",
    name: "Shopify",
    description: "Store orders, products, and customers in view",
    category: "payments",
    authMethod: "oauth",
  },
  {
    id: "lemon-squeezy",
    providerKey: "lemonsqueezy",
    name: "Lemon Squeezy",
    description: "Digital product sales and subscriptions in view",
    category: "payments",
    authMethod: "oauth",
  },
  {
    id: "ramp",
    providerKey: "ramp",
    name: "Ramp",
    description: "Cards and spend — expenses and limits in view",
    category: "payments",
    authMethod: "oauth",
  },
  {
    id: "mercury",
    providerKey: "mercury",
    name: "Mercury",
    description: "Banking — balances and transactions in view",
    category: "payments",
    authMethod: "oauth",
  },
  // Social
  {
    id: "instagram",
    providerKey: "instagram",
    name: "Instagram",
    description: "Posts and engagement — publish with your approval",
    category: "social",
    authMethod: "oauth",
  },
  {
    id: "linkedin",
    providerKey: "linkedin",
    name: "LinkedIn",
    description: "Posts and profile reach — publish with your approval",
    category: "social",
    authMethod: "oauth",
  },
  {
    id: "x",
    providerKey: "twitter",
    name: "X (Twitter)",
    description: "Posts and replies — publish with your approval",
    category: "social",
    authMethod: "oauth",
  },
  {
    id: "facebook",
    providerKey: "facebook",
    name: "Facebook",
    description: "Pages and posts — publish with your approval",
    category: "social",
    authMethod: "oauth",
  },
  {
    id: "tiktok",
    providerKey: "tiktok",
    name: "TikTok",
    description: "Videos and performance — publish with your approval",
    category: "social",
    authMethod: "oauth",
  },
  {
    id: "youtube",
    providerKey: "youtube",
    name: "YouTube",
    description: "Channel videos and analytics in view",
    category: "social",
    authMethod: "oauth",
  },
  {
    id: "reddit",
    providerKey: "reddit",
    name: "Reddit",
    description: "Communities and posts — publish with your approval",
    category: "social",
    authMethod: "oauth",
  },
  // Marketing
  {
    id: "meta-ads",
    providerKey: "facebookads",
    name: "Meta Ads",
    description: "Campaign spend and results across Facebook and Instagram",
    category: "marketing",
    authMethod: "oauth",
  },
  {
    id: "google-ads",
    providerKey: "googleads",
    name: "Google Ads",
    description: "Campaign spend, keywords, and results in view",
    category: "marketing",
    authMethod: "oauth",
  },
  {
    id: "linkedin-ads",
    providerKey: "linkedinads",
    name: "LinkedIn Ads",
    description: "B2B campaign spend and results in view",
    category: "marketing",
    authMethod: "oauth",
  },
  {
    id: "reddit-ads",
    providerKey: "redditads",
    name: "Reddit Ads",
    description: "Community campaign spend and results in view",
    category: "marketing",
    authMethod: "oauth",
  },
  {
    id: "mailchimp",
    providerKey: "mailchimp",
    name: "Mailchimp",
    description: "Email campaigns and audiences — send with your approval",
    category: "marketing",
    authMethod: "oauth",
  },
  {
    id: "kit",
    providerKey: "convertkit",
    name: "Kit",
    description: "Newsletter broadcasts and subscribers — send with your approval",
    category: "marketing",
    authMethod: "api_key",
  },
  {
    id: "semrush",
    providerKey: "semrush",
    name: "Semrush",
    description: "SEO rankings, keywords, and competitors in view",
    category: "marketing",
    authMethod: "api_key",
  },
  // Analytics & SEO
  {
    id: "google-analytics",
    providerKey: "googleanalytics",
    name: "Google Analytics",
    description: "Site traffic, sources, and conversions in view",
    category: "analytics",
    authMethod: "oauth",
  },
  {
    id: "google-search-console",
    providerKey: "googlesearchconsole",
    name: "Google Search Console",
    description: "Search queries, clicks, and indexing in view",
    category: "analytics",
    authMethod: "oauth",
  },
  {
    id: "google-tag-manager",
    providerKey: "googletagmanager",
    name: "Google Tag Manager",
    description: "Tags and triggers — changes with your approval",
    category: "analytics",
    authMethod: "oauth",
  },
  {
    id: "posthog",
    providerKey: "posthog",
    name: "PostHog",
    description: "Product analytics — events and funnels in view",
    category: "analytics",
    authMethod: "api_key",
  },
  {
    id: "pagespeed",
    providerKey: "pagespeed",
    name: "PageSpeed Insights",
    description: "Site performance and Core Web Vitals in view",
    category: "analytics",
    authMethod: "oauth",
  },
  // Communication
  {
    id: "slack",
    providerKey: "slack",
    name: "Slack",
    description: "Channels and messages — send with your approval",
    category: "communication",
    authMethod: "oauth",
  },
  {
    id: "zoom",
    providerKey: "zoom",
    name: "Zoom",
    description: "Meetings and recordings — scheduling with your approval",
    category: "communication",
    authMethod: "oauth",
  },
  {
    id: "whatsapp",
    providerKey: "whatsapp",
    name: "WhatsApp",
    description: "Business messages — send with your approval",
    category: "communication",
    authMethod: "oauth",
  },
  {
    id: "telegram",
    providerKey: "telegram",
    name: "Telegram",
    description: "Messages and channels — send with your approval",
    category: "communication",
    authMethod: "oauth",
  },
  {
    id: "discord",
    providerKey: "discord",
    name: "Discord",
    description: "Servers and messages — send with your approval",
    category: "communication",
    authMethod: "oauth",
  },
  {
    id: "outlook",
    providerKey: "outlook",
    name: "Outlook",
    description: "Email and calendar — send and schedule with your approval",
    category: "communication",
    authMethod: "oauth",
  },
  // Productivity & Project Management
  {
    id: "notion",
    providerKey: "notion",
    name: "Notion",
    description: "Pages and databases — read, draft, and update with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "linear",
    providerKey: "linear",
    name: "Linear",
    description: "Issues and projects — create and update with your approval",
    category: "productivity",
    authMethod: "api_key",
  },
  {
    id: "asana",
    providerKey: "asana",
    name: "Asana",
    description: "Tasks and projects — create and update with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "clickup",
    providerKey: "clickup",
    name: "ClickUp",
    description: "Tasks and docs — create and update with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "trello",
    providerKey: "trello",
    name: "Trello",
    description: "Boards and cards — create and update with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "monday",
    providerKey: "monday",
    name: "Monday.com",
    description: "Boards and items — create and update with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "basecamp",
    providerKey: "basecamp",
    name: "Basecamp",
    description: "Projects and to-dos — create and update with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "airtable",
    providerKey: "airtable",
    name: "Airtable",
    description: "Bases and records — read and add with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "jira",
    providerKey: "jira",
    name: "Jira",
    description: "Issues and sprints — create and update with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "wrike",
    providerKey: "wrike",
    name: "Wrike",
    description: "Tasks and workloads — create and update with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  {
    id: "miro",
    providerKey: "miro",
    name: "Miro",
    description: "Boards and ideas — read and add with your approval",
    category: "productivity",
    authMethod: "oauth",
  },
  // Files (Microsoft + Dropbox alongside the Google family)
  {
    id: "onedrive",
    providerKey: "onedrive",
    name: "OneDrive",
    description: "Files and folders — Salt organizes with your approval",
    category: "files",
    authMethod: "oauth",
  },
  {
    id: "excel",
    providerKey: "microsoftexcel",
    name: "Excel",
    description: "Spreadsheets — read data and add rows with your approval",
    category: "files",
    authMethod: "oauth",
  },
  {
    id: "word",
    providerKey: "microsoftword",
    name: "Word",
    description: "Documents — read, draft, and update with your approval",
    category: "files",
    authMethod: "oauth",
  },
  {
    id: "powerpoint",
    providerKey: "microsoftpowerpoint",
    name: "PowerPoint",
    description: "Presentations — read and create decks with your approval",
    category: "files",
    authMethod: "oauth",
  },
  {
    id: "dropbox",
    providerKey: "dropbox",
    name: "Dropbox",
    description: "Files and folders — Salt organizes with your approval",
    category: "files",
    authMethod: "oauth",
  },
  // Documents & Signing
  {
    id: "docusign",
    providerKey: "docusign",
    name: "DocuSign",
    description: "Agreements — send for signature with your approval",
    category: "documents",
    authMethod: "oauth",
  },
  {
    id: "pandadoc",
    providerKey: "pandadoc",
    name: "PandaDoc",
    description: "Proposals and contracts — send with your approval",
    category: "documents",
    authMethod: "oauth",
  },
  {
    id: "dropbox-sign",
    providerKey: "dropboxsign",
    name: "Dropbox Sign",
    description: "Signature requests — send with your approval",
    category: "documents",
    authMethod: "oauth",
  },
  // Forms
  {
    id: "typeform",
    providerKey: "typeform",
    name: "Typeform",
    description: "Form responses and leads in view",
    category: "forms",
    authMethod: "oauth",
  },
  {
    id: "jotform",
    providerKey: "jotform",
    name: "Jotform",
    description: "Form responses and submissions in view",
    category: "forms",
    authMethod: "oauth",
  },
  {
    id: "tally",
    providerKey: "tally",
    name: "Tally",
    description: "Form responses and submissions in view",
    category: "forms",
    authMethod: "oauth",
  },
  // Scheduling
  {
    id: "calendly",
    providerKey: "calendly",
    name: "Calendly",
    description: "Bookings and availability — scheduling with your approval",
    category: "scheduling",
    authMethod: "oauth",
  },
  {
    id: "calcom",
    providerKey: "cal",
    name: "Cal.com",
    description: "Bookings and availability — scheduling with your approval",
    category: "scheduling",
    authMethod: "oauth",
  },
  // Meetings
  {
    id: "fireflies",
    providerKey: "fireflies",
    name: "Fireflies",
    description: "Meeting transcripts and action items in view",
    category: "meetings",
    authMethod: "oauth",
  },
  {
    id: "granola",
    providerKey: "granola",
    name: "Granola",
    description: "Meeting notes and summaries in view",
    category: "meetings",
    authMethod: "oauth",
  },
  // CRM
  {
    id: "hubspot",
    providerKey: "hubspot",
    name: "HubSpot",
    description: "Contacts and deals — update with your approval",
    category: "crm",
    authMethod: "oauth",
  },
  {
    id: "salesforce",
    providerKey: "salesforce",
    name: "Salesforce",
    description: "Contacts and opportunities — update with your approval",
    category: "crm",
    authMethod: "oauth",
  },
  {
    id: "pipedrive",
    providerKey: "pipedrive",
    name: "Pipedrive",
    description: "Deals and pipelines — update with your approval",
    category: "crm",
    authMethod: "oauth",
  },
  {
    id: "pipeline-crm",
    providerKey: "pipelinecrm",
    name: "Pipeline CRM",
    description: "Deals and contacts — update with your approval",
    category: "crm",
    authMethod: "oauth",
  },
  {
    id: "followup-boss",
    providerKey: "followupboss",
    name: "Follow Up Boss",
    description: "Leads and follow-ups — update with your approval",
    category: "crm",
    authMethod: "oauth",
  },
  {
    id: "apollo",
    providerKey: "apollo",
    name: "Apollo",
    description: "Prospects and outreach — update with your approval",
    category: "crm",
    authMethod: "oauth",
  },
  // Design
  {
    id: "canva",
    providerKey: "canva",
    name: "Canva",
    description: "Designs and brand assets in view",
    category: "design",
    authMethod: "oauth",
  },
  {
    id: "figma",
    providerKey: "figma",
    name: "Figma",
    description: "Files and comments in view",
    category: "design",
    authMethod: "oauth",
  },
  {
    id: "brandfetch",
    providerKey: "brandfetch",
    name: "Brandfetch",
    description: "Brand logos, colors, and fonts in view",
    category: "design",
    authMethod: "api_key",
  },
  // Website Builders
  {
    id: "webflow",
    providerKey: "webflow",
    name: "Webflow",
    description: "Site content and CMS items — publish with your approval",
    category: "website",
    authMethod: "oauth",
  },
  {
    id: "wix",
    providerKey: "wix",
    name: "Wix",
    description: "Site content and bookings — update with your approval",
    category: "website",
    authMethod: "oauth",
  },
  // Developer
  {
    id: "github",
    providerKey: "github",
    name: "GitHub",
    description: "Repos, issues, and PRs — changes with your approval",
    category: "developer",
    authMethod: "oauth",
  },
  {
    id: "gitlab",
    providerKey: "gitlab",
    name: "GitLab",
    description: "Repos, issues, and MRs — changes with your approval",
    category: "developer",
    authMethod: "oauth",
  },
  {
    id: "vercel",
    providerKey: "vercel",
    name: "Vercel",
    description: "Deployments and projects in view",
    category: "developer",
    authMethod: "oauth",
  },
  {
    id: "supabase",
    providerKey: "supabase",
    name: "Supabase",
    description: "Your own projects and databases in view",
    category: "developer",
    authMethod: "api_key",
  },
  {
    id: "resend",
    providerKey: "resend",
    name: "Resend",
    description: "Your own email sending — domains and logs in view",
    category: "developer",
    authMethod: "api_key",
  },
  {
    id: "sanity",
    providerKey: "sanity",
    name: "Sanity",
    description: "Content documents — edit with your approval",
    category: "developer",
    authMethod: "api_key",
  },
  {
    id: "firecrawl",
    providerKey: "firecrawl",
    name: "Firecrawl",
    description: "Web scraping and crawling on demand",
    category: "developer",
    authMethod: "api_key",
  },
  {
    id: "openrouter",
    providerKey: "openrouter",
    name: "OpenRouter",
    description: "Your own model usage and credits in view",
    category: "developer",
    authMethod: "api_key",
  },
  {
    id: "docker-hub",
    providerKey: "dockerhub",
    name: "Docker Hub",
    description: "Images and repositories in view",
    category: "developer",
    authMethod: "oauth",
  },
  {
    id: "cursor",
    providerKey: "cursor",
    name: "Cursor",
    description: "Usage and team settings in view",
    category: "developer",
    authMethod: "oauth",
  },
  {
    id: "composio",
    providerKey: "composio",
    name: "Composio",
    description: "Your own toolkits and connections in view",
    category: "developer",
    authMethod: "api_key",
  },
  // AI
  {
    id: "elevenlabs",
    providerKey: "elevenlabs",
    name: "ElevenLabs",
    description: "Voice generation — create audio with your approval",
    category: "ai",
    authMethod: "api_key",
  },
  {
    id: "heygen",
    providerKey: "heygen",
    name: "HeyGen",
    description: "Video generation — create videos with your approval",
    category: "ai",
    authMethod: "api_key",
  },
  // Location
  {
    id: "google-maps",
    providerKey: "googlemaps",
    name: "Google Maps",
    description: "Places, reviews, and business listings in view",
    category: "location",
    authMethod: "oauth",
  },
  // Property & 3D
  {
    id: "matterport",
    providerKey: "matterport",
    name: "Matterport",
    description: "3D spaces and virtual tours in view",
    category: "property",
    authMethod: "oauth",
  },
  // Security
  {
    id: "onepassword",
    providerKey: "onepassword",
    name: "1Password",
    description: "Shared vault items in view — never your master password",
    category: "security",
    authMethod: "oauth",
  },
  // Delivery
  {
    id: "instacart",
    providerKey: "instacart",
    name: "Instacart",
    description: "Orders — place with your approval",
    category: "delivery",
    authMethod: "oauth",
  },
] as const;

const PHASE_2_ENTRIES: readonly ConnectorDefinition[] = PHASE_2_CONNECTORS.map(
  (spec) => ({
    ...spec,
    ownership: "composio",
    phase: "2",
    showInCatalog: true,
    comingSoon: true,
    composioProviders: [spec.providerKey],
  }),
);

export const CONNECTOR_CATALOG: readonly ConnectorDefinition[] = [
  {
    id: "google",
    providerKey: "gmail",
    name: "Gmail",
    description: "Email — search, read, and send with your approval",
    category: "recommended",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1a",
    showInCatalog: true,
    composioProviders: ["gmail"],
  },
  {
    id: "google-calendar",
    providerKey: "googlecalendar",
    name: "Google Calendar",
    description: "Events and availability — scheduling with your approval",
    category: "recommended",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1a",
    showInCatalog: true,
    composioProviders: ["googlecalendar"],
  },
  {
    id: "google-drive",
    providerKey: "googledrive",
    name: "Google Drive",
    description: "Files and folders — Salt organizes with your approval",
    category: "files",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1b",
    showInCatalog: true,
    composioProviders: ["googledrive"],
  },
  {
    id: "google-docs",
    providerKey: "googledocs",
    name: "Google Docs",
    description: "Documents — read, draft, and update with your approval",
    category: "files",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1b",
    showInCatalog: true,
    composioProviders: ["googledocs"],
  },
  {
    id: "google-sheets",
    providerKey: "googlesheets",
    name: "Google Sheets",
    description: "Spreadsheets — read data and add rows with your approval",
    category: "files",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1b",
    showInCatalog: true,
    composioProviders: ["googlesheets"],
  },
  {
    id: "google-slides",
    providerKey: "googleslides",
    name: "Google Slides",
    description: "Presentations — read and create decks with your approval",
    category: "files",
    ownership: "composio",
    authMethod: "oauth",
    phase: "1b",
    showInCatalog: true,
    composioProviders: ["googleslides"],
  },
  {
    id: "stripe",
    providerKey: "stripe",
    name: "Stripe",
    description: "Revenue, invoices, and subscriptions — with your approval",
    category: "payments",
    ownership: "composio",
    authMethod: "api_key",
    phase: "1c",
    showInCatalog: true,
    composioProviders: ["stripe"],
  },
  ...PHASE_2_ENTRIES,
] as const;

export const CONNECTOR_CATALOG_BY_ID = Object.fromEntries(
  CONNECTOR_CATALOG.map((entry) => [entry.id, entry]),
) as Record<
  ConnectorDefinition["id"],
  ConnectorDefinition
>;

export function getCatalogConnectors(): ConnectorDefinition[] {
  return CONNECTOR_CATALOG.filter((entry) => entry.showInCatalog);
}

/** All catalog categories in display order. */
export function getCatalogCategories(): ConnectorDefinition["category"][] {
  return [
    "recommended",
    "payments",
    "communication",
    "scheduling",
    "meetings",
    "productivity",
    "files",
    "documents",
    "forms",
    "social",
    "marketing",
    "analytics",
    "crm",
    "design",
    "website",
    "developer",
    "ai",
    "location",
    "property",
    "security",
    "delivery",
  ];
}
