import type { SourcePickerOption } from "@/app/_features/memory/components/SourceMetaSection";
import { getOriginLabel, getProviderDisplay } from "@/app/_features/memory/utils/provider-display";
import type { OrgProvider, OrgDetailForSource } from "./source-mapper";
import { isOrgExtractionDisplay } from "./source-mapper";

export const ORG_CONNECTOR_PROVIDERS: OrgProvider[] = [
  "hubspot",
  "salesforce",
  "pipedrive",
  "stripe",
  "quickbooks",
  "square",
  "notion",
  "airtable",
  "gmail",
  "outlook",
  "slack",
  "linear",
];

export function orgHasExtractionHistory(
  org: OrgDetailForSource,
): boolean {
  return Boolean(
    org.extraction ||
    org.captureSourceUrl ||
    org.source === "salt_inferred"
  );
}

export function buildOrgSourcePickerOptions(
  org: OrgDetailForSource,
): SourcePickerOption[] {
  const options: SourcePickerOption[] = [];

  if (orgHasExtractionHistory(org)) {
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

  for (const provider of ORG_CONNECTOR_PROVIDERS) {
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

export function resolveOrgSourceOptionId(
  org: OrgDetailForSource,
): string {
  if (org.sourceReclassifiedAsManual) {
    return "manual";
  }

  if (
    isOrgExtractionDisplay({
      ...org,
      sourceReclassifiedAsManual: false,
    })
  ) {
    return "salt";
  }

  if (!org.provider || org.provider === "manual") {
    return "manual";
  }

  return org.provider;
}
