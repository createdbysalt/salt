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
import {
  DEFAULT_GATE_POLICY,
  type ResolvedGatePolicy,
} from "./gate-policy";

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

// ESP sending-infrastructure domains. Humans never send from these — a hit
// is always bulk mail, so dropping is safe (false positives are what we
// must avoid at this gate).
const MARKETING_DOMAINS = new Set([
  "mailchimp.com",
  "mcsv.net",
  "mcdlv.net",
  "rsgsv.net",
  "sendgrid.net",
  "amazonses.com",
  "mailgun.org",
  "mailgun.net",
  "constantcontact.com",
  "rs6.net",
  "hubspot.com",
  "hubspotemail.net",
  "klaviyo.com",
  "klaviyomail.com",
  "intercom-mail.com",
  "postmarkapp.com",
  "pm-bounces.net",
  "customer.io",
  "customeriomail.com",
  "drip.com",
  "activecampaign.com",
  "acemlnb.com",
  "braze.com",
  "brazemail.com",
  "sailthru.com",
  "sparkpostmail.com",
  "createsend.com",
  "cmail19.com",
  "cmail20.com",
  "exacttarget.com",
  "e.salesforce.com",
  "marketo.com",
  "mktomail.com",
  "campaignmonitor.com",
  "convertkit-mail.com",
  "convertkit-mail2.com",
  "beehiiv.com",
  "mail.beehiiv.com",
]);

// Local parts that indicate an automated/product-announcement sender.
// Exact matches only — substrings would catch real people.
const AUTOMATED_LOCAL_PARTS = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "mailer-daemon",
  "postmaster",
  "notifications",
  "notification",
  "notify",
  "alerts",
  "alert",
  "newsletter",
  "newsletters",
  "marketing",
  "promotions",
  "promo",
  "offers",
  "digest",
  "updates",
  "news",
  "bounce",
  "bounces",
  "mailer",
  "automated",
  "auto-confirm",
  "receipts",
  "billing-noreply",
  "account-security-noreply",
]);

const PROMOTIONAL_LABELS = new Set([
  "CATEGORY_PROMOTIONS",
  "CATEGORY_SOCIAL",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
  "SPAM",
  "TRASH",
]);

/**
 * Every detection the heuristics produce for this input, in priority order
 * (the historical early-return order). The policy layer then decides which
 * detections are allowed to drop.
 */
function detectDrops(input: PreIngestGateInput): GateResultDrop[] {
  const { senderEmail, senderDomain, headers, labels } = input;
  const drops: GateResultDrop[] = [];

  if (headers.listUnsubscribe) {
    drops.push({
      action: "drop",
      gate: "pre-ingest",
      reason: "List-Unsubscribe header indicates marketing email",
      category: "marketing",
    });
  }

  const precedence = headers.precedence?.toLowerCase();
  if (precedence === "bulk" || precedence === "list" || precedence === "junk") {
    drops.push({
      action: "drop",
      gate: "pre-ingest",
      reason: `Precedence: ${precedence} indicates bulk/list mail`,
      category: "automated",
    });
  }

  const autoSubmitted = headers.autoSubmitted?.toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") {
    drops.push({
      action: "drop",
      gate: "pre-ingest",
      reason: `Auto-Submitted: ${autoSubmitted} indicates automated message`,
      category: "automated",
    });
  }

  if (senderDomain) {
    const domainLower = senderDomain.toLowerCase();

    if (DISPOSABLE_EMAIL_DOMAINS.has(domainLower)) {
      drops.push({
        action: "drop",
        gate: "pre-ingest",
        reason: `Disposable email domain: ${senderDomain}`,
        category: "spam",
      });
    }

    if (MARKETING_DOMAINS.has(domainLower)) {
      drops.push({
        action: "drop",
        gate: "pre-ingest",
        reason: `Known marketing platform domain: ${senderDomain}`,
        category: "marketing",
      });
    }

    if (domainLower.includes("noreply") || domainLower.includes("no-reply")) {
      drops.push({
        action: "drop",
        gate: "pre-ingest",
        reason: "No-reply domain indicates automated message",
        category: "automated",
      });
    }
  }

  if (senderEmail) {
    const localPart = senderEmail.split("@")[0]?.toLowerCase() ?? "";
    if (AUTOMATED_LOCAL_PARTS.has(localPart)) {
      drops.push({
        action: "drop",
        gate: "pre-ingest",
        reason: `Automated sender address: ${senderEmail}`,
        category: "automated",
      });
    } else if (/^(no-?reply|do-?not-?reply)[+.\-_]/.test(localPart)) {
      // noreply+tag@ / no-reply-something@ variants
      drops.push({
        action: "drop",
        gate: "pre-ingest",
        reason: `Automated sender address: ${senderEmail}`,
        category: "automated",
      });
    }
  }

  if (labels && labels.length > 0) {
    for (const label of labels) {
      if (PROMOTIONAL_LABELS.has(label)) {
        drops.push({
          action: "drop",
          gate: "pre-ingest",
          reason: `Gmail label indicates promotional: ${label}`,
          category: "marketing",
        });
        break;
      }
    }
  }

  return drops;
}

export interface PreIngestGateDetailedResult {
  /** The drop that applies after policy, or null when the mail passes. */
  drop: GateResultDrop | null;
  /**
   * The first 'automated' detection the workspace policy suppressed
   * (automatedSenders ≠ dropped). The pipeline reads this to let explicitly
   * let-in automated mail bypass the memory-first hold.
   */
  suppressed: GateResultDrop | null;
}

/**
 * Policy-aware gate (Customize surfaces, S3): the workspace's
 * `automatedSenders` choice governs ONLY the 'automated' category
 * (noreply/bulk/auto-submitted heuristics). Spam and marketing detections
 * always drop — no policy makes a disposable domain or a List-Unsubscribe
 * blast acceptable.
 */
export function runPreIngestGateDetailed(
  input: PreIngestGateInput,
  policy: ResolvedGatePolicy = DEFAULT_GATE_POLICY,
): PreIngestGateDetailedResult {
  const automatedSoftened = policy.email.automatedSenders !== "dropped";
  let suppressed: GateResultDrop | null = null;

  for (const detection of detectDrops(input)) {
    if (automatedSoftened && detection.category === "automated") {
      suppressed ??= detection;
      continue;
    }
    return { drop: detection, suppressed };
  }
  return { drop: null, suppressed };
}

export function runPreIngestGate(
  input: PreIngestGateInput,
  policy: ResolvedGatePolicy = DEFAULT_GATE_POLICY,
): GateResultDrop | null {
  return runPreIngestGateDetailed(input, policy).drop;
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
