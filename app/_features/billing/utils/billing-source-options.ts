import type { SourcePickerOption } from "@/app/_features/memory/components/SourceMetaSection";
import { getOriginLabel, getProviderDisplay } from "@/app/_features/memory/utils/provider-display";
import type { BillingProvider } from "../data";
import type { BillingDetailViewModel } from "../detail-types";
import { isBillingExtractionDisplay } from "./source-mapper";

export const BILLING_CONNECTOR_PROVIDERS: BillingProvider[] = [
  "stripe",
  "quickbooks",
  "square",
  "shopify",
  "lemonsqueezy",
  "mercury",
];

export function billingRecordHasExtractionHistory(
  billing: BillingDetailViewModel,
): boolean {
  return Boolean(
    billing.extraction ||
    billing.captureSourceUrl ||
    billing.documentUrl,
  );
}

export function buildBillingSourcePickerOptions(
  billing: BillingDetailViewModel,
): SourcePickerOption[] {
  const options: SourcePickerOption[] = [];

  if (billingRecordHasExtractionHistory(billing)) {
    options.push({
      id: "salt",
      label: "Salt",
      subtitle: getOriginLabel("extracted", "Salt"),
      isExtraction: true,
    });
  }

  options.push({
    id: "manual",
    label: getProviderDisplay("manual").label,
    subtitle: getOriginLabel("created", getProviderDisplay("manual").label),
    provider: "manual",
  });

  for (const provider of BILLING_CONNECTOR_PROVIDERS) {
    const display = getProviderDisplay(provider);
    options.push({
      id: provider,
      label: display.label,
      subtitle: getOriginLabel("found", display.label),
      provider,
    });
  }

  return options;
}

export function resolveBillingSourceOptionId(
  billing: BillingDetailViewModel,
): string {
  if (billing.sourceReclassifiedAsManual) {
    return "manual";
  }

  if (
    isBillingExtractionDisplay({
      ...billing,
      sourceReclassifiedAsManual: false,
    })
  ) {
    return "salt";
  }

  if (billing.provider === "manual") {
    return "manual";
  }

  return billing.provider;
}
