import type { SourcePickerOption } from "@/app/_features/memory/components/SourceMetaSection";
import { getOriginLabel, getProviderDisplay } from "@/app/_features/memory/utils/provider-display";
import type { PersonProvider, PersonDetailForSource } from "./source-mapper";
import { isPersonExtractionDisplay } from "./source-mapper";

export const PERSON_CONNECTOR_PROVIDERS: PersonProvider[] = [
  "gmail",
  "outlook",
  "google-calendar",
  "hubspot",
  "salesforce",
  "pipedrive",
  "slack",
  "calendly",
  "calcom",
  "zoom",
  "notion",
  "linear",
];

export function personHasExtractionHistory(
  person: PersonDetailForSource,
): boolean {
  return Boolean(
    person.extraction ||
    person.captureSourceUrl ||
    person.source === "salt_inferred"
  );
}

export function buildPersonSourcePickerOptions(
  person: PersonDetailForSource,
): SourcePickerOption[] {
  const options: SourcePickerOption[] = [];

  if (personHasExtractionHistory(person)) {
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

  for (const provider of PERSON_CONNECTOR_PROVIDERS) {
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

export function resolvePersonSourceOptionId(
  person: PersonDetailForSource,
): string {
  if (person.sourceReclassifiedAsManual) {
    return "manual";
  }

  if (
    isPersonExtractionDisplay({
      ...person,
      sourceReclassifiedAsManual: false,
    })
  ) {
    return "salt";
  }

  if (!person.provider || person.provider === "manual") {
    return "manual";
  }

  return person.provider;
}
