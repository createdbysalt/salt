import type { SourcePickerOption } from "@/app/_features/memory/components/SourceMetaSection";
import { getOriginLabel, getProviderDisplay } from "@/app/_features/memory/utils/provider-display";
import type { WorkProvider, WorkDetailForSource } from "./source-mapper";
import { isWorkExtractionDisplay } from "./source-mapper";

export const WORK_CONNECTOR_PROVIDERS: WorkProvider[] = [
  "asana",
  "linear",
  "jira",
  "clickup",
  "monday",
  "trello",
  "notion",
  "airtable",
  "github",
  "hubspot",
  "salesforce",
  "pipedrive",
];

export function workHasExtractionHistory(
  work: WorkDetailForSource,
): boolean {
  return Boolean(
    work.extraction ||
    work.captureSourceUrl ||
    work.source === "salt_inferred"
  );
}

export function buildWorkSourcePickerOptions(
  work: WorkDetailForSource,
): SourcePickerOption[] {
  const options: SourcePickerOption[] = [];

  if (workHasExtractionHistory(work)) {
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

  for (const provider of WORK_CONNECTOR_PROVIDERS) {
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

export function resolveWorkSourceOptionId(
  work: WorkDetailForSource,
): string {
  if (work.sourceReclassifiedAsManual) {
    return "manual";
  }

  if (
    isWorkExtractionDisplay({
      ...work,
      sourceReclassifiedAsManual: false,
    })
  ) {
    return "salt";
  }

  if (!work.provider || work.provider === "manual") {
    return "manual";
  }

  return work.provider;
}
