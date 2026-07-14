/**
 * Email Intelligence Layer
 *
 * Multi-dimensional email classification for triage, priority, and learning.
 * Classifies emails by type, category, priority, and urgency, then recommends
 * triage actions (surface now, batch digest, silent archive).
 *
 * Usage:
 *   import { classifyEmail, type EmailClassification } from './email-classification';
 *
 *   const classification = classifyEmail(input, context);
 *   // classification.category: 'action_required' | 'money_moves' | 'opportunities' | ...
 *   // classification.priorityScore: 0-100
 *   // classification.triageAction: 'surface_now' | 'batch_digest' | 'silent_archive'
 *
 * See: docs/plans/2026-07-13-email-intelligence-layer.md
 */

export { classifyEmail } from "./classifier";

export {
  calculatePriorityScore,
  scoreToPriorityTier,
  type PriorityResult,
} from "./priority-scoring";

export {
  detectUrgency,
  type UrgencyResult,
} from "./urgency-detection";

export {
  detectMoney,
  extractMoneyAmount,
  type MoneyResult,
} from "./money-detection";

export type {
  EmailClassification,
  EmailClassificationInput,
  ClassificationContext,
  EmailType,
  EmailCategoryValue,
  EmailPriorityTierValue,
  UrgencyLevel,
  TriageAction,
  PriorityFactor,
  SenderReputation,
} from "./types";

export {
  PRIORITY_WEIGHTS,
  PRIORITY_TIER_THRESHOLDS,
  URGENCY_KEYWORDS,
  MONEY_PATTERNS,
  ACTION_PATTERNS,
  DEADLINE_PATTERNS,
  QUESTION_PATTERNS,
  NEWSLETTER_PATTERNS,
  PAYMENT_LINK_DOMAINS,
  INVOICE_ATTACHMENT_PATTERNS,
  CONSUMER_EMAIL_DOMAINS,
} from "./types";
