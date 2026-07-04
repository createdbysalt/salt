import type { EntitySourceMeta, SourceOrigin, SourceProvider } from "@/app/_features/memory/types/source-meta";
import type { SourceKind } from "@/app/_lib/demo/people-demo-data";

/** Providers that can sync organization records */
export type OrgProvider =
  | "manual"
  | "hubspot"
  | "salesforce"
  | "pipedrive"
  | "stripe"
  | "quickbooks"
  | "square"
  | "notion"
  | "airtable"
  | "gmail"
  | "outlook"
  | "slack"
  | "linear";

/** Provider display metadata */
export type OrgProviderDisplay = {
  label: string;
  icon?: string;
};

const PROVIDER_DISPLAY: Record<OrgProvider, OrgProviderDisplay> = {
  manual: { label: "Manual" },
  hubspot: { label: "HubSpot" },
  salesforce: { label: "Salesforce" },
  pipedrive: { label: "Pipedrive" },
  stripe: { label: "Stripe" },
  quickbooks: { label: "QuickBooks" },
  square: { label: "Square" },
  notion: { label: "Notion" },
  airtable: { label: "Airtable" },
  gmail: { label: "Gmail" },
  outlook: { label: "Outlook" },
  slack: { label: "Slack" },
  linear: { label: "Linear" },
};

export function getOrgProviderDisplay(provider: OrgProvider): OrgProviderDisplay {
  return PROVIDER_DISPLAY[provider] ?? { label: provider };
}

/**
 * Map org provider to unified SourceProvider
 */
function mapProvider(provider: OrgProvider): SourceProvider {
  return provider as SourceProvider;
}

/**
 * Map legacy SourceKind to unified SourceOrigin
 */
function mapSourceKindToOrigin(source: SourceKind): SourceOrigin {
  switch (source) {
    case "imported":
      return "imported";
    case "salt_inferred":
      return "extracted";
    case "user":
    default:
      return "created";
  }
}

export type OrgDetailForSource = {
  source: SourceKind;
  provider?: OrgProvider;
  origin?: SourceOrigin;
  appUrl?: string | null;
  captureSourceUrl?: string | null;
  sourceExternalId?: string | null;
  extraction?: { sourceDocId?: string } | null;
  sourceReclassifiedAsManual?: boolean;
};

/**
 * Detect if this org record was extracted by Ask Salt.
 * Non-manual providers always win — user can reclassify an extraction as synced/found.
 */
function isAskSaltExtraction(org: OrgDetailForSource): boolean {
  if (org.sourceReclassifiedAsManual) {
    return false;
  }

  if (org.provider && org.provider !== "manual") {
    return false;
  }

  if (org.origin === "found") {
    return false;
  }

  return Boolean(
    org.extraction ||
    org.captureSourceUrl ||
    org.source === "salt_inferred"
  );
}

/** Whether the record currently shows as a Salt extraction (before user override). */
export function isOrgExtractionDisplay(org: OrgDetailForSource): boolean {
  return isAskSaltExtraction(org);
}

/**
 * Build EntitySourceMeta from org data
 */
export function buildOrgSourceMeta(
  data: OrgDetailForSource,
  options?: { providerChanged?: boolean }
): EntitySourceMeta {
  const provider = data.provider ?? "manual";
  const providerDisplay = getOrgProviderDisplay(provider);

  // Check if this was extracted by Ask Salt (from invoice, email, etc.)
  if (isAskSaltExtraction(data)) {
    const sourceUrl = data.appUrl ?? data.captureSourceUrl ?? undefined;
    return {
      provider: "manual",
      origin: "extracted",
      sourceUrl,
      externalId: data.sourceExternalId ?? undefined,
      sourceLabel: sourceUrl
        ? data.appUrl
          ? "View source link"
          : "View original email thread"
        : undefined,
    };
  }

  // Synced from external provider (CRM, billing system, etc.)
  if (provider !== "manual") {
    return {
      provider: mapProvider(provider),
      origin: "found",
      sourceUrl: data.appUrl ?? undefined,
      externalId: data.sourceExternalId ?? undefined,
      sourceLabel: data.appUrl
        ? `View in ${providerDisplay.label}`
        : undefined,
    };
  }

  // Manually added by user
  return {
    provider: "manual",
    origin: mapSourceKindToOrigin(data.source),
    sourceUrl: data.appUrl ?? undefined,
    externalId: data.sourceExternalId ?? undefined,
  };
}

/**
 * Build additional links for org (capture source, company profiles)
 */
export function buildOrgAdditionalLinks(
  org: OrgDetailForSource
): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];

  const isExtraction = isAskSaltExtraction(org);

  // For extractions, show capture as secondary when user set a different appUrl
  if (
    isExtraction &&
    org.captureSourceUrl &&
    org.appUrl &&
    org.captureSourceUrl !== org.appUrl
  ) {
    links.push({
      label: "View original capture",
      url: org.captureSourceUrl,
    });
  }

  // For synced records, capture is supplementary
  if (!isExtraction && org.captureSourceUrl && org.appUrl) {
    links.push({
      label: "View original capture",
      url: org.captureSourceUrl,
    });
  }

  return links;
}
