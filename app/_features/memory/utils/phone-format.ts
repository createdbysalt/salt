import {
  formatPhoneNumberIntl,
  parsePhoneNumber,
  type Country,
} from "react-phone-number-input";

/** Strip to digits for heuristics. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Infer country from an E.164 or partial phone value for defaultCountry on edit.
 */
export function getPhoneDefaultCountry(
  value: string | null | undefined,
  fallback: Country = "US",
): Country {
  if (!value?.trim()) return fallback;

  const parsed = parsePhoneNumber(value);
  if (parsed?.country) return parsed.country;

  const normalized = normalizePhoneForStorage(value, fallback);
  const reparsed = parsePhoneNumber(normalized);
  return reparsed?.country ?? fallback;
}

/**
 * Normalize user input to E.164 when possible.
 * US 10-digit numbers get +1 prefix.
 */
export function normalizePhoneForStorage(
  value: string,
  defaultCountry: Country = "US",
): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const digits = digitsOnly(trimmed);
  if (!digits) return "";

  if (trimmed.startsWith("+")) {
    const parsed = parsePhoneNumber(trimmed, defaultCountry);
    return parsed?.number ?? trimmed.replace(/\s/g, "");
  }

  if (defaultCountry === "US") {
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  }

  const withPlus = `+${digits}`;
  const parsed = parsePhoneNumber(withPlus, defaultCountry);
  return parsed?.number ?? withPlus;
}

/**
 * Display phone numbers in international format (+1 971 442 1291).
 */
export function formatPhoneForDisplay(
  value: string | null | undefined,
  defaultCountry: Country = "US",
): string {
  if (!value?.trim()) return "";

  const normalized = normalizePhoneForStorage(value, defaultCountry);
  if (!normalized) return value.trim();

  const parsed = parsePhoneNumber(normalized, defaultCountry);
  if (parsed) {
    return parsed.formatInternational();
  }

  const intl = formatPhoneNumberIntl(normalized);
  return intl || value.trim();
}
