import { Plug } from "lucide-react";
import Image from "next/image";
import type { ConnectorCatalogId } from "../types";

export interface ConnectorIconMeta {
  src: string;
  color?: string;
}

/**
 * All connectors with downloaded Brandfetch logos.
 * Logos live in public/connectors/{id}.png
 */
const CONNECTOR_LOGOS: Record<string, ConnectorIconMeta> = {
  // Core Google
  google: { src: "/connectors/google.png", color: "#EA4335" },
  "google-calendar": { src: "/connectors/google-calendar.png", color: "#4285F4" },
  "google-drive": { src: "/connectors/google-drive.png", color: "#4285F4" },
  "google-docs": { src: "/connectors/google-docs.png", color: "#4285F4" },
  "google-sheets": { src: "/connectors/google-sheets.png", color: "#34A853" },
  "google-slides": { src: "/connectors/google-slides.png", color: "#FBBC04" },
  "google-ads": { src: "/connectors/google-ads.png", color: "#4285F4" },
  "google-analytics": { src: "/connectors/google-analytics.png", color: "#E37400" },
  "google-search-console": { src: "/connectors/google-search-console.png", color: "#4285F4" },
  "google-tag-manager": { src: "/connectors/google-tag-manager.png", color: "#4285F4" },
  "google-maps": { src: "/connectors/google-maps.png", color: "#4285F4" },

  // Payments & Finance
  stripe: { src: "/connectors/stripe.png", color: "#635BFF" },
  quickbooks: { src: "/connectors/quickbooks.png", color: "#2CA01C" },
  square: { src: "/connectors/square.png", color: "#000000" },
  shopify: { src: "/connectors/shopify.png", color: "#96BF48" },
  "lemon-squeezy": { src: "/connectors/lemon-squeezy.png", color: "#FFC233" },
  ramp: { src: "/connectors/ramp.png", color: "#F2E307" },
  mercury: { src: "/connectors/mercury.png", color: "#5C54FF" },

  // Social
  instagram: { src: "/connectors/instagram.png", color: "#E4405F" },
  linkedin: { src: "/connectors/linkedin.png", color: "#0A66C2" },
  x: { src: "/connectors/x.png", color: "#000000" },
  facebook: { src: "/connectors/facebook.png", color: "#1877F2" },
  tiktok: { src: "/connectors/tiktok.png", color: "#000000" },
  youtube: { src: "/connectors/youtube.png", color: "#FF0000" },
  reddit: { src: "/connectors/reddit.png", color: "#FF4500" },

  // Marketing
  "meta-ads": { src: "/connectors/meta-ads.png", color: "#1877F2" },
  "linkedin-ads": { src: "/connectors/linkedin-ads.png", color: "#0A66C2" },
  "reddit-ads": { src: "/connectors/reddit-ads.png", color: "#FF4500" },
  mailchimp: { src: "/connectors/mailchimp.png", color: "#FFE01B" },
  kit: { src: "/connectors/kit.png", color: "#FB6970" },
  semrush: { src: "/connectors/semrush.png", color: "#FF622D" },

  // Analytics
  posthog: { src: "/connectors/posthog.png", color: "#1D4AFF" },
  pagespeed: { src: "/connectors/pagespeed.png", color: "#4285F4" },

  // Communication
  slack: { src: "/connectors/slack.png", color: "#4A154B" },
  zoom: { src: "/connectors/zoom.png", color: "#2D8CFF" },
  whatsapp: { src: "/connectors/whatsapp.png", color: "#25D366" },
  telegram: { src: "/connectors/telegram.png", color: "#26A5E4" },
  discord: { src: "/connectors/discord.png", color: "#5865F2" },
  outlook: { src: "/connectors/outlook.png", color: "#0078D4" },

  // Productivity
  notion: { src: "/connectors/notion.png", color: "#000000" },
  linear: { src: "/connectors/linear.png", color: "#5E6AD2" },
  asana: { src: "/connectors/asana.png", color: "#F06A6A" },
  clickup: { src: "/connectors/clickup.png", color: "#7B68EE" },
  trello: { src: "/connectors/trello.png", color: "#0052CC" },
  monday: { src: "/connectors/monday.png", color: "#FF3D57" },
  basecamp: { src: "/connectors/basecamp.png", color: "#1D2D35" },
  airtable: { src: "/connectors/airtable.png", color: "#18BFFF" },
  jira: { src: "/connectors/jira.png", color: "#0052CC" },
  wrike: { src: "/connectors/wrike.png", color: "#08CF65" },
  miro: { src: "/connectors/miro.png", color: "#FFD02F" },

  // Files
  onedrive: { src: "/connectors/onedrive.png", color: "#0078D4" },
  excel: { src: "/connectors/excel.png", color: "#217346" },
  word: { src: "/connectors/word.png", color: "#2B579A" },
  powerpoint: { src: "/connectors/powerpoint.png", color: "#D24726" },
  dropbox: { src: "/connectors/dropbox.png", color: "#0061FF" },

  // Documents
  docusign: { src: "/connectors/docusign.png", color: "#FFCC22" },
  pandadoc: { src: "/connectors/pandadoc.png", color: "#4FCE5D" },
  "dropbox-sign": { src: "/connectors/dropbox-sign.png", color: "#0061FF" },

  // Forms
  typeform: { src: "/connectors/typeform.png", color: "#262627" },
  jotform: { src: "/connectors/jotform.png", color: "#FF6100" },
  tally: { src: "/connectors/tally.png", color: "#000000" },

  // Scheduling
  calendly: { src: "/connectors/calendly.png", color: "#006BFF" },
  calcom: { src: "/connectors/calcom.png", color: "#292929" },

  // Meetings
  fireflies: { src: "/connectors/fireflies.png", color: "#6C3BF5" },
  granola: { src: "/connectors/granola.png", color: "#FF5C00" },

  // CRM
  hubspot: { src: "/connectors/hubspot.png", color: "#FF7A59" },
  salesforce: { src: "/connectors/salesforce.png", color: "#00A1E0" },
  pipedrive: { src: "/connectors/pipedrive.png", color: "#1A1A1A" },
  "pipeline-crm": { src: "/connectors/pipeline-crm.png", color: "#4A90D9" },
  "followup-boss": { src: "/connectors/followup-boss.png", color: "#F15A29" },
  apollo: { src: "/connectors/apollo.png", color: "#5850EC" },

  // Design
  canva: { src: "/connectors/canva.png", color: "#00C4CC" },
  figma: { src: "/connectors/figma.png", color: "#F24E1E" },
  brandfetch: { src: "/connectors/brandfetch.png", color: "#0066FF" },

  // Website
  webflow: { src: "/connectors/webflow.png", color: "#4353FF" },
  wix: { src: "/connectors/wix.png", color: "#0C6EFC" },

  // Developer
  github: { src: "/connectors/github.png", color: "#181717" },
  gitlab: { src: "/connectors/gitlab.png", color: "#FC6D26" },
  vercel: { src: "/connectors/vercel.png", color: "#000000" },
  supabase: { src: "/connectors/supabase.png", color: "#3FCF8E" },
  resend: { src: "/connectors/resend.png", color: "#000000" },
  sanity: { src: "/connectors/sanity.png", color: "#F03E2F" },
  firecrawl: { src: "/connectors/firecrawl.png", color: "#FF6B00" },
  openrouter: { src: "/connectors/openrouter.png", color: "#6366F1" },
  "docker-hub": { src: "/connectors/docker-hub.png", color: "#2496ED" },
  cursor: { src: "/connectors/cursor.png", color: "#000000" },
  composio: { src: "/connectors/composio.png", color: "#6366F1" },

  // AI
  elevenlabs: { src: "/connectors/elevenlabs.png", color: "#000000" },
  heygen: { src: "/connectors/heygen.png", color: "#5046E5" },

  // Location
  matterport: { src: "/connectors/matterport.png", color: "#E5007D" },

  // Security
  onepassword: { src: "/connectors/onepassword.png", color: "#0572EC" },

  // Delivery
  instacart: { src: "/connectors/instacart.png", color: "#43B02A" },
};

interface ConnectorIconProps {
  id: ConnectorCatalogId;
  size?: number;
  className?: string;
}

export function ConnectorIcon({ id, size = 24, className }: ConnectorIconProps) {
  const logo = CONNECTOR_LOGOS[id];

  if (!logo) {
    return <Plug className={className} style={{ width: size, height: size }} />;
  }

  return (
    <Image
      src={logo.src}
      alt={id}
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}

export function getConnectorColor(id: ConnectorCatalogId): string | undefined {
  return CONNECTOR_LOGOS[id]?.color;
}
