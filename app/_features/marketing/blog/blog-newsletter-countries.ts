export const BLOG_NEWSLETTER_COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "NL", label: "Netherlands" },
  { value: "BR", label: "Brazil" },
  { value: "IN", label: "India" },
  { value: "OTHER", label: "Other" },
] as const;

export type BlogNewsletterCountryCode =
  (typeof BLOG_NEWSLETTER_COUNTRIES)[number]["value"];

const COUNTRY_CODES = new Set<string>(
  BLOG_NEWSLETTER_COUNTRIES.map((entry) => entry.value)
);

export function sanitizeBlogNewsletterCountry(
  value: string | undefined
): BlogNewsletterCountryCode {
  const trimmed = value?.trim().toUpperCase() ?? "";
  if (COUNTRY_CODES.has(trimmed)) {
    return trimmed as BlogNewsletterCountryCode;
  }
  return "US";
}
