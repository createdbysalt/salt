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

export function extractNameFromEmail(email: string): string {
  const localPart = email.split("@")[0];
  return localPart
    .replace(/[._-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
