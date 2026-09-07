/**
 * Domain identity helpers — pure leaf module in `_lib` so both features
 * (records executor, resolvers, classifier) and infrastructure (operator
 * identity) can share one implementation without a lib → feature import.
 */

/**
 * True when a supposed org *name* is actually a bare domain
 * ("harborfinancial.com") — evidence pipelines sometimes hand the domain over
 * as the name. Such input should be rescued into { name, domain }, never
 * stored as-is.
 */
export function looksLikeDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/i.test(value.trim());
}

/**
 * Extract the bare domain from a website URL or domain-ish string
 * ("https://www.createdbysalt.com/" → "createdbysalt.com"). Returns null when
 * nothing domain-like is present.
 */
export function domainFromWebsiteUrl(
  websiteUrl: string | null | undefined
): string | null {
  if (!websiteUrl) return null;
  const cleaned = websiteUrl.trim().replace(/^https?:\/\//i, "").split("/")[0] ?? "";
  const host = cleaned.toLowerCase().replace(/^www\./, "");
  return looksLikeDomain(host) ? host : null;
}

/**
 * Consumer mailbox providers. An operator emailing from gmail must not make
 * "gmail.com" an operator domain — only their business domains count.
 */
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "protonmail.com",
  "me.com",
  "live.com",
  "msn.com",
]);

export function isPersonalEmailDomain(domain: string): boolean {
  return PERSONAL_EMAIL_DOMAINS.has(domain.toLowerCase());
}
