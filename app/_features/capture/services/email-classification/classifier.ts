/**
 * Email Classifier
 *
 * Multi-dimensional email classification combining:
 * - Type classification (personal, transactional, promotional, automated)
 * - Category classification (action_required, money_moves, opportunities, etc.)
 * - Priority scoring (0-100)
 * - Urgency detection
 * - Triage action recommendation
 */

import type {
  EmailClassificationInput,
  ClassificationContext,
  EmailClassification,
  EmailType,
  EmailCategoryValue,
  TriageAction,
} from "./types";
import {
  NEWSLETTER_PATTERNS,
  ACTION_PATTERNS,
  QUESTION_PATTERNS,
} from "./types";
import { calculatePriorityScore } from "./priority-scoring";
import { detectUrgency } from "./urgency-detection";
import { detectMoney } from "./money-detection";
import { parseSenderEmail } from "../../types/sender-profiles";

export function classifyEmail(
  input: EmailClassificationInput,
  context: ClassificationContext
): EmailClassification {
  const { email: senderEmail, domain: senderDomain } = parseSenderEmail(
    input.fromEmail
  );
  const content = `${input.subject} ${input.bodyPreview}`;

  const { type, typeConfidence } = classifyType(input);

  const { category, categoryConfidence } = classifyCategory(
    input,
    context,
    type
  );

  const { score: priorityScore, tier: priorityTier, factors: priorityFactors } =
    calculatePriorityScore(input, context);

  const { level: urgencyLevel, markers: urgencyMarkers } = detectUrgency(
    input.subject,
    input.bodyPreview
  );

  const senderReputation = context.senderProfiles.get(senderEmail) ?? null;

  const relationshipStrength = calculateRelationshipStrength(
    senderEmail,
    senderDomain,
    context,
    senderReputation
  );

  const triageAction = determineTriageAction(
    priorityScore,
    urgencyLevel,
    category
  );

  const signals = deriveSignals(input, context, {
    type,
    category,
    urgencyLevel,
    priorityScore,
    senderReputation,
  });

  return {
    type,
    typeConfidence,
    category,
    categoryConfidence,
    priorityScore,
    priorityTier,
    priorityFactors,
    urgencyLevel,
    urgencyMarkers,
    senderReputation,
    relationshipStrength,
    triageAction,
    signals,
  };
}

function classifyType(
  input: EmailClassificationInput
): { type: EmailType; typeConfidence: number } {
  const content = `${input.subject} ${input.bodyPreview}`.toLowerCase();

  const isNoReply =
    input.fromEmail.startsWith("noreply") ||
    input.fromEmail.startsWith("no-reply") ||
    input.fromEmail.startsWith("donotreply") ||
    input.fromEmail.includes("notifications@") ||
    input.fromEmail.includes("mailer-daemon");

  if (isNoReply) {
    return { type: "automated", typeConfidence: 95 };
  }

  const hasListUnsubscribe = !!input.headers["list-unsubscribe"];
  const isNewsletter = NEWSLETTER_PATTERNS.some(
    (p) => p.test(content) || p.test(input.headers["list-unsubscribe"] ?? "")
  );

  if (hasListUnsubscribe || isNewsletter) {
    return { type: "promotional", typeConfidence: 85 };
  }

  const hasTransactionalSignals =
    content.includes("receipt") ||
    content.includes("order confirmation") ||
    content.includes("shipping") ||
    content.includes("tracking number") ||
    content.includes("password reset") ||
    content.includes("verification code") ||
    content.includes("your account");

  if (hasTransactionalSignals) {
    return { type: "transactional", typeConfidence: 80 };
  }

  const hasPersonalSignals =
    input.isReply ||
    input.threadDepth > 0 ||
    ACTION_PATTERNS.some((p) => p.test(content)) ||
    QUESTION_PATTERNS.some((p) => p.test(content));

  if (hasPersonalSignals) {
    return { type: "personal", typeConfidence: 70 };
  }

  return { type: "unknown", typeConfidence: 50 };
}

