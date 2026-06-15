/**
 * Per-signup timing for waitlist nurture (emails 2–4).
 * Email #1 sends immediately on form completion; this module drives the drip.
 */

import type { WaitlistSequenceSlug } from "@/app/_lib/email/waitlist-sequence-emails";

/** Nurture emails sent automatically by cron (emails 2–4 only until post-#4 is approved). */
export const WAITLIST_AUTOMATED_NURTURE_SLUGS = [
  "02-invisible-load",
  "03-morning-waiting",
  "04-money-on-table",
] as const satisfies readonly WaitlistSequenceSlug[];

export type WaitlistAutomatedNurtureSlug =
  (typeof WAITLIST_AUTOMATED_NURTURE_SLUGS)[number];

/** Nurture emails sent relative to waitlist completion (not fixed calendar blasts). */
export const WAITLIST_SIGNUP_RELATIVE_SCHEDULE: ReadonlyArray<{
  slug: WaitlistAutomatedNurtureSlug;
  daysAfterSignup: number;
}> = [
  { slug: "02-invisible-load", daysAfterSignup: 3 },
  { slug: "03-morning-waiting", daysAfterSignup: 7 },
  { slug: "04-money-on-table", daysAfterSignup: 10 },
] as const;

export function isWaitlistAutomatedNurtureSlug(
  slug: WaitlistSequenceSlug
): slug is WaitlistAutomatedNurtureSlug {
  return (WAITLIST_AUTOMATED_NURTURE_SLUGS as readonly string[]).includes(slug);
}

/** Set to "true" when emails 5+ are approved for automated / batch send. */
export function isWaitlistPostEmail4NurtureEnabled(): boolean {
  return process.env.WAITLIST_NURTURE_POST_EMAIL_4_ENABLED === "true";
}

export function canSendWaitlistSequenceEmail(
  slug: WaitlistSequenceSlug
): boolean {
  if (isWaitlistAutomatedNurtureSlug(slug)) {
    return true;
  }
  return isWaitlistPostEmail4NurtureEnabled();
}

export function getWaitlistSequenceSendBlockedReason(
  slug: WaitlistSequenceSlug
): string | null {
  if (canSendWaitlistSequenceEmail(slug)) {
    return null;
  }

  return `Waitlist email "${slug}" is gated until WAITLIST_NURTURE_POST_EMAIL_4_ENABLED=true.`;
}

export type WaitlistEmailSequenceState = {
  /** Sequence slugs already delivered via Resend. */
  sent: WaitlistSequenceSlug[];
  /** ISO timestamp when nurture enrollment started (first complete signup). */
  enrolled_at: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseIsoDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function utcDayDiff(from: Date, to: Date): number {
  const fromDay = startOfUtcDay(from).getTime();
  const toDay = startOfUtcDay(to).getTime();
  return Math.floor((toDay - fromDay) / MS_PER_DAY);
}

export function normalizeWaitlistEmailSequence(
  raw: unknown,
  fallbackEnrolledAt: string
): WaitlistEmailSequenceState {
  if (!raw || typeof raw !== "object") {
    return { sent: [], enrolled_at: fallbackEnrolledAt };
  }

  const record = raw as Record<string, unknown>;
  const sent = Array.isArray(record.sent)
    ? record.sent.filter(
        (item): item is WaitlistSequenceSlug => typeof item === "string"
      )
    : [];

  const enrolledAt =
    typeof record.enrolled_at === "string" &&
    parseIsoDate(record.enrolled_at) !== null
      ? record.enrolled_at
      : fallbackEnrolledAt;

  return { sent, enrolled_at: enrolledAt };
}

export function getDueWaitlistSequenceSlug(input: {
  enrolledAt: string;
  sent: WaitlistSequenceSlug[];
  now?: Date;
}): WaitlistSequenceSlug | null {
  const enrolled = parseIsoDate(input.enrolledAt);
  if (!enrolled) {
    return null;
  }

  const now = input.now ?? new Date();
  const daysSinceSignup = utcDayDiff(enrolled, now);
  const sentSet = new Set(input.sent);

  for (const step of WAITLIST_SIGNUP_RELATIVE_SCHEDULE) {
    if (sentSet.has(step.slug)) {
      continue;
    }
    if (daysSinceSignup >= step.daysAfterSignup) {
      return step.slug;
    }
    return null;
  }

  return null;
}

export function appendSentWaitlistSequenceSlug(
  state: WaitlistEmailSequenceState,
  slug: WaitlistSequenceSlug
): WaitlistEmailSequenceState {
  if (state.sent.includes(slug)) {
    return state;
  }
  return {
    ...state,
    sent: [...state.sent, slug],
  };
}
