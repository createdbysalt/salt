import type { MemoryProposal } from "../../types/memory-proposals";
import {
  lookupSenderProfile,
  type SenderProfileRegistry,
} from "../../types/sender-profiles";
import {
  extractPaymentPayer,
  isPaymentRailSender,
} from "./email-heuristics";

/**
 * Distinguishes SaaS/subscription vendors from client orgs for Memory proposals.
 * Payment rails (Stripe, PayPal) can be either client revenue OR your own SaaS bill.
 */

export type EmailSenderKind =
  | "client"
  | "vendor_saas"
  | "payment_rail"
  | "unknown";

export interface EmailSenderContext {
  kind: EmailSenderKind;
  /** Resolved vendor label when kind is vendor_saas (e.g. "Linear", "Stripe"). */
  vendorName?: string;
  reason?: string;
}

export interface EmailSenderInput {
  from_email: string;
  from_name?: string | null;
  subject?: string;
  body_text?: string | null;
  snippet?: string;
}

export interface ClassifyEmailSenderOptions {
  /** Per-workspace learned sender classifications (dismiss / apply / auto-scan). */
  registry?: SenderProfileRegistry;
}

/** Domains that almost always mean a tool subscription, not a client relationship. */
const SAAS_VENDOR_DOMAIN_SUFFIXES = [
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
] as const;

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

const GOOGLE_VENDOR_SUBJECT_PATTERNS = [
  /\bgemini\b/i,
  /\bgoogle (one|workspace|cloud|play)\b/i,
  /\bcloud billing\b/i,
  /\bgoogle ai\b/i,
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

function emailDomain(fromEmail: string): string {
  return fromEmail.toLowerCase().split("@")[1]?.trim() ?? "";
}

function emailLocalPart(fromEmail: string): string {
  return fromEmail.toLowerCase().split("@")[0]?.trim() ?? "";
}

function domainMatchesSuffix(domain: string, suffix: string): boolean {
  return domain === suffix || domain.endsWith(`.${suffix}`);
}

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

function normalizeBrandText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Match vendor brand in free text (finding title, subject, proposal hints). */
export function vendorBrandInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const brand of KNOWN_SAAS_VENDOR_BRANDS) {
    const pattern = brand.includes(" ")
      ? new RegExp(brand.replace(/\s+/g, "\\s+"), "i")
      : new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(lower)) {
      return brand
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }
  return null;
}

export function isVendorOrgName(name: string, vendorName?: string): boolean {
  const normalized = normalizeBrandText(name);
  if (!normalized) return false;

  if (vendorName) {
    const vendorNorm = normalizeBrandText(vendorName);
    if (vendorNorm && (normalized === vendorNorm || normalized.includes(vendorNorm))) {
      return true;
    }
  }

  for (const brand of KNOWN_SAAS_VENDOR_BRANDS) {
    const brandNorm = normalizeBrandText(brand);
    if (brandNorm.length >= 3 && normalized === brandNorm) return true;
  }

  for (const suffix of SAAS_VENDOR_DOMAIN_SUFFIXES) {
    const root = suffix.split(".")[0];
    if (root && normalized === normalizeBrandText(root)) return true;
  }

  return false;
}

function isAutomatedVendorLocalPart(local: string): boolean {
  const normalized = local.replace(/[.+]/g, "");
  return AUTOMATED_LOCAL_PARTS.some(
    (part) => normalized === part || normalized.startsWith(part)
  );
}

export function isSaasBillingContent(subject: string, body: string): boolean {
  const combined = `${subject}\n${body}`;
  return SAAS_BILLING_SUBJECT_PATTERNS.some((pattern) => pattern.test(combined));
}

const RECEIPT_LOCAL_PART_PREFIXES = [
  "receipt",
  "invoice",
  "billing",
  "invoices",
  "statements",
];

