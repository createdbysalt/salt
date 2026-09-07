export interface PersonSignals {
  has_payment_received?: boolean;
  has_stripe_payment?: boolean;
  has_invoice_sent?: boolean;
  is_bidirectional_thread?: boolean;
  you_initiated?: boolean;
  has_calendar_meeting?: boolean;
  has_signature?: boolean;
  email_count?: number;
  last_email_date?: string;
}

/**
 * Runtime key set for PersonSignals — the registry contract adapters'
 * deriveSignals must stay inside (asserted by the conformance harness).
 */
export const PERSON_SIGNAL_KEYS = [
  "has_payment_received",
  "has_stripe_payment",
  "has_invoice_sent",
  "is_bidirectional_thread",
  "you_initiated",
  "has_calendar_meeting",
  "has_signature",
  "email_count",
  "last_email_date",
] as const satisfies readonly (keyof PersonSignals)[];

const PERSONAL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "zoho.com",
];

export function extractDomain(email: string): string | null {
  const parts = email.toLowerCase().split("@");
  if (parts.length !== 2) return null;

  const domain = parts[1];
  if (PERSONAL_DOMAINS.includes(domain)) return null;
  return domain;
}

export function isPersonalDomain(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1];
  return domain ? PERSONAL_DOMAINS.includes(domain) : true;
}

/**
 * Role/generic words that are never a person's name. They show up as
 * display names on automated mail ("Customer <orders@…>") and as local
 * parts (customer@, support@). Extends the automated-sender vocabulary in
 * capture/services/intelligence/vendor-domains.ts into the naming layer.
 */
const ROLE_NAME_DENY_LIST = new Set([
  "admin",
  "billing",
  "contact",
  "customer",
  "customers",
  "hello",
  "help",
  "helpdesk",
  "info",
  "invoice",
  "invoices",
  "mailer",
  "marketing",
  "news",
  "newsletter",
  "no-reply",
  "noreply",
  "notifications",
  "office",
  "orders",
  "receipt",
  "receipts",
  "sales",
  "service",
  "statements",
  "success",
  "support",
  "team",
]);

/**
 * Plausibility gate for person names. Junk names — digits from local-part
 * parsing ("Pedro H 542"), role words used as display names ("Customer"),
 * single characters, bare email addresses — must never become People
 * records. Rejected candidates park as evidence instead of being born.
 *
 * Initials inside a longer name ("John Q Public") are fine; the gate only
 * rejects names that are junk as a whole.
 */
export function isPlausiblePersonName(name: string | null | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  // An email address is an identifier, not a name.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false;
  // Digits never belong in a person's name (local-part debris).
  if (/\d/.test(trimmed)) return false;
  // A single character is parsing debris, not a name.
  if (trimmed.length < 2) return false;
  // Role words — every word generic ("Customer", "Customer Success",
  // "Support Team") means this is a mailbox label, not a person.
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.every((word) => ROLE_NAME_DENY_LIST.has(word))) {
    return false;
  }
  return true;
}

/**
 * Derive a display name from an email local part ("pedro.h" → "Pedro H").
 * Returns null when the derived name is junk (digits, role words) — callers
 * must treat null as "no usable name", not as a reason to invent one.
 */
export function extractNameFromEmail(email: string): string | null {
  const localPart = email.split("@")[0];
  const name = localPart
    .replace(/[._-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim();
  return isPlausiblePersonName(name) ? name : null;
}
