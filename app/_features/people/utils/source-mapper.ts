import type { EntitySourceMeta, SourceOrigin, SourceProvider } from "@/app/_features/memory/types/source-meta";
import type { SourceKind } from "@/app/_lib/demo/people-demo-data";

/** Providers that can sync people records */
export type PersonProvider =
  | "manual"
  | "gmail"
  | "outlook"
  | "google-calendar"
  | "hubspot"
  | "salesforce"
  | "pipedrive"
  | "slack"
  | "notion"
  | "airtable"
  | "calendly"
  | "calcom"
  | "zoom"
  | "fireflies"
  | "linear";

/** Provider display metadata */
export type PersonProviderDisplay = {
  label: string;
  icon?: string;
};

const PROVIDER_DISPLAY: Record<PersonProvider, PersonProviderDisplay> = {
  manual: { label: "Manual" },
  gmail: { label: "Gmail" },
  outlook: { label: "Outlook" },
  "google-calendar": { label: "Google Calendar" },
  hubspot: { label: "HubSpot" },
  salesforce: { label: "Salesforce" },
  pipedrive: { label: "Pipedrive" },
  slack: { label: "Slack" },
  notion: { label: "Notion" },
  airtable: { label: "Airtable" },
  calendly: { label: "Calendly" },
  calcom: { label: "Cal.com" },
  zoom: { label: "Zoom" },
  fireflies: { label: "Fireflies" },
  linear: { label: "Linear" },
};

export function getPersonProviderDisplay(provider: PersonProvider): PersonProviderDisplay {
  return PROVIDER_DISPLAY[provider] ?? { label: provider };
}

/**
 * Map person provider to unified SourceProvider
 */
function mapProvider(provider: PersonProvider): SourceProvider {
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

export type PersonDetailForSource = {
  source: SourceKind;
  provider?: PersonProvider;
  origin?: SourceOrigin;
  appUrl?: string | null;
  captureSourceUrl?: string | null;
  sourceExternalId?: string | null;
  extraction?: { sourceDocId?: string } | null;
  sourceReclassifiedAsManual?: boolean;
};

/**
 * Detect if this person record was extracted by Ask Salt.
 * Non-manual providers always win — user can reclassify an extraction as synced/found.
 */
function isAskSaltExtraction(person: PersonDetailForSource): boolean {
  if (person.sourceReclassifiedAsManual) {
    return false;
  }

  if (person.provider && person.provider !== "manual") {
    return false;
  }

  if (person.origin === "found") {
    return false;
  }

  return Boolean(
    person.extraction ||
    person.captureSourceUrl ||
    person.source === "salt_inferred"
  );
}

/** Whether the record currently shows as a Salt extraction (before user override). */
export function isPersonExtractionDisplay(person: PersonDetailForSource): boolean {
  return isAskSaltExtraction(person);
}

/**
 * Build EntitySourceMeta from person data
 */
export function buildPersonSourceMeta(
  data: PersonDetailForSource,
  options?: { providerChanged?: boolean }
): EntitySourceMeta {
  const provider = data.provider ?? "manual";
  const providerDisplay = getPersonProviderDisplay(provider);

  // Check if this was extracted by Ask Salt (from email, meeting, etc.)
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

  // Synced from external provider (CRM, email, calendar, etc.)
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
 * Build additional links for person (capture source, profile URLs)
 */
export function buildPersonAdditionalLinks(
  person: PersonDetailForSource
): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];

  const isExtraction = isAskSaltExtraction(person);

  // For extractions, show capture as secondary when user set a different appUrl
  if (
    isExtraction &&
    person.captureSourceUrl &&
    person.appUrl &&
    person.captureSourceUrl !== person.appUrl
  ) {
    links.push({
      label: "View original capture",
      url: person.captureSourceUrl,
    });
  }

  // For synced records, capture is supplementary
  if (!isExtraction && person.captureSourceUrl && person.appUrl) {
    links.push({
      label: "View original capture",
      url: person.captureSourceUrl,
    });
  }

  return links;
}
