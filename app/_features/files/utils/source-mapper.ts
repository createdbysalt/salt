import type {
  EntitySourceMeta,
  SourceOrigin,
  SourceProvider,
} from "@/app/_features/memory/types/source-meta";

/** Providers that can sync file records */
export type FileProvider =
  | "manual"
  | "google-drive"
  | "google-docs"
  | "google-sheets"
  | "notion"
  | "figma"
  | "github"
  | "dropbox"
  | "airtable"
  | "slack"
  | "gmail"
  | "outlook"
  | "docusign"
  | "pandadoc";

/** Provider display metadata */
export type FileProviderDisplay = {
  label: string;
  icon?: string;
};

const PROVIDER_DISPLAY: Record<FileProvider, FileProviderDisplay> = {
  manual: { label: "Uploaded" },
  "google-drive": { label: "Google Drive" },
  "google-docs": { label: "Google Docs" },
  "google-sheets": { label: "Google Sheets" },
  notion: { label: "Notion" },
  figma: { label: "Figma" },
  github: { label: "GitHub" },
  dropbox: { label: "Dropbox" },
  airtable: { label: "Airtable" },
  slack: { label: "Slack" },
  gmail: { label: "Gmail" },
  outlook: { label: "Outlook" },
  docusign: { label: "DocuSign" },
  pandadoc: { label: "PandaDoc" },
};

export function getFileProviderDisplay(provider: FileProvider): FileProviderDisplay {
  return PROVIDER_DISPLAY[provider] ?? { label: provider };
}

type FileSourceKind = "user" | "imported" | "salt_inferred";

/**
 * Map file provider to unified SourceProvider
 */
function mapProvider(provider: FileProvider): SourceProvider {
  return provider as SourceProvider;
}

/**
 * Map legacy source kind to unified SourceOrigin
 */
function mapSourceKindToOrigin(source: FileSourceKind): SourceOrigin {
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

export type FileDetailForSource = {
  source?: FileSourceKind;
  provider?: FileProvider;
  sourceOrigin?: SourceOrigin;
  appUrl?: string | null;
  captureSourceUrl?: string | null;
  sourceExternalId?: string | null;
  extraction?: { sourceDocId?: string } | null;
  sourceReclassifiedAsManual?: boolean;
};

/**
 * Detect if this file record was extracted by Ask Salt.
 * Non-manual providers always win — user can reclassify an extraction as synced/found.
 */
function isAskSaltExtraction(file: FileDetailForSource): boolean {
  if (file.sourceReclassifiedAsManual) {
    return false;
  }

  if (file.provider && file.provider !== "manual") {
    return false;
  }

  if (file.sourceOrigin === "found") {
    return false;
  }

  return Boolean(
    file.extraction ||
    file.captureSourceUrl ||
    file.source === "salt_inferred"
  );
}

/** Whether the record currently shows as a Salt extraction (before user override). */
export function isFileExtractionDisplay(file: FileDetailForSource): boolean {
  return isAskSaltExtraction(file);
}

/**
 * Build EntitySourceMeta from file data
 */
export function buildFileSourceMeta(
  data: FileDetailForSource,
  options?: { providerChanged?: boolean }
): EntitySourceMeta {
  const provider = data.provider ?? "manual";
  const providerDisplay = getFileProviderDisplay(provider);

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

  // Synced from external provider (Drive, Figma, etc.)
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

  // Manually uploaded by user
  const source = data.source ?? "user";
  return {
    provider: "manual",
    origin: mapSourceKindToOrigin(source),
    sourceUrl: data.appUrl ?? undefined,
    externalId: data.sourceExternalId ?? undefined,
  };
}

/**
 * Build additional links for file (capture source, preview links)
 */
export function buildFileAdditionalLinks(
  file: FileDetailForSource
): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];

  const isExtraction = isAskSaltExtraction(file);

  // For extractions, show capture as secondary when user set a different appUrl
  if (
    isExtraction &&
    file.captureSourceUrl &&
    file.appUrl &&
    file.captureSourceUrl !== file.appUrl
  ) {
    links.push({
      label: "View original capture",
      url: file.captureSourceUrl,
    });
  }

  // For synced records, capture is supplementary
  if (!isExtraction && file.captureSourceUrl && file.appUrl) {
    links.push({
      label: "View original capture",
      url: file.captureSourceUrl,
    });
  }

  return links;
}

// ============================================================================
// Source Picker Options (for SourceMetaSection)
// ============================================================================

import type { SourcePickerOption } from "@/app/_features/memory/components/SourceMetaSection";

/** File providers that can be selected in the source picker */
const FILE_PROVIDER_OPTIONS: Array<{ id: FileProvider; label: string; subtitle: string }> = [
  { id: "google-drive", label: "Google Drive", subtitle: "Synced from Drive" },
  { id: "google-docs", label: "Google Docs", subtitle: "Synced from Docs" },
  { id: "google-sheets", label: "Google Sheets", subtitle: "Synced from Sheets" },
  { id: "dropbox", label: "Dropbox", subtitle: "Synced from Dropbox" },
  { id: "notion", label: "Notion", subtitle: "Synced from Notion" },
  { id: "figma", label: "Figma", subtitle: "Synced from Figma" },
  { id: "github", label: "GitHub", subtitle: "Synced from GitHub" },
  { id: "slack", label: "Slack", subtitle: "Shared in Slack" },
  { id: "gmail", label: "Gmail", subtitle: "Email attachment" },
  { id: "outlook", label: "Outlook", subtitle: "Email attachment" },
  { id: "docusign", label: "DocuSign", subtitle: "Signed document" },
  { id: "pandadoc", label: "PandaDoc", subtitle: "Signed document" },
];

/**
 * Build source picker options for a file.
 * Shows "Salt" option if file was extracted, plus provider options.
 */
export function buildFileSourcePickerOptions(
  file: FileDetailForSource
): SourcePickerOption[] {
  const options: SourcePickerOption[] = [];

  // If this file has extraction data, show Salt option
  if (file.extraction || file.captureSourceUrl || file.source === "salt_inferred") {
    options.push({
      id: "salt",
      label: "Salt",
      subtitle: "Extracted by Salt from capture",
      isExtraction: true,
    });
  }

  // Add provider options
  for (const opt of FILE_PROVIDER_OPTIONS) {
    options.push({
      id: opt.id,
      label: opt.label,
      subtitle: opt.subtitle,
      provider: opt.id as SourceProvider,
    });
  }

  // Always include manual option last
  options.push({
    id: "manual",
    label: "Uploaded",
    subtitle: "Manually uploaded",
    provider: "manual",
  });

  return options;
}

/**
 * Resolve the current source option ID for a file.
 * Used to show which option is selected in the picker.
 */
export function resolveFileSourceOptionId(file: FileDetailForSource): string {
  // If reclassified as manual, it's manual
  if (file.sourceReclassifiedAsManual) {
    return "manual";
  }

  // If it's a Salt extraction (not reclassified), return "salt"
  if (isAskSaltExtraction(file)) {
    return "salt";
  }

  // Otherwise return the provider
  return file.provider ?? "manual";
}
