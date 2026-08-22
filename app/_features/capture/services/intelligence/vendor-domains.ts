/**
 * Known SaaS vendor domains — the leaf module for "is this sender a tool the
 * operator pays, not a client relationship?"
 *
 * Extracted from `email-sender-context.ts` so non-intelligence consumers
 * (org birth in `memory/records/org-resolver.ts`, evidence classification in
 * `memory/evidence/classifier.ts`) can apply the vendor gate without
 * importing the full sender-classification module. Pure: no imports, safe
 * for any layer.
 */

/** Domains that almost always mean a tool subscription, not a client relationship. */
export const SAAS_VENDOR_DOMAIN_SUFFIXES = [
  "linear.app",
  "linear.com",
  "ramp.com",
  "descript.com",
  "descript.be",
  "slack.com",
  "notion.so",
  "notion.com",
  "figma.com",
  "vercel.com",
  "github.com",
  "openai.com",
  "anthropic.com",
  "cursor.com",
  "composio.dev",
  "1password.com",
  "loom.com",
  "zoom.us",
  "calendly.com",
  "hubspot.com",
  "mailchimp.com",
  "canva.com",
  "adobe.com",
  "dropbox.com",
  "monday.com",
  "asana.com",
  "clickup.com",
  "airtable.com",
  "intercom.io",
  "intercom.com",
  "postmarkapp.com",
  "resend.dev",
  "resend.com",
  "supabase.com",
  "supabase.io",
  "planetscale.com",
  "sentry.io",
  "datadoghq.com",
  "mixpanel.com",
  "amplitude.com",
  "twilio.com",
  "sendgrid.net",
  "cloudflare.com",
  "namecheap.com",
  "godaddy.com",
  "quickbooks.com",
  "intuit.com",
  "freshbooks.com",
  "waveapps.com",
  "bill.com",
  "mercury.com",
  "brex.com",
  "wise.com",
  "paypal.com",
  "square.com",
  "squareup.com",
  "stripe.com",
  "google.com",
  "googlemail.com",
  "gemini.google.com",
  "workspace.google.com",
  "apify.com",
  "apify.email",
  "kit.com",
  "convertkit.com",
  "magicpath.ai",
  "magicpath.com",
  "beehiiv.com",
  "substack.com",
  "framer.com",
  "webflow.com",
  "miro.com",
  "docusign.com",
  "docusign.net",
  "paddle.com",
  "lemonsqueezy.com",
  "gumroad.com",
  "typeform.com",
  "tally.so",
  "superhuman.com",
  "raycast.com",
  "arc.net",
  "replit.com",
  "higgsfield.ai",
  "recraft.com",
  "recraft.ai",
  // 2026-08-17 backlog-drain additions — each birthed a junk org before the
  // gate knew it. Subdomain senders (m.ngrok.com, email.heygen.com) match
  // via domainMatchesSuffix on the apex.
  "zendesk.com",
  "ngrok.com",
  "ngrok.io",
  "opus.pro",
  "heygen.com",
  "buffer.com",
  "feedbear.com",
  "lottiefiles.com",
  "refero.design",
  "openrouter.ai",
  "subsplash.com",
  "brandfetch.io",
  "firecrawl.dev",
  "wix.com",
  "wix-forms.com",
  "bankvod.com",
  // Second batch — apex-domain senders the subdomain guard can't catch.
  "amazon.com",
  "alibaba.com",
  "gumloop.com",
  "gumloopmail.com",
  "clay.com",
  "planningcenter.com",
  "greptile.com",
  "termly.io",
  "termageddon.com",
  "apexfintechsolutions.com",
  "cal.com",
  "sanity.io",
  "investordelivery.com",
  "screen.studio",
  "atlassian.com",
];

/** Brand strings for matching finding titles / proposal hints when domain is ambiguous. */
export const KNOWN_SAAS_VENDOR_BRANDS = [
  "magic path",
  "magicpath",
  "convertkit",
  "kit",
  "apify",
  "descript",
  "linear",
  "ramp",
  "notion",
  "stripe",
  "gemini",
  "slack",
  "figma",
  "vercel",
  "github",
  "openai",
  "anthropic",
  "cursor",
  "composio",
  "1password",
  "loom",
  "hubspot",
  "mailchimp",
  "canva",
  "adobe",
  "dropbox",
  "monday",
  "asana",
  "airtable",
  "intercom",
  "resend",
  "supabase",
  "sentry",
  "twilio",
  "cloudflare",
  "quickbooks",
  "mercury",
  "brex",
  "paddle",
  "framer",
  "webflow",
  "miro",
  "beehiiv",
  "substack",
  "higgsfield",
  "recraft",
  // Distinctive brands only — generic words ("buffer", "opus") would
  // false-positive on ordinary prose.
  "zendesk",
  "ngrok",
  "heygen",
  "feedbear",
  "lottiefiles",
  "refero",
  "openrouter",
  "subsplash",
  "brandfetch",
  "firecrawl",
  "bankvod",
  // Distinctive only — "clay", "cal", "screen", "sanity", "amazon" are
  // ordinary words and would false-positive on finding titles.
  "alibaba",
  "gumloop",
  "planningcenter",
  "planning center",
  "greptile",
  "termly",
  "termageddon",
  "atlassian",
  "investordelivery",
] as const;

