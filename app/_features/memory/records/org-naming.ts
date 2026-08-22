/**
 * Org naming & identity helpers — pure leaf module (no imports) shared by
 * `org-resolver.ts` (births from email domains) and `executor.ts` (the
 * `system:create-org` choke point). Lives here because org-resolver imports
 * the executor, so the executor cannot import back from org-resolver.
 */

/**
 * Two-part TLDs where the registrable name sits three labels deep
 * (acme.co.uk → "acme", not "co").
 */
const SECOND_LEVEL_TLDS = new Set([
  "co.uk",
  "org.uk",
  "com.au",
  "net.au",
  "co.nz",
  "com.br",
  "co.jp",
  "co.in",
  "com.mx",
  "co.za",
  "com.sg",
  "com.co",
]);

/**
 * Labels that are mail infrastructure or generic service words, never a
 * company name. A "domain" that reduces to one of these produced junk orgs
 * like "Mail" (from mail.<vendor>.com) before the registrable-label fix.
 */
const NON_ORG_TOKENS = new Set([
  "mail",
  "email",
  "e",
  "app",
  "go",
  "www",
  "smtp",
  "mx",
  "notify",
  "notification",
  "notifications",
  "news",
  "hello",
  "hi",
  "hey",
  "info",
  "support",
  "billing",
  "receipts",
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
]);

/**
 * The registrable label of a domain — "mail.convertkit.com" and
 * "convertkit.com" both reduce to "convertkit". Returns null when the label
 * is a generic service token or the domain has no registrable part.
 */
function registrableLabel(domain: string): string | null {
  const labels = domain.toLowerCase().split(".").filter(Boolean);
  if (labels.length < 2) return null;
  const lastTwo = labels.slice(-2).join(".");
  const base = SECOND_LEVEL_TLDS.has(lastTwo)
    ? labels[labels.length - 3]
    : labels[labels.length - 2];
  if (!base || NON_ORG_TOKENS.has(base)) return null;
  return base;
}

/**
 * Convert a domain to an org name, e.g. "acme-corp.com" → "Acme Corp" and
 * "mail.acme-corp.com" → "Acme Corp" (subdomains never name the org).
 * Returns null when the domain can't yield an honest org name — the caller
 * must not create a record then.
 */
export function domainToOrgName(domain: string): string | null {
  const base = registrableLabel(domain);
  if (!base) return null;

  return base
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * True when the sender domain sits below the registrable apex —
 * "notifications.acme.com", "email.vendor.io". Humans write from apex
 * domains; subdomains are automated mail infrastructure (ESPs, product
 * notifications), so they must never birth org records. Two-part TLDs are
 * respected: "kainos-labs.com.br" is an apex, not a subdomain.
 */
export function isMailInfraSubdomain(domain: string): boolean {
  const labels = domain.toLowerCase().split(".").filter(Boolean);
  if (labels.length < 3) return false;
  const lastTwo = labels.slice(-2).join(".");
  const registrableLabels = SECOND_LEVEL_TLDS.has(lastTwo) ? 3 : 2;
  return labels.length > registrableLabels;
}

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
 * Normalized comparison key for org names — "Example Advisors",
 * "Harborfinancial", and "harbor financial!" are the same org. Used for
 * name-based dedupe when no domain is available to key on.
 */
export function normalizeOrgName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Extract the bare domain from a website URL or domain-ish string
 * ("https://www.createdbysalt.com/" → "createdbysalt.com"). Returns null when
 * nothing domain-like is present.
 */
export function domainFromWebsiteUrl(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  const cleaned = websiteUrl.trim().replace(/^https?:\/\//i, "").split("/")[0] ?? "";
  const host = cleaned.toLowerCase().replace(/^www\./, "");
  return looksLikeDomain(host) ? host : null;
}
