import type { EntitySourceMeta, SourceOrigin, SourceProvider } from "@/app/_features/memory/types/source-meta";

/** Providers that can sync meeting records */
export type MeetingProvider =
  | "manual"
  | "google-calendar"
  | "outlook"
  | "calendly"
  | "calcom"
  | "zoom"
  | "fireflies"
  | "granola"
  | "recall"
  | "notion"
  | "hubspot"
  | "salesforce";

/** Provider display metadata */
export type MeetingProviderDisplay = {
  label: string;
  icon?: string;
};

const PROVIDER_DISPLAY: Record<MeetingProvider, MeetingProviderDisplay> = {
  manual: { label: "Manual" },
  "google-calendar": { label: "Google Calendar" },
  outlook: { label: "Outlook" },
  calendly: { label: "Calendly" },
  calcom: { label: "Cal.com" },
  zoom: { label: "Zoom" },
  fireflies: { label: "Fireflies" },
  granola: { label: "Granola" },
  recall: { label: "Recall.ai" },
  notion: { label: "Notion" },
  hubspot: { label: "HubSpot" },
  salesforce: { label: "Salesforce" },
};

export function getMeetingProviderDisplay(provider: MeetingProvider): MeetingProviderDisplay {
  return PROVIDER_DISPLAY[provider] ?? { label: provider };
}

type MeetingSourceKind = "internal" | "google" | "imported";

/**
 * Map meeting provider to unified SourceProvider
 */
function mapProvider(provider: MeetingProvider): SourceProvider {
  return provider as SourceProvider;
}

/**
 * Map legacy origin to unified SourceOrigin
 */
function mapOriginToSourceOrigin(origin: MeetingSourceKind | null | undefined): SourceOrigin {
  switch (origin) {
    case "google":
      return "found";
    case "imported":
      return "imported";
    case "internal":
    default:
      return "created";
  }
}

export type MeetingDetailForSource = {
  origin?: MeetingSourceKind | null;
  provider?: MeetingProvider;
  sourceOrigin?: SourceOrigin;
  appUrl?: string | null;
  captureSourceUrl?: string | null;
  sourceExternalId?: string | null;
  extraction?: { sourceDocId?: string } | null;
  sourceReclassifiedAsManual?: boolean;
  externalProvider?: string | null;
  externalEventId?: string | null;
};

/**
 * Detect if this meeting record was extracted by Ask Salt.
 * Non-manual providers always win — user can reclassify an extraction as synced/found.
 */
function isAskSaltExtraction(meeting: MeetingDetailForSource): boolean {
  if (meeting.sourceReclassifiedAsManual) {
    return false;
  }

  if (meeting.provider && meeting.provider !== "manual") {
    return false;
  }

  if (meeting.sourceOrigin === "found" || meeting.origin === "google") {
    return false;
  }

  return Boolean(
    meeting.extraction ||
    meeting.captureSourceUrl
  );
}

/** Whether the record currently shows as a Salt extraction (before user override). */
export function isMeetingExtractionDisplay(meeting: MeetingDetailForSource): boolean {
  return isAskSaltExtraction(meeting);
}

/**
 * Build EntitySourceMeta from meeting data
 */
export function buildMeetingSourceMeta(
  data: MeetingDetailForSource,
  options?: { providerChanged?: boolean }
): EntitySourceMeta {
  // Determine provider from new field or legacy external_provider
  let provider: MeetingProvider = data.provider ?? "manual";
  if (provider === "manual" && data.externalProvider === "google") {
    provider = "google-calendar";
  }

  const providerDisplay = getMeetingProviderDisplay(provider);

  // Check if this was extracted by Ask Salt
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

  // Synced from external provider (Calendar, Zoom, CRM, etc.)
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
    origin: mapOriginToSourceOrigin(data.origin),
    sourceUrl: data.appUrl ?? undefined,
    externalId: data.sourceExternalId ?? undefined,
  };
}

/**
 * Build additional links for meeting (capture source, recording links)
 */
export function buildMeetingAdditionalLinks(
  meeting: MeetingDetailForSource
): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];

  const isExtraction = isAskSaltExtraction(meeting);

  // For extractions, show capture as secondary when user set a different appUrl
  if (
    isExtraction &&
    meeting.captureSourceUrl &&
    meeting.appUrl &&
    meeting.captureSourceUrl !== meeting.appUrl
  ) {
    links.push({
      label: "View original capture",
      url: meeting.captureSourceUrl,
    });
  }

  // For synced records, capture is supplementary
  if (!isExtraction && meeting.captureSourceUrl && meeting.appUrl) {
    links.push({
      label: "View original capture",
      url: meeting.captureSourceUrl,
    });
  }

  return links;
}
