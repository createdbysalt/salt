import type { IconType } from "react-icons";
import {
  SiAirtable,
  SiAsana,
  SiCalendly,
  SiClickup,
  SiConfluence,
  SiDropbox,
  SiFigma,
  SiGithub,
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
  SiHubspot,
  SiIntercom,
  SiJira,
  SiLinear,
  SiMiro,
  SiNotion,
  SiQuickbooks,
  SiSalesforce,
  SiSlack,
  SiStripe,
  SiTrello,
  SiXero,
  SiZendesk,
  SiZoom,
} from "react-icons/si";

/** Brands with Composio toolkits (https://composio.dev/toolkits). */
export type ComposioBrand = {
  slug: string;
  label: string;
  Icon: IconType;
  color: string;
};

export const COMPOSIO_BRANDS: ComposioBrand[] = [
  { slug: "gmail", label: "Gmail", Icon: SiGmail, color: "text-[#EA4335]" },
  { slug: "googlecalendar", label: "Google Calendar", Icon: SiGooglecalendar, color: "text-[#4285F4]" },
  { slug: "slack", label: "Slack", Icon: SiSlack, color: "text-[#4A154B]" },
  { slug: "stripe", label: "Stripe", Icon: SiStripe, color: "text-[#635BFF]" },
  { slug: "notion", label: "Notion", Icon: SiNotion, color: "text-foreground" },
  { slug: "hubspot", label: "HubSpot", Icon: SiHubspot, color: "text-[#FF7A59]" },
  { slug: "salesforce", label: "Salesforce", Icon: SiSalesforce, color: "text-[#00A1E0]" },
  { slug: "figma", label: "Figma", Icon: SiFigma, color: "text-[#F24E1E]" },
  { slug: "asana", label: "Asana", Icon: SiAsana, color: "text-[#F06A6A]" },
  { slug: "zoom", label: "Zoom", Icon: SiZoom, color: "text-[#0B5CFF]" },
  { slug: "airtable", label: "Airtable", Icon: SiAirtable, color: "text-[#18BFFF]" },
  { slug: "github", label: "GitHub", Icon: SiGithub, color: "text-foreground" },
  { slug: "linear", label: "Linear", Icon: SiLinear, color: "text-[#5E6AD2]" },
  { slug: "jira", label: "Jira", Icon: SiJira, color: "text-[#0052CC]" },
  { slug: "googledrive", label: "Google Drive", Icon: SiGoogledrive, color: "text-[#4285F4]" },
  { slug: "trello", label: "Trello", Icon: SiTrello, color: "text-[#0052CC]" },
  { slug: "dropbox", label: "Dropbox", Icon: SiDropbox, color: "text-[#0061FF]" },
  { slug: "intercom", label: "Intercom", Icon: SiIntercom, color: "text-[#286EFA]" },
  { slug: "calendly", label: "Calendly", Icon: SiCalendly, color: "text-[#006BFF]" },
  { slug: "clickup", label: "ClickUp", Icon: SiClickup, color: "text-[#7B68EE]" },
  { slug: "quickbooks", label: "QuickBooks", Icon: SiQuickbooks, color: "text-[#2CA01C]" },
  { slug: "xero", label: "Xero", Icon: SiXero, color: "text-[#13B5EA]" },
  { slug: "zendesk", label: "Zendesk", Icon: SiZendesk, color: "text-[#03363D]" },
  { slug: "confluence", label: "Confluence", Icon: SiConfluence, color: "text-[#172B4D]" },
  { slug: "miro", label: "Miro", Icon: SiMiro, color: "text-[#050038]" },
];

/** Household-name toolkits for marquee and connect-grid (4 rows × 5 cols). */
const FAMOUS_BRAND_SLUGS = [
  "gmail",
  "slack",
  "zoom",
  "stripe",
  "notion",
  "googledrive",
  "googlecalendar",
  "dropbox",
  "salesforce",
  "hubspot",
  "figma",
  "asana",
  "trello",
  "github",
  "jira",
  "airtable",
  "calendly",
  "zendesk",
  "quickbooks",
  "miro",
] as const;

export const FAMOUS_COMPOSIO_BRANDS: ComposioBrand[] = FAMOUS_BRAND_SLUGS.map((slug) => {
  const brand = COMPOSIO_BRANDS.find((b) => b.slug === slug);
  if (!brand) throw new Error(`Unknown famous Composio brand: ${slug}`);
  return brand;
});

export function composioBrand(slug: string): ComposioBrand {
  const brand = COMPOSIO_BRANDS.find((b) => b.slug === slug);
  if (!brand) throw new Error(`Unknown Composio brand: ${slug}`);
  return brand;
}
