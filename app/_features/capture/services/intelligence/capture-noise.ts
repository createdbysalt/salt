/**
 * Shared capture noise gate — Salt-original implementation.
 * Classification cascade informed by public email-triage practice only;
 * no AGPL (Inbox Zero) or UAL (UpGPT) source code incorporated.
 */

import type { CaptureSourceType, ExtractedData } from "../../types";
import { extractCaptureEmailFields } from "../extract-capture-email";

export type CaptureNoiseCategory =
  | "promotion"
  | "newsletter"
  | "automated"
  | "social"
  | "spam";

export type CaptureNoiseInput = {
  sourceType: CaptureSourceType;
  fromEmail?: string;
  subject?: string;
  bodyText?: string;
  labels?: string[];
  headers?: Record<string, string>;
  isSentByUser?: boolean;
};

export type CaptureNoiseResult =
  | {
      isNoise: true;
      reason: string;
      category: CaptureNoiseCategory;
    }
  | {
      isNoise: false;
    };

const GMAIL_NOISE_LABELS = new Set([
  "SPAM",
  "TRASH",
  "CATEGORY_PROMOTIONS",
  "CATEGORY_SOCIAL",
  "CATEGORY_FORUMS",
]);

const AUTOMATED_FROM_FRAGMENTS = [
  "noreply@",
  "no-reply@",
  "donotreply@",
  "notifications@",
  "newsletter@",
  "marketing@",
  "mailer-daemon",
  "postmaster@",
];

const AUTOMATED_SUBJECT_PATTERNS = [
  /password reset/i,
  /verify your email/i,
  /security alert/i,
  /login attempt/i,
  /two[- ]?factor/i,
  /\b2fa\b/i,
  /verification code/i,
];

const SOCIAL_DOMAIN_SUFFIXES = [
  "linkedin.com",
  "facebookmail.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "tiktok.com",
  "pinterest.com",
  "reddit.com",
  "quora.com",
];

const MARKETING_ESP_DOMAIN_SUFFIXES = [
  "hubspotemail.net",
  "mailchimp.com",
  "sendgrid.net",
  "mcsv.net",
  "list-manage.com",
  "createsend.com",
  "emltrk.com",
  "beehiiv.com",
  "substack.com",
];

function normalizeHeaderMap(
  headers: Record<string, string> | undefined
): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
}

function getHeader(headers: Record<string, string>, name: string): string {
  return headers[name.toLowerCase()] ?? "";
}

function emailLocalAndDomain(fromEmail: string): { local: string; domain: string } {
  const lower = fromEmail.toLowerCase().trim();
  const at = lower.indexOf("@");
  if (at === -1) return { local: lower, domain: "" };
  return { local: lower.slice(0, at + 1), domain: lower.slice(at + 1) };
}

function domainMatchesSuffix(domain: string, suffix: string): boolean {
  return domain === suffix || domain.endsWith(`.${suffix}`);
}

function hasBulkMarketingHeaders(headers: Record<string, string>): boolean {
  const listUnsub = getHeader(headers, "list-unsubscribe");
  if (!listUnsub) return false;
  const listUnsubPost = getHeader(headers, "list-unsubscribe-post");
  return /one-click/i.test(listUnsubPost);
}

function hasNewsletterHeaders(headers: Record<string, string>): boolean {
  return Boolean(getHeader(headers, "list-unsubscribe"));
}

function isAutomatedBulkHeader(headers: Record<string, string>): boolean {
  const precedence = getHeader(headers, "precedence");
  if (/bulk|list|junk/i.test(precedence)) return true;
  const autoSubmitted = getHeader(headers, "auto-submitted");
  return Boolean(autoSubmitted && !/no/i.test(autoSubmitted));
}

function isSocialDomain(fromEmail: string): boolean {
  const { domain } = emailLocalAndDomain(fromEmail);
  if (!domain) return false;
  return SOCIAL_DOMAIN_SUFFIXES.some((suffix) => domainMatchesSuffix(domain, suffix));
}

function isMarketingEspDomain(fromEmail: string): boolean {
  const { domain } = emailLocalAndDomain(fromEmail);
  if (!domain) return false;
  return MARKETING_ESP_DOMAIN_SUFFIXES.some((suffix) =>
    domainMatchesSuffix(domain, suffix)
  );
}

function isAutomatedSender(fromEmail: string, subject: string): boolean {
  const lower = fromEmail.toLowerCase();
  if (AUTOMATED_FROM_FRAGMENTS.some((frag) => lower.includes(frag))) {
    return true;
  }
  return AUTOMATED_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));
}

