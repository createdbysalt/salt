import { getVocabularyOptions } from "@/app/_features/memory/taxonomy/registry";

/** Normalize IANA ids for lookup (case + underscore variants). */
function timezoneLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "/");
}

/**
 * Human-readable timezone label matching memory vocabulary / InlineSelect.
 * Accepts canonical IANA (`America/Los_Angeles`) or legacy uppercase forms.
 */
export function formatTimezoneLabel(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  const key = timezoneLookupKey(trimmed);
  const options = getVocabularyOptions("timezone");

  const match = options.find(
    (option) =>
      option.value.toLowerCase() === trimmed.toLowerCase() ||
      timezoneLookupKey(option.value) === key,
  );

  return match?.label ?? trimmed.replace(/_/g, "/");
}

/** Canonical vocabulary slug when known; otherwise trimmed input. */
export function normalizeTimezoneValue(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;

  const trimmed = value.trim();
  const key = timezoneLookupKey(trimmed);
  const options = getVocabularyOptions("timezone");

  const match = options.find(
    (option) =>
      option.value.toLowerCase() === trimmed.toLowerCase() ||
      timezoneLookupKey(option.value) === key,
  );

  return match?.value ?? trimmed;
}