function isReceiptStyleLocalPart(local: string): boolean {
  const normalized = local.replace(/[.+]/g, "");
  return RECEIPT_LOCAL_PART_PREFIXES.some(
    (part) => normalized === part || normalized.startsWith(part)
  );
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

function isGoogleVendorEmail(domain: string, subject: string, body: string): boolean {
  if (!domainMatchesSuffix(domain, "google.com") && !domain.includes("google")) {
    return false;
  }
  const combined = `${subject}\n${body}`;
  return (
    GOOGLE_VENDOR_SUBJECT_PATTERNS.some((pattern) => pattern.test(combined)) ||
    isSaasBillingContent(subject, body)
  );
}

function resolveVendorDisplayName(domain: string, fromName: string | null): string {
  const brandFromDomain = vendorBrandInText(domain);
  if (brandFromDomain) return brandFromDomain;

  if (fromName?.trim()) {
    const name = fromName.trim();
    if (
      name.length <= 40 &&
      !name.includes("@") &&
      !isVendorOrgName(name) &&
      !/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)
    ) {
      return name;
    }
  }

  const root = domain.split(".").slice(-2, -1)[0] ?? domain.split(".")[0] ?? domain;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function profileToSenderContext(
  profile: NonNullable<ReturnType<typeof lookupSenderProfile>>
): EmailSenderContext {
  return {
    kind: profile.kind,
    vendorName: profile.vendorName,
    reason: "workspace_sender_profile",
  };
}

/**
 * Classify who sent the email for Memory vs subscription handling.
 */
export function classifyEmailSender(
  input: EmailSenderInput,
  options?: ClassifyEmailSenderOptions
): EmailSenderContext {
  const fromEmail = input.from_email.toLowerCase().trim();
  const domain = emailDomain(fromEmail);
  const local = emailLocalPart(fromEmail);
  const subject = input.subject ?? "";
  const body = input.body_text ?? input.snippet ?? "";
  const combinedText = `${subject}\n${body}`;

  const profile = options?.registry
    ? lookupSenderProfile(options.registry, fromEmail)
    : null;
  if (profile) {
    return profileToSenderContext(profile);
  }

  if (isPaymentRailSender(fromEmail)) {
    const payer = extractPaymentPayer(combinedText);
    if (payer?.name || payer?.email) {
      return {
        kind: "payment_rail",
        reason: "payment_rail_with_payer",
      };
    }
    return {
      kind: "vendor_saas",
      vendorName: resolveVendorDisplayName(domain, input.from_name ?? null),
      reason: "payment_rail_self_billing",
    };
  }

  if (isGoogleVendorEmail(domain, subject, body)) {
    return {
      kind: "vendor_saas",
      vendorName: /gemini/i.test(combinedText) ? "Gemini" : "Google",
      reason: "google_vendor_billing",
    };
  }

  if (isStrongReceiptOrBillingSignal(subject, body, local)) {
    return {
      kind: "vendor_saas",
      vendorName: resolveVendorDisplayName(domain, input.from_name ?? null),
      reason: "receipt_billing_signal",
    };
  }

  // Any @linear.app / @ramp.com / etc. mail is a tool vendor — not a client org.
  if (isKnownSaasVendorDomain(domain)) {
    return {
      kind: "vendor_saas",
      vendorName: resolveVendorDisplayName(domain, input.from_name ?? null),
      reason: "known_vendor_domain",
    };
  }

  const subjectBrand = vendorBrandInText(subject);
  if (subjectBrand && (isSaasBillingContent(subject, body) || isAutomatedVendorLocalPart(local))) {
    return {
      kind: "vendor_saas",
      vendorName: subjectBrand,
      reason: "vendor_brand_in_subject",
    };
  }

  const fromName = input.from_name?.trim() ?? "";
  if (fromName && isVendorOrgName(fromName)) {
    if (isSaasBillingContent(subject, body) || isAutomatedVendorLocalPart(local)) {
      return {
        kind: "vendor_saas",
        vendorName: fromName,
        reason: "vendor_display_name",
      };
    }
  }

  return { kind: "unknown" };
}

/**
 * Repair-time fallback when stored metadata is thin but finding text names a vendor.
 */
export function inferVendorSenderContext(args: {
  fromEmail?: string;
  fromName?: string | null;
  subject?: string;
  title?: string;
  proposalHintNames?: string[];
  registry?: SenderProfileRegistry;
}): EmailSenderContext | null {
  if (args.fromEmail && args.fromEmail.includes("@")) {
    const classified = classifyEmailSender(
      {
        from_email: args.fromEmail,
        from_name: args.fromName,
        subject: args.subject ?? args.title ?? "",
      },
      { registry: args.registry }
    );
    if (classified.kind === "vendor_saas" || classified.kind === "payment_rail") {
      return classified;
    }
  }

  if (args.fromEmail && isKnownSaasVendorEmail(args.fromEmail)) {
    return {
      kind: "vendor_saas",
      vendorName: resolveVendorDisplayName(
        emailDomain(args.fromEmail),
        args.fromName ?? null
      ),
      reason: "known_vendor_email_repair",
    };
  }

  const haystack = [
    args.title ?? "",
    args.subject ?? "",
    ...(args.proposalHintNames ?? []),
  ].join("\n");

  const brand = vendorBrandInText(haystack);
  if (brand) {
    return {
      kind: "vendor_saas",
      vendorName: brand,
      reason: "vendor_brand_in_finding_repair",
    };
  }

  for (const hint of args.proposalHintNames ?? []) {
    if (isVendorOrgName(hint)) {
      return {
        kind: "vendor_saas",
        vendorName: hint,
        reason: "vendor_hint_name_repair",
      };
    }
  }

  return null;
}

/**
 * Strip Memory proposals that would create client orgs/people from SaaS vendors.
 */
export function filterMemoryProposalsForSender(
  proposals: MemoryProposal[],
  sender: EmailSenderContext
): MemoryProposal[] {
  if (sender.kind !== "vendor_saas") {
    return proposals;
  }

  return proposals.filter((proposal) => {
    if (proposal.surface === "billing") return true;

    const hintName = proposal.hint.name ?? "";
    if (isVendorOrgName(hintName, sender.vendorName)) {
      return false;
    }

    if (
      proposal.surface === "orgs" ||
      proposal.surface === "people" ||
      proposal.surface === "work"
    ) {
      return false;
    }

    if (proposal.surface === "meetings") {
      return false;
    }

    return true;
  });
}

export function shouldSkipMemoryFindingsForSender(
  sender: EmailSenderContext,
  memoryProposals: MemoryProposal[],
  signalFindingsCount: number
): boolean {
  if (sender.kind !== "vendor_saas") return false;
  if (signalFindingsCount > 0) return false;
  return memoryProposals.length === 0;
}