const PAYMENT_RAIL_DOMAIN_SUFFIXES = [
  "intuit.com",
  "quickbooks.com",
  "stripe.com",
  "bill.com",
  "paypal.com",
  "square.com",
  "squareup.com",
];

function isPaymentRailDomain(fromEmail: string): boolean {
  const domain = fromEmail.toLowerCase().split("@")[1] ?? "";
  return PAYMENT_RAIL_DOMAIN_SUFFIXES.some(
    (rail) => domain === rail || domain.endsWith(`.${rail}`)
  );
}

/** Payment processor mail is never noise — payer signals live in the body. */
function isExemptFromNoise(input: CaptureNoiseInput): boolean {
  if (input.fromEmail && isPaymentRailDomain(input.fromEmail)) {
    return true;
  }
  return false;
}

export function classifyCaptureNoise(input: CaptureNoiseInput): CaptureNoiseResult {
  if (isExemptFromNoise(input)) {
    return { isNoise: false };
  }

  const headers = normalizeHeaderMap(input.headers);
  const fromEmail = input.fromEmail?.toLowerCase().trim() ?? "";
  const subject = input.subject ?? "";

  if (input.sourceType === "gmail" || input.sourceType === "outlook") {
    const labels = input.labels ?? [];
    if (labels.some((label) => GMAIL_NOISE_LABELS.has(label))) {
      return {
        isNoise: true,
        reason: "gmail_noise_label",
        category: labels.includes("SPAM") ? "spam" : "promotion",
      };
    }
  }

  if (hasBulkMarketingHeaders(headers)) {
    return {
      isNoise: true,
      reason: "bulk_marketing_one_click_unsubscribe",
      category: "promotion",
    };
  }

  if (hasNewsletterHeaders(headers)) {
    return {
      isNoise: true,
      reason: "list_unsubscribe_header",
      category: "newsletter",
    };
  }

  if (isAutomatedBulkHeader(headers)) {
    return {
      isNoise: true,
      reason: "bulk_precedence_header",
      category: "newsletter",
    };
  }

  if (fromEmail && isAutomatedSender(fromEmail, subject)) {
    return {
      isNoise: true,
      reason: "automated_sender_or_subject",
      category: "automated",
    };
  }

  if (fromEmail && isMarketingEspDomain(fromEmail)) {
    return {
      isNoise: true,
      reason: "marketing_esp_domain",
      category: "promotion",
    };
  }

  if (fromEmail && isSocialDomain(fromEmail)) {
    return {
      isNoise: true,
      reason: "social_notification_domain",
      category: "social",
    };
  }

  return { isNoise: false };
}

export type EmailNoiseFields = {
  from_email: string;
  subject: string;
  body_text: string | null;
  snippet: string;
  labels?: string[];
  headers?: Record<string, string>;
  is_sent_by_user: boolean;
};

export function emailToNoiseInput(email: EmailNoiseFields): CaptureNoiseInput {
  return {
    sourceType: "gmail",
    fromEmail: email.from_email,
    subject: email.subject,
    bodyText: email.body_text ?? email.snippet,
    labels: email.labels,
    headers: email.headers,
    isSentByUser: email.is_sent_by_user,
  };
}

export function buildNoiseInputFromCaptureRow(args: {
  sourceType: CaptureSourceType;
  rawPayload: Record<string, unknown>;
  extractedData: ExtractedData;
}): CaptureNoiseInput | null {
  const fields = extractCaptureEmailFields(args.rawPayload, args.extractedData);
  if (!fields) return null;

  const headers: Record<string, string> = {};
  const nestedPayload = args.rawPayload.payload as
    | { headers?: Array<{ name: string; value: string }> }
    | undefined;
  const headerList =
    nestedPayload?.headers ??
    (args.rawPayload.headers as Array<{ name: string; value: string }> | undefined) ??
    [];
  for (const header of headerList) {
    headers[header.name.toLowerCase()] = header.value;
  }

  const labels =
    args.extractedData.type === "message"
      ? (args.extractedData.labels ?? [])
      : ((args.rawPayload.labelIds as string[] | undefined) ?? []);

  return {
    sourceType: args.sourceType,
    fromEmail: fields.from_email,
    subject: fields.subject,
    bodyText: fields.body_text ?? fields.snippet,
    labels,
    headers,
    isSentByUser: fields.is_sent_by_user,
  };
}
