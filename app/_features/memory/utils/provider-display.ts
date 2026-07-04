import type { SourceProvider } from "../types/source-meta";

export type ProviderDisplay = {
  label: string;
  iconSrc?: string;
  color: string;
};

/**
 * Display metadata for all source providers.
 * Icons are stored in /public/connectors/
 */
export const PROVIDER_DISPLAY: Record<SourceProvider, ProviderDisplay> = {
  manual: {
    label: "Added manually",
    color: "#64748B",
  },
  stripe: {
    label: "Stripe",
    iconSrc: "/connectors/stripe.png",
    color: "#635BFF",
  },
  quickbooks: {
    label: "QuickBooks",
    iconSrc: "/connectors/quickbooks.png",
    color: "#2CA01C",
  },
  square: {
    label: "Square",
    iconSrc: "/connectors/square.png",
    color: "#000000",
  },
  shopify: {
    label: "Shopify",
    iconSrc: "/connectors/shopify.png",
    color: "#96BF48",
  },
  lemonsqueezy: {
    label: "Lemon Squeezy",
    iconSrc: "/connectors/lemon-squeezy.png",
    color: "#FFC233",
  },
  mercury: {
    label: "Mercury",
    iconSrc: "/connectors/mercury.png",
    color: "#5C54FF",
  },
  "google-calendar": {
    label: "Google Calendar",
    iconSrc: "/connectors/google-calendar.png",
    color: "#4285F4",
  },
  "google-drive": {
    label: "Google Drive",
    iconSrc: "/connectors/google-drive.png",
    color: "#4285F4",
  },
  "google-docs": {
    label: "Google Docs",
    iconSrc: "/connectors/google-docs.png",
    color: "#4285F4",
  },
  "google-sheets": {
    label: "Google Sheets",
    iconSrc: "/connectors/google-sheets.png",
    color: "#0F9D58",
  },
  gmail: {
    label: "Gmail",
    iconSrc: "/connectors/google.png",
    color: "#EA4335",
  },
  outlook: {
    label: "Outlook",
    iconSrc: "/connectors/outlook.png",
    color: "#0078D4",
  },
  zoom: {
    label: "Zoom",
    iconSrc: "/connectors/zoom.png",
    color: "#2D8CFF",
  },
  fireflies: {
    label: "Fireflies",
    iconSrc: "/connectors/fireflies.png",
    color: "#6366F1",
  },
  slack: {
    label: "Slack",
    iconSrc: "/connectors/slack.png",
    color: "#4A154B",
  },
  notion: {
    label: "Notion",
    iconSrc: "/connectors/notion.png",
    color: "#000000",
  },
  linear: {
    label: "Linear",
    iconSrc: "/connectors/linear.png",
    color: "#5E6AD2",
  },
  github: {
    label: "GitHub",
    iconSrc: "/connectors/github.png",
    color: "#24292F",
  },
  figma: {
    label: "Figma",
    iconSrc: "/connectors/figma.png",
    color: "#F24E1E",
  },
  hubspot: {
    label: "HubSpot",
    iconSrc: "/connectors/hubspot.png",
    color: "#FF7A59",
  },
  salesforce: {
    label: "Salesforce",
    iconSrc: "/connectors/salesforce.png",
    color: "#00A1E0",
  },
  pipedrive: {
    label: "Pipedrive",
    iconSrc: "/connectors/pipedrive.png",
    color: "#1A1A1A",
  },
  airtable: {
    label: "Airtable",
    iconSrc: "/connectors/airtable.png",
    color: "#FCB400",
  },
  asana: {
    label: "Asana",
    iconSrc: "/connectors/asana.png",
    color: "#F06A6A",
  },
  clickup: {
    label: "ClickUp",
    iconSrc: "/connectors/clickup.png",
    color: "#7B68EE",
  },
  monday: {
    label: "Monday.com",
    iconSrc: "/connectors/monday.png",
    color: "#FF3D57",
  },
  trello: {
    label: "Trello",
    iconSrc: "/connectors/trello.png",
    color: "#0052CC",
  },
  jira: {
    label: "Jira",
    iconSrc: "/connectors/jira.png",
    color: "#0052CC",
  },
  docusign: {
    label: "DocuSign",
    iconSrc: "/connectors/docusign.png",
    color: "#FFCC00",
  },
  pandadoc: {
    label: "PandaDoc",
    iconSrc: "/connectors/pandadoc.png",
    color: "#5CB85C",
  },
  calendly: {
    label: "Calendly",
    iconSrc: "/connectors/calendly.png",
    color: "#006BFF",
  },
  calcom: {
    label: "Cal.com",
    iconSrc: "/connectors/calcom.png",
    color: "#292929",
  },
  granola: {
    label: "Granola",
    iconSrc: "/connectors/granola.png",
    color: "#000000",
  },
  recall: {
    label: "Recall.ai",
    color: "#6366F1",
  },
};

export function getProviderDisplay(provider: SourceProvider): ProviderDisplay {
  return PROVIDER_DISPLAY[provider] ?? PROVIDER_DISPLAY.manual;
}

/**
 * Get the origin description for display
 */
export function getOriginLabel(origin: string, providerLabel: string): string {
  switch (origin) {
    case "found":
      return `Found by Salt in ${providerLabel}`;
    case "created":
      return "Added manually";
    case "extracted":
      return "Extracted by Salt from email or document";
    case "imported":
      return "Imported into Salt";
    default:
      return "Unknown source";
  }
}
