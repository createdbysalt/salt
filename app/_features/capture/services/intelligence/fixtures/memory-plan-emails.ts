/**
 * Fixture emails for Memory Plan unit tests.
 *
 * OpenSrc references (research-only for AGPL; MIT deps may be added later):
 * - twentyhq/twenty — email→person/org linking patterns
 * - elie222/inbox-zero — sender categorization (AGPL, no code import)
 * - nodemailer/mailparser, sebbo2002/node-ical — ICS/MIME (Phase 5)
 */

import type { EmailToAnalyze } from "../email-analyzer";

const BASE: Omit<EmailToAnalyze, "id" | "subject" | "body_text" | "snippet"> = {
  from_email: "coordinator@mannahouse.org",
  from_name: "Manna House Team",
  to_emails: ["hello@createdbysalt.com"],
  sent_at: "2026-06-10T14:00:00.000Z",
  thread_id: "thread-manna-house-training",
  is_sent_by_user: false,
  has_prior_thread: false,
};

export const MANNA_HOUSE_TRAINING_EMAIL: EmailToAnalyze = {
  ...BASE,
  id: "fixture-manna-house-training",
  subject: "Monthly training session mannahouse",
  snippet: "Join us for the monthly volunteer training session this Thursday.",
  body_text:
    "Hi Gabi,\n\nReminder: our monthly training session for Manna House volunteers is this Thursday at 6pm.\n\nThanks,\nManna House Team",
};

export const SITE_STRATEGY_REVIEW_EMAIL: EmailToAnalyze = {
  id: "fixture-site-strategy-review",
  from_email: "liam@clientstudio.com",
  from_name: "Liam Chen",
  to_emails: ["hello@createdbysalt.com"],
  subject: "Your site strategy is ready for review",
  snippet: "The site strategy deck is ready for your feedback.",
  body_text:
    "Hi Gabi,\n\nYour site strategy document is ready for review. Let me know if you'd like to walk through it on a call.\n\nBest,\nLiam",
  sent_at: "2026-06-11T10:30:00.000Z",
  thread_id: "thread-site-strategy",
  is_sent_by_user: false,
  has_prior_thread: true,
};
