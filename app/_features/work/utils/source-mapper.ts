import type { EntitySourceMeta, SourceOrigin, SourceProvider } from "@/app/_features/memory/types/source-meta";

/** Providers that can sync work records */
export type WorkProvider =
  | "manual"
  | "asana"
  | "linear"
  | "jira"
  | "clickup"
  | "monday"
  | "trello"
  | "notion"
  | "airtable"
  | "github"
  | "google-docs"
  | "google-sheets"
  | "hubspot"
  | "salesforce"
  | "pipedrive";

/** Provider display metadata */
export type WorkProviderDisplay = {
  label: string;
  icon?: string;
};

const PROVIDER_DISPLAY: Record<WorkProvider, WorkProviderDisplay> = {
  manual: { label: "Manual" },
  asana: { label: "Asana" },
  linear: { label: "Linear" },
  jira: { label: "Jira" },
  clickup: { label: "ClickUp" },
  monday: { label: "Monday" },
  trello: { label: "Trello" },
  notion: { label: "Notion" },
  airtable: { label: "Airtable" },
  github: { label: "GitHub" },
  "google-docs": { label: "Google Docs" },
  "google-sheets": { label: "Google Sheets" },
  hubspot: { label: "HubSpot" },
  salesforce: { label: "Salesforce" },
  pipedrive: { label: "Pipedrive" },
};

export function getWorkProviderDisplay(provider: WorkProvider): WorkProviderDisplay {
  return PROVIDER_DISPLAY[provider] ?? { label: provider };
}

type WorkSourceKind = "user" | "imported" | "salt_inferred";

/**
 * Map work provider to unified SourceProvider
 */
function mapProvider(provider: WorkProvider): SourceProvider {
  return provider as SourceProvider;
}

/**
 * Map legacy source kind to unified SourceOrigin
 */
function mapSourceKindToOrigin(source: WorkSourceKind): SourceOrigin {
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

export type WorkDetailForSource = {
  source: WorkSourceKind;
  provider?: WorkProvider;
  origin?: SourceOrigin;
  appUrl?: string | null;
  captureSourceUrl?: string | null;
  sourceExternalId?: string | null;
  extraction?: { sourceDocId?: string } | null;
  sourceReclassifiedAsManual?: boolean;
};

/**
 * Detect if this work record was extracted by Ask Salt.
 * Non-manual providers always win — user can reclassify an extraction as synced/found.
 */
function isAskSaltExtraction(work: WorkDetailForSource): boolean {
  if (work.sourceReclassifiedAsManual) {
    return false;
  }

  if (work.provider && work.provider !== "manual") {
    return false;
  }

  if (work.origin === "found") {
    return false;
  }

  return Boolean(
    work.extraction ||
    work.captureSourceUrl ||
    work.source === "salt_inferred"
  );
}

/** Whether the record currently shows as a Salt extraction (before user override). */
export function isWorkExtractionDisplay(work: WorkDetailForSource): boolean {
  return isAskSaltExtraction(work);
}

/**
 * Build EntitySourceMeta from work data
 */
export function buildWorkSourceMeta(
  data: WorkDetailForSource,
  options?: { providerChanged?: boolean }
): EntitySourceMeta {
  const provider = data.provider ?? "manual";
  const providerDisplay = getWorkProviderDisplay(provider);

  // Check if this was extracted by Ask Salt (from email, document, etc.)
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

  // Synced from external provider (PM tool, CRM deal, etc.)
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
 * Build additional links for work (capture source, project docs)
 */
export function buildWorkAdditionalLinks(
  work: WorkDetailForSource
): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];

  const isExtraction = isAskSaltExtraction(work);

  // For extractions, show capture as secondary when user set a different appUrl
  if (
    isExtraction &&
    work.captureSourceUrl &&
    work.appUrl &&
    work.captureSourceUrl !== work.appUrl
  ) {
    links.push({
      label: "View original capture",
      url: work.captureSourceUrl,
    });
  }

  // For synced records, capture is supplementary
  if (!isExtraction && work.captureSourceUrl && work.appUrl) {
    links.push({
      label: "View original capture",
      url: work.captureSourceUrl,
    });
  }

  return links;
}