export function emailDomain(fromEmail: string): string {
  return fromEmail.toLowerCase().split("@")[1]?.trim() ?? "";
}

export function domainMatchesSuffix(domain: string, suffix: string): boolean {
  return domain === suffix || domain.endsWith(`.${suffix}`);
}

/**
 * True when the domain (or any parent of it — "mail.convertkit.com" matches
 * "convertkit.com") is a known SaaS vendor. Use this to keep tools the
 * operator pays out of relationship records.
 */
export function isKnownSaasVendorDomain(domain: string): boolean {
  if (!domain) return false;
  const lower = domain.toLowerCase();
  return SAAS_VENDOR_DOMAIN_SUFFIXES.some((suffix) =>
    domainMatchesSuffix(lower, suffix)
  );
}

export function isKnownSaasVendorEmail(fromEmail: string): boolean {
  return isKnownSaasVendorDomain(emailDomain(fromEmail));
}

// ============================================================================
// Receipt / billing content detection
//
// Universal vendor signal — works for SaaS domains not on any global list.
// Used by sender classification (vendor_saas), evidence classification
// (suppress org births from receipt mail), and subscription capture.
// ============================================================================

const SAAS_BILLING_SUBJECT_PATTERNS = [
  /\breceipt\b/i,
  /\binvoice\b/i,
  /\bsubscription\b/i,
  /\brenew(ed|al|ing)\b/i,
  /\bbilling\b/i,
  /\bpayment (received|failed|due|method)\b/i,
  /\byour plan\b/i,
  /\btrial (ends|ending|expir)/i,
  /\busage (report|summary|limit)\b/i,
  /\bseat(s)? (added|removed|limit)\b/i,
  /\bmanage (your )?billing\b/i,
  /\baccount statement\b/i,
  /\bmonthly statement\b/i,
  /\bauto[- ]?renew\b/i,
  /\bprice (change|increase)\b/i,
  /\bupgrade (your|to)\b/i,
  /\bdowngrade\b/i,
  /\bcancel (your )?subscription\b/i,
  /\bsecurity (alert|notification)\b/i,
  /\bnew sign[- ]?in\b/i,
  /\blogin (attempt|from)\b/i,
  /\bverify your email\b/i,
  /\bwelcome to\b/i,
  /\bgetting started\b/i,
  /\bproduct update\b/i,
  /\bwhat'?s new\b/i,
  /\bchangelog\b/i,
  /\bweekly digest\b/i,
  /\bactivity (summary|digest)\b/i,
  /\bshared (a|with you)\b/i,
  /\bcommented on\b/i,
  /\bmentioned you\b/i,
];

const AUTOMATED_LOCAL_PARTS = [
  "noreply",
  "no-reply",
  "donotreply",
  "notifications",
  "billing",
  "invoice",
  "receipts",
  "news",
  "newsletter",
  "marketing",
  "mailer",
  "support",
  "hello",
  "team",
  "info",
];

const RECEIPT_LOCAL_PART_PREFIXES = [
  "receipt",
  "invoice",
  "billing",
  "invoices",
  "statements",
];

export function isAutomatedVendorLocalPart(local: string): boolean {
  const normalized = local.replace(/[.+]/g, "");
  return AUTOMATED_LOCAL_PARTS.some(
    (part) => normalized === part || normalized.startsWith(part)
  );
}

function isReceiptStyleLocalPart(local: string): boolean {
  const normalized = local.replace(/[.+]/g, "");
  return RECEIPT_LOCAL_PART_PREFIXES.some(
    (part) => normalized === part || normalized.startsWith(part)
  );
}

export function isSaasBillingContent(subject: string, body: string): boolean {
  const combined = `${subject}\n${body}`;
  return SAAS_BILLING_SUBJECT_PATTERNS.some((pattern) => pattern.test(combined));
}

const VENDOR_RECEIPT_LOCAL_PARTS = new Set([
  "receipt",
  "receipts",
  "billing",
  "invoice",
  "invoices",
  "statement",
  "statements",
]);

/**
 * Receipt-shaped sender on a known vendor domain (receipts@clickup.com,
 * billing@mercury.com). Drives the pre-ingest let-through when the
 * workspace tracks subscriptions: these reach daily-scan and become
 * Billing records instead of vanishing at the gate.
 */
export function isVendorReceiptSender(fromEmail: string): boolean {
  const local = fromEmail.toLowerCase().split("@")[0]?.replace(/[.+]/g, "") ?? "";
  if (!VENDOR_RECEIPT_LOCAL_PARTS.has(local)) return false;
  return isKnownSaasVendorDomain(emailDomain(fromEmail));
}

/** Universal vendor signal — works for SaaS domains not on any global list. */
export function isStrongReceiptOrBillingSignal(
  subject: string,
  body: string,
  local: string
): boolean {
  if (isReceiptStyleLocalPart(local)) return true;

  const combined = `${subject}\n${body}`;
  if (!isSaasBillingContent(subject, body)) return false;

  return (
    isAutomatedVendorLocalPart(local) ||
    /\byour receipt from\b/i.test(combined) ||
    /\binvoice #\b/i.test(combined) ||
    /\bpayment received\b/i.test(combined) ||
    /\bsubscription (renew|renewed|renewal)\b/i.test(combined)
  );
}
