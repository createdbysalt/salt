/**
 * Email Priority Scoring
 *
 * Calculates a composite priority score (0-100) based on multiple signal types.
 * Used to determine triage action and display prominence.
 */

import type {
  EmailClassificationInput,
  ClassificationContext,
  PriorityFactor,
  EmailPriorityTierValue,
} from "./types";
import {
  PRIORITY_WEIGHTS,
  PRIORITY_TIER_THRESHOLDS,
  MONEY_PATTERNS,
  ACTION_PATTERNS,
  DEADLINE_PATTERNS,
  NEWSLETTER_PATTERNS,
  CONSUMER_EMAIL_DOMAINS,
} from "./types";
import { parseSenderEmail } from "../../types/sender-profiles";

export interface PriorityResult {
  score: number;
  tier: EmailPriorityTierValue;
  factors: PriorityFactor[];
}

export function calculatePriorityScore(
  input: EmailClassificationInput,
  context: ClassificationContext
): PriorityResult {
  const factors: PriorityFactor[] = [];
  const { email: senderEmail, domain: senderDomain } = parseSenderEmail(
    input.fromEmail
  );
  const content = `${input.subject} ${input.bodyPreview}`;

  let score = 40;

  if (context.clientEmails.has(senderEmail)) {
    factors.push({
      factor: "from_client",
      weight: PRIORITY_WEIGHTS.from_client,
      matched: true,
      evidence: "Sender is a known client",
    });
    score += PRIORITY_WEIGHTS.from_client;
  } else if (context.clientDomains.has(senderDomain)) {
    factors.push({
      factor: "from_client",
      weight: PRIORITY_WEIGHTS.from_client,
      matched: true,
      evidence: "Sender domain is a known client",
    });
    score += PRIORITY_WEIGHTS.from_client;
  }

  if (context.vipEmails.has(senderEmail)) {
    factors.push({
      factor: "from_vip",
      weight: PRIORITY_WEIGHTS.from_vip,
      matched: true,
      evidence: "Sender is marked VIP",
    });
    score += PRIORITY_WEIGHTS.from_vip;
  }

  const moneyMatch = MONEY_PATTERNS.find((p) => p.test(content));
  if (moneyMatch) {
    factors.push({
      factor: "mentions_money",
      weight: PRIORITY_WEIGHTS.mentions_money,
      matched: true,
      evidence: "Contains money/invoice reference",
    });
    score += PRIORITY_WEIGHTS.mentions_money;
  }

  const deadlineMatch = DEADLINE_PATTERNS.find((p) => p.test(content));
  if (deadlineMatch) {
    factors.push({
      factor: "mentions_deadline",
      weight: PRIORITY_WEIGHTS.mentions_deadline,
      matched: true,
      evidence: "Contains deadline mention",
    });
    score += PRIORITY_WEIGHTS.mentions_deadline;
  }

  const actionMatch = ACTION_PATTERNS.find((p) => p.test(content));
  if (actionMatch) {
    factors.push({
      factor: "requires_action",
      weight: PRIORITY_WEIGHTS.requires_action,
      matched: true,
      evidence: "Contains action request",
    });
    score += PRIORITY_WEIGHTS.requires_action;
  }

  if (input.threadDepth > 0) {
    factors.push({
      factor: "ongoing_thread",
      weight: PRIORITY_WEIGHTS.ongoing_thread,
      matched: true,
      evidence: `Thread depth: ${input.threadDepth}`,
    });
    score += PRIORITY_WEIGHTS.ongoing_thread;
  }

  if (input.isReply) {
    factors.push({
      factor: "is_reply",
      weight: PRIORITY_WEIGHTS.is_reply,
      matched: true,
      evidence: "Reply to existing conversation",
    });
    score += PRIORITY_WEIGHTS.is_reply;
  }

  if (input.hasAttachments) {
    factors.push({
      factor: "has_attachment",
      weight: PRIORITY_WEIGHTS.has_attachment,
      matched: true,
      evidence: `Attachments: ${input.attachmentNames.join(", ")}`,
    });
    score += PRIORITY_WEIGHTS.has_attachment;
  }

  const newsletterMatch = NEWSLETTER_PATTERNS.find(
    (p) =>
      p.test(content) ||
      (input.headers["list-unsubscribe"] && p.source.includes("list-unsubscribe"))
  );
  if (newsletterMatch || input.headers["list-unsubscribe"]) {
    factors.push({
      factor: "from_newsletter",
      weight: PRIORITY_WEIGHTS.from_newsletter,
      matched: true,
      evidence: "Newsletter/bulk mail indicators",
    });
    score += PRIORITY_WEIGHTS.from_newsletter;
  }

  const isNoReply =
    senderEmail.startsWith("noreply") ||
    senderEmail.startsWith("no-reply") ||
    senderEmail.startsWith("donotreply") ||
    senderEmail.includes("notifications@") ||
    senderEmail.includes("mailer-daemon");
  if (isNoReply) {
    factors.push({
      factor: "from_automated",
      weight: PRIORITY_WEIGHTS.from_automated,
      matched: true,
      evidence: "Automated sender address",
    });
    score += PRIORITY_WEIGHTS.from_automated;
  }

  const hasBulkHeaders =
    input.headers["precedence"] === "bulk" ||
    input.headers["x-mailer"]?.toLowerCase().includes("mailchimp") ||
    input.headers["x-mailer"]?.toLowerCase().includes("sendgrid") ||
    input.headers["x-sg-eid"];
  if (hasBulkHeaders) {
    factors.push({
      factor: "bulk_headers",
      weight: PRIORITY_WEIGHTS.bulk_headers,
      matched: true,
      evidence: "Bulk mail headers present",
    });
    score += PRIORITY_WEIGHTS.bulk_headers;
  }

  if (input.headers["list-unsubscribe"]) {
    factors.push({
      factor: "list_unsubscribe",
      weight: PRIORITY_WEIGHTS.list_unsubscribe,
      matched: true,
      evidence: "List-Unsubscribe header present",
    });
    score += PRIORITY_WEIGHTS.list_unsubscribe;
  }

  const isConsumerDomain = CONSUMER_EMAIL_DOMAINS.some(
    (d) => senderDomain === d
  );
  const isKnown =
    context.clientEmails.has(senderEmail) ||
    context.clientDomains.has(senderDomain);
  if (isConsumerDomain && !isKnown) {
    factors.push({
      factor: "consumer_domain_unknown",
      weight: PRIORITY_WEIGHTS.consumer_domain_unknown,
      matched: true,
      evidence: "Unknown sender from consumer email domain",
    });
    score += PRIORITY_WEIGHTS.consumer_domain_unknown;
  }

  score = Math.max(0, Math.min(100, score));

  const tier = scoreToPriorityTier(score);

  return { score, tier, factors };
}

export function scoreToPriorityTier(score: number): EmailPriorityTierValue {
  if (score >= PRIORITY_TIER_THRESHOLDS.urgent) return "urgent";
  if (score >= PRIORITY_TIER_THRESHOLDS.important) return "important";
  if (score >= PRIORITY_TIER_THRESHOLDS.normal) return "normal";
  if (score >= PRIORITY_TIER_THRESHOLDS.low) return "low";
  return "noise";
}
