/**
 * Pre-Ingest Gate (Captures V2 Phase 2 — Gate 1).
 *
 * Blocks obvious noise BEFORE creating a capture:
 * - Marketing emails (List-Unsubscribe header)
 * - Bulk/automated emails (Precedence: bulk, Auto-Submitted)
 * - Blocklisted domains (disposable email, known spam sources)
 *
 * This gate is FAST — no DB lookups, just header/domain checks.
 * False negatives are OK (Gate 2/3 catch them); false positives are BAD.
 */

import type { PreIngestGateInput, GateResultDrop } from "../../types/gate-result";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "throwaway.email",
  "temp-mail.org",
  "fakeinbox.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
]);

const MARKETING_DOMAINS = new Set([
  "mailchimp.com",
  "sendgrid.net",
  "amazonses.com",
  "mailgun.org",
  "constantcontact.com",
  "hubspot.com",
  "klaviyo.com",
  "intercom-mail.com",
  "postmarkapp.com",
  "customer.io",
  "drip.com",
  "activecampaign.com",
]);

const PROMOTIONAL_LABELS = new Set([
  "CATEGORY_PROMOTIONS",
  "CATEGORY_SOCIAL",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
  "SPAM",
  "TRASH",
]);

export function runPreIngestGate(input: PreIngestGateInput): GateResultDrop | null {
  const { senderEmail, senderDomain, headers, labels } = input;

  if (headers.listUnsubscribe) {
    return {
      action: "drop",
      gate: "pre-ingest",
      reason: "List-Unsubscribe header indicates marketing email",
      category: "marketing",
    };
  }

  const precedence = headers.precedence?.toLowerCase();
  if (precedence === "bulk" || precedence === "list" || precedence === "junk") {
    return {
      action: "drop",
      gate: "pre-ingest",
      reason: `Precedence: ${precedence} indicates bulk/list mail`,
      category: "automated",
    };
  }

  const autoSubmitted = headers.autoSubmitted?.toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") {
    return {
      action: "drop",
      gate: "pre-ingest",
      reason: `Auto-Submitted: ${autoSubmitted} indicates automated message`,
      category: "automated",
    };
  }

  if (senderDomain) {
    const domainLower = senderDomain.toLowerCase();

    if (DISPOSABLE_EMAIL_DOMAINS.has(domainLower)) {
      return {
        action: "drop",
        gate: "pre-ingest",
        reason: `Disposable email domain: ${senderDomain}`,
        category: "spam",
      };
    }

    if (MARKETING_DOMAINS.has(domainLower)) {
      return {
        action: "drop",
        gate: "pre-ingest",
        reason: `Known marketing platform domain: ${senderDomain}`,
        category: "marketing",
      };
    }

    if (domainLower.includes("noreply") || domainLower.includes("no-reply")) {
      return {
        action: "drop",
        gate: "pre-ingest",
        reason: "No-reply domain indicates automated message",
        category: "automated",
      };
    }
  }

  if (senderEmail) {
    const localPart = senderEmail.split("@")[0]?.toLowerCase() ?? "";
    if (
      localPart === "noreply" ||
      localPart === "no-reply" ||
      localPart === "donotreply" ||
      localPart === "do-not-reply" ||
      localPart === "mailer-daemon" ||
      localPart === "postmaster"
    ) {
      return {
        action: "drop",
        gate: "pre-ingest",
        reason: `Automated sender address: ${senderEmail}`,
        category: "automated",
      };
    }
  }

  if (labels && labels.length > 0) {
    for (const label of labels) {
      if (PROMOTIONAL_LABELS.has(label)) {
        return {
          action: "drop",
          gate: "pre-ingest",
          reason: `Gmail label indicates promotional: ${label}`,
          category: "marketing",
        };
      }
    }
  }

  return null;
}

export function extractDomainFromEmail(email: string | null): string | null {
  if (!email) return null;
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

export function extractHeadersFromEnvelope(raw: Record<string, unknown>): PreIngestGateInput["headers"] {
  const headers = (raw.headers as Record<string, string>) ?? {};
  return {
    listUnsubscribe: headers["List-Unsubscribe"] ?? headers["list-unsubscribe"] ?? null,
    precedence: headers["Precedence"] ?? headers["precedence"] ?? null,
    xMailer: headers["X-Mailer"] ?? headers["x-mailer"] ?? null,
    autoSubmitted: headers["Auto-Submitted"] ?? headers["auto-submitted"] ?? null,
  };
}