function classifyCategory(
  input: EmailClassificationInput,
  context: ClassificationContext,
  type: EmailType
): { category: EmailCategoryValue; categoryConfidence: number } {
  const { email: senderEmail, domain: senderDomain } = parseSenderEmail(
    input.fromEmail
  );
  const content = `${input.subject} ${input.bodyPreview}`;

  const moneyResult = detectMoney(input);
  if (
    moneyResult.hasMoney ||
    moneyResult.hasInvoiceAttachment ||
    moneyResult.hasPaymentLink
  ) {
    return { category: "money_moves", categoryConfidence: 90 };
  }

  const isKnownClient =
    context.clientEmails.has(senderEmail) ||
    context.clientDomains.has(senderDomain);

  const requiresAction =
    ACTION_PATTERNS.some((p) => p.test(content)) ||
    QUESTION_PATTERNS.some((p) => p.test(content));

  if (isKnownClient && requiresAction) {
    return { category: "action_required", categoryConfidence: 85 };
  }

  const senderReputation = context.senderProfiles.get(senderEmail);
  const isFirstContact = !senderReputation && input.threadDepth === 0;
  const hasOpportunitySignals =
    content.toLowerCase().includes("interested in") ||
    content.toLowerCase().includes("would like to") ||
    content.toLowerCase().includes("looking for") ||
    content.toLowerCase().includes("inquiry") ||
    content.toLowerCase().includes("quote");

  if (isFirstContact && hasOpportunitySignals) {
    return { category: "opportunities", categoryConfidence: 75 };
  }

  if (type === "promotional" || type === "automated") {
    const isProbablySubscribed =
      senderReputation && senderReputation.captureCount > 3;

    if (isProbablySubscribed) {
      return { category: "subscribed", categoryConfidence: 80 };
    }
    return { category: "noise", categoryConfidence: 85 };
  }

  if (isKnownClient || (senderReputation && senderReputation.responseRate > 0.3)) {
    return { category: "updates", categoryConfidence: 70 };
  }

  if (input.headers["list-unsubscribe"]) {
    return { category: "noise", categoryConfidence: 75 };
  }

  return { category: "updates", categoryConfidence: 50 };
}

function calculateRelationshipStrength(
  senderEmail: string,
  senderDomain: string,
  context: ClassificationContext,
  senderReputation: { responseRate: number; captureCount: number } | null
): number {
  let strength = 0;

  if (context.clientEmails.has(senderEmail)) {
    strength += 40;
  } else if (context.clientDomains.has(senderDomain)) {
    strength += 30;
  }

  if (context.vipEmails.has(senderEmail)) {
    strength += 25;
  }

  if (senderReputation) {
    strength += Math.min(20, senderReputation.responseRate * 20);
    strength += Math.min(15, Math.log2(senderReputation.captureCount + 1) * 3);
  }

  return Math.min(100, strength);
}

function determineTriageAction(
  priorityScore: number,
  urgencyLevel: string,
  category: EmailCategoryValue
): TriageAction {
  if (urgencyLevel === "critical" || urgencyLevel === "high") {
    return "surface_now";
  }

  if (priorityScore >= 60) {
    return "surface_now";
  }

  if (category === "noise") {
    return "silent_archive";
  }

  if (priorityScore >= 50) {
    return "surface_now";
  }

  if (priorityScore < 30) {
    return "silent_archive";
  }

  return "batch_digest";
}

function deriveSignals(
  input: EmailClassificationInput,
  context: ClassificationContext,
  classification: {
    type: EmailType;
    category: EmailCategoryValue;
    urgencyLevel: string;
    priorityScore: number;
    senderReputation: { responseRate: number } | null;
  }
): string[] {
  const signals: string[] = [];
  const { email: senderEmail } = parseSenderEmail(input.fromEmail);
  const content = `${input.subject} ${input.bodyPreview}`;

  if (
    classification.urgencyLevel === "high" ||
    classification.urgencyLevel === "critical"
  ) {
    signals.push("email_urgency_high");
  }

  const moneyResult = detectMoney(input);
  if (moneyResult.hasMoney) {
    signals.push("email_money_amount_detected");
  }
  if (moneyResult.hasInvoiceAttachment) {
    signals.push("email_invoice_attached");
  }
  if (moneyResult.hasPaymentLink) {
    signals.push("email_payment_link_detected");
  }

  if (ACTION_PATTERNS.some((p) => p.test(content))) {
    signals.push("email_action_requested");
  }

  if (QUESTION_PATTERNS.some((p) => p.test(content))) {
    signals.push("email_question_asked");
  }

  if (input.threadDepth === 0 && !context.senderProfiles.has(senderEmail)) {
    signals.push("sender_first_contact");
  }

  if (context.vipEmails.has(senderEmail)) {
    signals.push("sender_vip");
  }

  if (
    classification.senderReputation &&
    classification.senderReputation.responseRate > 0.7
  ) {
    signals.push("sender_high_engagement");
  }

  const categorySignal = `email_classified_${classification.category.replace(/_/g, "_")}`;
  signals.push(categorySignal);

  return signals;
}
