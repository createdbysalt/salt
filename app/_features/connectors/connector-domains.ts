import type { ConnectorDefinition } from "./types";

/**
 * Salt domains — the buckets people actually reason about ("I need my finance
 * tools"), collapsing Composio's 21 raw categories into ~7. This is Salt's
 * taxonomy, not the provider's; the filter UI speaks it. (Founder decision
 * 2026-07-06.)
 */
export type ConnectorDomain =
  | "messaging"
  | "calendars"
  | "files"
  | "finance"
  | "crm"
  | "marketing"
  | "productivity"
  | "other";

export const DOMAIN_ORDER: readonly ConnectorDomain[] = [
  "messaging",
  "calendars",
  "files",
  "finance",
  "crm",
  "marketing",
  "productivity",
  "other",
];

const DOMAIN_LABELS: Record<ConnectorDomain, string> = {
  messaging: "Messaging",
  calendars: "Calendars",
  files: "Files & docs",
  finance: "Finance",
  crm: "CRM",
  marketing: "Marketing",
  productivity: "Productivity",
  other: "Other",
};

export function domainLabel(domain: ConnectorDomain): string {
  return DOMAIN_LABELS[domain];
}

/** Raw Composio category → Salt domain. */
const CATEGORY_TO_DOMAIN: Record<string, ConnectorDomain> = {
  communication: "messaging",
  scheduling: "calendars",
  meetings: "calendars",
  files: "files",
  documents: "files",
  forms: "files",
  payments: "finance",
  crm: "crm",
  marketing: "marketing",
  social: "marketing",
  analytics: "marketing",
  productivity: "productivity",
  design: "productivity",
  developer: "productivity",
  ai: "other",
  delivery: "other",
  location: "other",
  property: "other",
  security: "other",
  website: "other",
};

/**
 * Per-connector overrides — the "recommended" category holds both Gmail
 * (messaging) and Google Calendar (calendars), so it can't map by category.
 */
const PROVIDER_TO_DOMAIN: Record<string, ConnectorDomain> = {
  gmail: "messaging",
  outlook: "messaging",
  googlecalendar: "calendars",
};

export function domainForConnector(definition: ConnectorDefinition): ConnectorDomain {
  const byProvider = definition.providerKey
    ? PROVIDER_TO_DOMAIN[definition.providerKey]
    : undefined;
  return byProvider ?? CATEGORY_TO_DOMAIN[definition.category] ?? "other";
}

/** Domains present in a catalog, in canonical order (drives the chip row). */
export function catalogDomains(
  catalog: readonly ConnectorDefinition[],
): ConnectorDomain[] {
  const present = new Set(catalog.map(domainForConnector));
  return DOMAIN_ORDER.filter((domain) => present.has(domain));
}
