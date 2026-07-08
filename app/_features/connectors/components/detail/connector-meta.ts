/**
 * Curated display metadata for connector detail surfaces (modal + page).
 * Plain data module — safe to import from server and client components.
 */

import type { ConnectorCatalogId } from "@/app/_features/connectors";

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

const CONNECTOR_META: Partial<Record<ConnectorCatalogId, ConnectorMeta>> = {
  google: {
    displayName: "Gmail",
    tagline: "Search, read, and send email — sends only after you approve.",
    developedBy: "Google",
    links: [
      { label: "Website", href: "https://www.google.com/gmail/about/" },
      {
        label: "Documentation",
        href: "https://developers.google.com/workspace/gmail/api/guides",
      },
      { label: "Support", href: "https://support.google.com/mail" },
    ],
  },
  "google-calendar": {
    displayName: "Google Calendar",
    tagline: "Events and availability — Salt schedules only with your approval.",
    developedBy: "Google",
    links: [
      { label: "Website", href: "https://calendar.google.com" },
      {
        label: "Documentation",
        href: "https://developers.google.com/workspace/calendar/api/guides/overview",
      },
      { label: "Support", href: "https://support.google.com/calendar" },
    ],
  },
  stripe: {
    displayName: "Stripe",
    tagline: "Revenue, invoices, and subscriptions — Salt acts only with your approval.",
    developedBy: "Stripe",
    links: [
      { label: "Website", href: "https://stripe.com" },
      { label: "Documentation", href: "https://docs.stripe.com/keys" },
      { label: "Support", href: "https://support.stripe.com" },
    ],
  },
  "google-drive": {
    displayName: "Google Drive",
    tagline: "Files and shared documents for client work.",
    developedBy: "Google",
    links: [
      { label: "Website", href: "https://www.google.com/drive/" },
      {
        label: "Documentation",
        href: "https://developers.google.com/workspace/drive/api/guides/about-sdk",
      },
      { label: "Support", href: "https://support.google.com/drive" },
    ],
  },
};

export function getConnectorMeta(
  connectorId: ConnectorCatalogId,
  fallbackName: string,
  fallbackDescription: string,
): ConnectorMeta {
  return (
    CONNECTOR_META[connectorId] ?? {
      displayName: fallbackName,
      tagline: fallbackDescription,
      developedBy: fallbackName,
      links: [],
    }
  );
}
