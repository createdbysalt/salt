import type { EntitySourceMeta, SourceOrigin, SourceProvider } from "@/app/_features/memory/types/source-meta";
import type { BillingDetailViewModel } from "../detail-types";
import type { BillingProvider } from "../data";

/**
 * Map billing provider to unified SourceProvider
 */
function mapProvider(provider: BillingProvider): SourceProvider {
  return provider as SourceProvider;
}

/**
 * Detect if this billing record was extracted by Ask Salt.
 * Non-manual providers always win — user can reclassify an extraction as synced/found.
 */
function isAskSaltExtraction(billing: BillingDetailViewModel): boolean {
  if (billing.sourceReclassifiedAsManual) {
    return false;
  }

  if (billing.provider !== "manual" || billing.origin === "found") {
    return false;
  }

  return Boolean(
    billing.extraction ||
    billing.captureSourceUrl ||
    billing.documentUrl
  );
}

/** Whether the record currently shows as a Salt extraction (before user override). */
export function isBillingExtractionDisplay(billing: BillingDetailViewModel): boolean {
  return isAskSaltExtraction(billing);
}

/**
 * Build EntitySourceMeta from billing detail view model
 */
export function buildBillingSourceMeta(
  billing: BillingDetailViewModel,
): EntitySourceMeta {
  // Check if this was extracted by Ask Salt (from email, PDF, etc.)
  if (isAskSaltExtraction(billing)) {
    const sourceUrl = billing.appUrl ?? billing.captureSourceUrl ?? undefined;
    return {
      provider: "manual", // Still manual provider, but origin tells the story
      origin: "extracted",
      sourceUrl,
      externalId: billing.sourceExternalId ?? undefined,
      sourceLabel: sourceUrl
        ? billing.appUrl
          ? "View source link"
          : "View original email thread"
        : undefined,
    };
  }

  // Synced from external provider (Stripe, QuickBooks, etc.)
  if (billing.provider !== "manual") {
    return {
      provider: mapProvider(billing.provider),
      origin: "found",
      sourceUrl: billing.appUrl ?? undefined,
      externalId: billing.sourceExternalId ?? undefined,
      sourceLabel: billing.appUrl
        ? `View in ${billing.providerDisplay.label}`
        : undefined,
    };
  }

  // Manually added by user
  return {
    provider: "manual",
    origin: "created",
    sourceUrl: billing.appUrl ?? undefined,
    externalId: billing.sourceExternalId ?? undefined,
  };
}

/**
 * Build additional links for billing (document URL only - capture source is primary)
 */
export function buildBillingAdditionalLinks(
  billing: BillingDetailViewModel
): Array<{ label: string; url: string }> {
  const links: Array<{ label: string; url: string }> = [];

  // Document URL (PDF, attachment) as additional link
  if (billing.documentUrl) {
    links.push({
      label: "View attached document",
      url: billing.documentUrl,
    });
  }

  // For extractions, show capture as secondary when user set a different appUrl
  const isExtraction = isAskSaltExtraction(billing);
  if (
    isExtraction &&
    billing.captureSourceUrl &&
    billing.appUrl &&
    billing.captureSourceUrl !== billing.appUrl
  ) {
    links.push({
      label: "View original capture",
      url: billing.captureSourceUrl,
    });
  }

  if (!isExtraction && billing.captureSourceUrl && billing.appUrl) {
    links.push({
      label: "View original capture",
      url: billing.captureSourceUrl,
    });
  }

  return links;
}
