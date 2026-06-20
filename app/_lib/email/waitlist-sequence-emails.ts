/**
 * Waitlist nurture sequence (emails 2–8 + stay-warm) — Resend.
 * Copy source: salt-software-knowledge-base waitlist-sequence.md
 */

import { MARKETING_EMAIL_COLORS } from "@/app/_lib/email/marketing-email-brand";
import {
  WAITLIST_EMAIL_SIGN_OFF_TEXT,
  WaitlistEmailDocument,
  buildMarketingSequenceEmail,
  buildWaitlistEmailDocument,
  marketingEmailParagraphBlock,
  resolveWaitlistSiteUrl,
  waitlistBodyParagraphHtml,
  waitlistBodySectionRowHtml,
  waitlistFooterLinksText,
  waitlistPrimaryCtaHtml,
  waitlistSectionHeadingHtml,
  waitlistSignOffAndCloseRowHtml,
  waitlistTimelineItemHtml,
} from "@/app/_lib/email/waitlist-email-layout";

export type WaitlistSequenceSlug =
  | "02-invisible-load"
  | "03-morning-waiting"
  | "04-money-on-table"
  | "05a-access-granted"
  | "05b-still-in-line"
  | "06-activation"
  | "07-early-adopter"
  | "stay-warm"
  | "08-public-launch";

export type WaitlistSequenceEmailMeta = {
  slug: WaitlistSequenceSlug;
  label: string;
  trigger: string;
  subject: string;
  previewText: string;
  heroHeadline: string;
  heroSubtitle: string;
};

function resolveAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://app.usesalt.io"
  );
}

function paragraphBlock(
  paragraphs: string[],
  colors = MARKETING_EMAIL_COLORS
): string {
  return marketingEmailParagraphBlock(paragraphs, colors);
}

function buildSequenceEmail(input: {
  subject: string;
  previewText: string;
  siteUrl: string;
  logoCid?: string;
  badge: string;
  headline: string;
  heroSubtitle: string;
  pill?: { text: string; href?: string };
  introParagraphs?: string[];
  sectionsHtml?: string;
  closingParagraphs: string[];
  text: string;
}): WaitlistEmailDocument {
  return buildMarketingSequenceEmail(input);
}

// ─── Email 2 — The invisible load ───────────────────────────────────────────

export const WAITLIST_SEQUENCE_02_SUBJECT = "The invisible load";
export const WAITLIST_SEQUENCE_02_PREVIEW =
  "You're not disorganized. You're undersupported.";

export const WAITLIST_SEQUENCE_02_HERO = {
  headline: "The work no one sees",
  subtitle:
    "Coordination that never lands on your timesheet still costs you.",
} as const;

export function buildWaitlistSequence02Email(options?: {
  siteUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const footer = waitlistFooterLinksText(siteUrl);

  const text = `${WAITLIST_SEQUENCE_02_PREVIEW}

Let's talk about the part of your day that doesn't show up on your timesheet.

It's the 3:00 PM scroll through your tools looking for a thread you know you saw. The mental tally of who's waiting on you. The calendar prep you do in your head during a meeting because you didn't have time before it. The follow-ups you owe, the contracts you're supposed to review, the context you need to rebuild every time you switch windows.

None of that is billable. None of it is strategic. And all of it counts as work. Your brain doesn't know the difference between writing a proposal and searching for an attachment. Both drain the same resource.

This is what we call the invisible load. It's not a productivity problem. It's not a discipline problem. It's a support problem.

You're running a business. You're managing clients. You're delivering work. And you're doing all the operational overhead that a team of three would handle, alone.

The tools you use weren't built for this. Each one handles its own lane: email, calendar, CRM, payments. But they don't share context. You're the one connecting what a client said in the inbox to what's on the calendar and what's still open in the pipeline. That glue work never shows up as a task. It just lives in your head.

That's the actual bottleneck. Not your focus. The fragmentation.

You're not disorganized. You're carrying coordination work your stack never took on.

That's why we built Salt.

Next time, we'll show you what happens when that invisible load has a place to live.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_02_SUBJECT,
    previewText: WAITLIST_SEQUENCE_02_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "Waitlist",
    headline: WAITLIST_SEQUENCE_02_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_02_HERO.subtitle,
    introParagraphs: [
      "Let's talk about the part of your day that doesn't show up on your timesheet.",
      "It's the 3:00 PM scroll through your tools looking for a thread you know you saw. The mental tally of who's waiting on you. The calendar prep you do in your head during a meeting because you didn't have time before it. The follow-ups you owe, the contracts you're supposed to review, the context you need to rebuild every time you switch windows.",
    ],
    sectionsHtml: waitlistBodySectionRowHtml(
      paragraphBlock([
        "None of that is billable. None of it is strategic. And all of it counts as work. Your brain doesn't know the difference between writing a proposal and searching for an attachment. Both drain the same resource.",
        "This is what we call the invisible load. It's not a productivity problem. It's not a discipline problem. It's a support problem.",
        "You're running a business. You're managing clients. You're delivering work. And you're doing all the operational overhead that a team of three would handle, alone.",
        "The tools you use weren't built for this. Each one handles its own lane: email, calendar, CRM, payments. But they don't share context. You're the one connecting what a client said in the inbox to what's on the calendar and what's still open in the pipeline. That glue work never shows up as a task. It just lives in your head.",
        "That's the actual bottleneck. Not your focus. The fragmentation.",
        "You're not disorganized. You're carrying coordination work your stack never took on.",
        "That's why we built Salt.",
      ]),
      "24px 32px 8px"
    ),
    closingParagraphs: [
      "Next time, we'll show you what happens when that invisible load has a place to live.",
    ],
    text,
  });
}

// ─── Email 3 — The morning that's waiting for you ───────────────────────────

export const WAITLIST_SEQUENCE_03_SUBJECT = "The morning that's waiting for you";
export const WAITLIST_SEQUENCE_03_PREVIEW =
  "A morning that starts with decisions, not chaos.";

export const WAITLIST_SEQUENCE_03_HERO = {
  headline: "Why we built Salt",
  subtitle: "We hit a ceiling at one client a month. Then we changed the morning.",
} as const;

export function buildWaitlistSequence03Email(options?: {
  siteUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const footer = waitlistFooterLinksText(siteUrl);

  const text = `${WAITLIST_SEQUENCE_03_PREVIEW}

Every product has an origin story. Here's ours.

We ran a small studio. Two people. A handful of clients. And a sinking feeling that the work that actually mattered was getting pushed to tomorrow.

Not because we weren't working hard. We were working too hard, on the wrong things.

Contracts needed drafting. Proposals never wrote themselves. Every new client meant a fresh onboarding flow: send the intake form, chase the signed agreement, set up the folder, create the invoice, log it in the CRM. By the time the actual work started, half the week was gone.

And that's when everything was going well. When a proposal went unanswered, a receipt got lost, or a follow-up slipped, we lost hours hunting, apologizing, and rebuilding context.

We were spending our time running operations, not running our business.

The breaking point came when we realized how much of our week was eaten by the machine of getting clients in the door. One client a month felt like the ceiling, not because the work wasn't there, but because we didn't have the operational capacity to handle more.

So we built Salt.

Not as a side project. Not as a product idea. As the system we needed to break the ceiling.

The first version took over the operational layer: surfacing what needed a decision, handling the rest automatically. No more hunting for threads. No more drafting the same contract from scratch. No more onboarding sequences that took longer than the first deliverable.

The shift was measurable. We went from one client a month to five. Same team. Same hours. The difference was that our time went to the work that grew the business instead of the operations that kept it running in place.

That's the transformation Salt was built for. Not email automation. A business that doesn't cap your capacity at your own bandwidth.

We'll keep you posted as early access opens.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_03_SUBJECT,
    previewText: WAITLIST_SEQUENCE_03_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "Our story",
    headline: WAITLIST_SEQUENCE_03_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_03_HERO.subtitle,
    pill: { text: "Your spot is held" },
    introParagraphs: [
      "Every product has an origin story. Here's ours.",
      "We ran a small studio. Two people. A handful of clients. And a sinking feeling that the work that actually mattered was getting pushed to tomorrow.",
    ],
    sectionsHtml: waitlistBodySectionRowHtml(
      paragraphBlock([
        "Not because we weren't working hard. We were working too hard, on the wrong things.",
        "Contracts needed drafting. Proposals never wrote themselves. Every new client meant a fresh onboarding flow: send the intake form, chase the signed agreement, set up the folder, create the invoice, log it in the CRM. By the time the actual work started, half the week was gone.",
        "And that's when everything was going well. When a proposal went unanswered, a receipt got lost, or a follow-up slipped, we lost hours hunting, apologizing, and rebuilding context.",
        "We were spending our time running operations, not running our business.",
        "The breaking point came when we realized how much of our week was eaten by the machine of getting clients in the door. One client a month felt like the ceiling, not because the work wasn't there, but because we didn't have the operational capacity to handle more.",
        "So we built Salt.",
        "Not as a side project. Not as a product idea. As the system we needed to break the ceiling.",
        "The first version took over the operational layer: surfacing what needed a decision, handling the rest automatically. No more hunting for threads. No more drafting the same contract from scratch. No more onboarding sequences that took longer than the first deliverable.",
        "The shift was measurable. We went from one client a month to five. Same team. Same hours. The difference was that our time went to the work that grew the business instead of the operations that kept it running in place.",
        "That's the transformation Salt was built for. Not email automation. A business that doesn't cap your capacity at your own bandwidth.",
      ]),
      "24px 32px 8px"
    ),
    closingParagraphs: [
      "We'll keep you posted as early access opens.",
    ],
    text,
  });
}

// ─── Email 4 — Money on the table calculator ────────────────────────────────

export const WAITLIST_SEQUENCE_04_SUBJECT = "Two minutes. Money on the table.";
export const WAITLIST_SEQUENCE_04_PREVIEW =
  "Seven questions. No spreadsheet. Just the number.";

export const WAITLIST_SEQUENCE_04_HERO = {
  headline: "Find the leak",
  subtitle: "Most solo businesses lose money in places that never show up on an invoice.",
} as const;

export function buildWaitlistSequence04Email(options?: {
  siteUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const calculatorUrl = `${siteUrl}/money-on-the-table`;
  const c = MARKETING_EMAIL_COLORS;
  const footer = waitlistFooterLinksText(siteUrl);

  const sectionsHtml = waitlistBodySectionRowHtml(
    [
      paragraphBlock([
        "You're on the Salt waitlist. While you wait, here's something worth two minutes.",
        "Most one-person businesses lose money in three quiet places: inquiries that go cold before anyone replies, proposals that never get a follow-up, and admin hours that could run themselves. None of it shows up on an invoice. That's why it's so easy to miss.",
        "There's a calculator that shows you the size of those leaks for a business like yours. Seven questions, no spreadsheet. You answer, and it shows you the number and exactly where it's coming from.",
      ]),
      waitlistPrimaryCtaHtml(
        calculatorUrl,
        "Show me the money on the table →",
        c
      ),
      `<p style="margin: 0; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">It's an estimate, not your books. But for most people it's the first time the cost of "I'll get to it later" has an actual number on it.</p>
      <p style="margin: 14px 0 0; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">That number is what Salt is built to close. You'll see how when you're in.</p>`,
    ].join(""),
    "24px 32px 8px"
  );

  const text = `${WAITLIST_SEQUENCE_04_PREVIEW}

You're on the Salt waitlist. While you wait, here's something worth two minutes.

Most one-person businesses lose money in three quiet places: inquiries that go cold before anyone replies, proposals that never get a follow-up, and admin hours that could run themselves. None of it shows up on an invoice. That's why it's so easy to miss.

There's a calculator that shows you the size of those leaks for a business like yours. Seven questions, no spreadsheet.

Show me the money on the table → ${calculatorUrl}

It's an estimate, not your books. But for most people it's the first time the cost of "I'll get to it later" has an actual number on it.

That number is what Salt is built to close. You'll see how when you're in.

Your spot is held. We'll email you when it's your turn.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_04_SUBJECT,
    previewText: WAITLIST_SEQUENCE_04_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "While you wait",
    headline: WAITLIST_SEQUENCE_04_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_04_HERO.subtitle,
    sectionsHtml,
    closingParagraphs: [
      "Your spot is held. We'll email you when it's your turn.",
    ],
    text,
  });
}

// ─── Email 5A — Access granted ────────────────────────────────────────────

export const WAITLIST_SEQUENCE_05A_SUBJECT = "You got your spot. Let's go.";
export const WAITLIST_SEQUENCE_05A_PREVIEW =
  "Early access is yours. Connect your tools.";

export const WAITLIST_SEQUENCE_05A_HERO = {
  headline: "You're in.",
  subtitle: "Connect your tools tonight. Tomorrow starts different.",
} as const;

export function buildWaitlistSequence05aEmail(options?: {
  siteUrl?: string;
  appUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const appUrl = options?.appUrl ?? `${resolveAppUrl()}/connections`;
  const c = MARKETING_EMAIL_COLORS;
  const footer = waitlistFooterLinksText(siteUrl);

  const steps = [
    {
      phase: "Connect your tools",
      body: "All of them. Email, calendar, CRM, Slack, Stripe. Everything you use to run your business. The more you connect, the more Salt surfaces. Read-only access. Nothing ships without your approval.",
    },
    {
      phase: "Tomorrow morning",
      body: "You get your first briefing. Salt processes overnight. When you open your laptop, you'll see what needs your attention, surfaced, organized, ready for a decision.",
    },
    {
      phase: "Your pricing is locked",
      body: "As an early access member, you're grandfathered at launch pricing. When Salt opens more broadly, your rate stays the same. Early access includes 2 months free on annual.",
    },
  ];

  const stepsHtml = steps
    .map((item, index) =>
      waitlistTimelineItemHtml(item.phase, item.body, c, index === steps.length - 1)
    )
    .join("");

  const sectionsHtml = [
    waitlistBodySectionRowHtml(
      paragraphBlock([
        "You're in.",
        "You're among the first people to use Salt. That means you're not just trying a product. You're shaping what it becomes.",
        "Here's what happens next.",
      ])
    ),
    `<tr>
      <td style="padding: 8px 32px 8px; background-color: ${c.card};">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
          ${stepsHtml}
        </table>
      </td>
    </tr>`,
    waitlistBodySectionRowHtml(
      paragraphBlock([
        "One more thing: you're early. That means what you notice, what you flag, and what you tell us directly shapes the product. We read every response.",
      ]),
      "16px 32px 8px"
    ),
    `<tr>
      <td style="padding: 8px 32px 0; background-color: ${c.card};">
        ${waitlistPrimaryCtaHtml(appUrl, "Connect your tools and start →", c)}
      </td>
    </tr>`,
  ].join("");

  const text = `${WAITLIST_SEQUENCE_05A_PREVIEW}

You're in.

You're among the first people to use Salt. That means you're not just trying a product. You're shaping what it becomes.

Connect your tools: All of them. Read-only access. Nothing ships without your approval.

Tomorrow morning: Your first briefing is ready when you open your laptop.

Your pricing is locked: Grandfathered at launch pricing. Early access includes 2 months free on annual.

Connect your tools and start → ${appUrl}

Your spot is open. Your tools are waiting. Let's see what Salt finds.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_05A_SUBJECT,
    previewText: WAITLIST_SEQUENCE_05A_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "You're in",
    headline: WAITLIST_SEQUENCE_05A_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_05A_HERO.subtitle,
    sectionsHtml,
    closingParagraphs: [
      "Your spot is open. Your tools are waiting. Let's see what Salt finds.",
    ],
    text,
  });
}

// ─── Email 5B — Still on the list ───────────────────────────────────────────

export const WAITLIST_SEQUENCE_05B_SUBJECT = "Still in line. More access coming.";
export const WAITLIST_SEQUENCE_05B_PREVIEW =
  "Your spot is held. Next wave opens soon.";

export const WAITLIST_SEQUENCE_05B_HERO = {
  headline: "Still in line.",
  subtitle: "Your spot is held. You'll hear from us before the next wave.",
} as const;

export function buildWaitlistSequence05bEmail(options?: {
  siteUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const c = MARKETING_EMAIL_COLORS;
  const footer = waitlistFooterLinksText(siteUrl);

  const steps = [
    {
      phase: "Your spot is held",
      body: "You're first in line for the next round. When we open more access, you'll know before anyone else.",
    },
    {
      phase: "Your pricing is locked",
      body: "The launch pricing offer applies when you get in. First 200 customers. You signed up early enough.",
    },
    {
      phase: "What to do between now and then",
      body: "Nothing. Keep running your business. We'll let you know when your turn comes.",
    },
  ];

  const stepsHtml = steps
    .map((item, index) =>
      waitlistTimelineItemHtml(item.phase, item.body, c, index === steps.length - 1)
    )
    .join("");

  const text = `${WAITLIST_SEQUENCE_05B_PREVIEW}

The first wave of early access just went out.

You're not in this wave yet. Here's what that means.

Your spot is held. You're first in line for the next round.

Your pricing is locked. The launch pricing offer applies when you get in.

What to do between now and then: Nothing. Keep running your business.

The wait is real. But it's limited. More access is opening soon, and you'll be first to know.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_05B_SUBJECT,
    previewText: WAITLIST_SEQUENCE_05B_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "Waitlist",
    headline: WAITLIST_SEQUENCE_05B_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_05B_HERO.subtitle,
    pill: { text: "Your spot is confirmed" },
    introParagraphs: [
      "The first wave of early access just went out.",
      "You're not in this wave yet. Here's what that means.",
    ],
    sectionsHtml: `<tr>
      <td style="padding: 8px 32px 8px; background-color: ${c.card};">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
          ${stepsHtml}
        </table>
      </td>
    </tr>`,
    closingParagraphs: [
      "The wait is real. But it's limited. More access is opening soon, and you'll be first to know.",
    ],
    text,
  });
}

// ─── Email 6 — Activation follow-up ───────────────────────────────────────

export const WAITLIST_SEQUENCE_06_SUBJECT = "Still thinking about it?";
export const WAITLIST_SEQUENCE_06_PREVIEW =
  "Your briefing is ready whenever you are.";

export const WAITLIST_SEQUENCE_06_HERO = {
  headline: "Almost there.",
  subtitle: "Your briefing gets sharper with every tool you connect.",
} as const;

export function buildWaitlistSequence06Email(options?: {
  siteUrl?: string;
  appUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const appUrl = options?.appUrl ?? `${resolveAppUrl()}/connections`;
  const c = MARKETING_EMAIL_COLORS;
  const footer = waitlistFooterLinksText(siteUrl);

  const sectionsHtml = [
    waitlistBodySectionRowHtml(
      [
        paragraphBlock([
          "You're on the list. Your access is open. And maybe you haven't plugged anything in yet.",
          "That's fine. Salt isn't going anywhere.",
          "But here's the thing: the more tools you connect on day one, the more Salt surfaces tomorrow morning.",
          "Your email, calendar, and CRM aren't going to be less busy tomorrow. If anything, the pile grows overnight. Every thread you miss, every delayed reply, every context switch costs more than you feel in the moment.",
          "Salt doesn't need a full setup. But it works best when you connect everything at once: email, calendar, CRM, payments, Slack. Each tool adds more signal.",
        ]),
        `<p style="margin: 0; font-size: 16px; line-height: 26px; color: ${c.mutedLight};"><strong style="font-weight: 600; color: ${c.ink};">Ten minutes from right now, you could have them all connected.</strong></p>`,
      ].join("")
    ),
    `<tr>
      <td style="padding: 16px 32px 8px; background-color: ${c.card};">
        ${waitlistSectionHeadingHtml("Three steps", c)}
        <p style="margin: 0 0 10px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><span style="color: ${c.ink}; font-weight: 500;">1.</span> Open your account.</p>
        <p style="margin: 0 0 10px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><span style="color: ${c.ink}; font-weight: 500;">2.</span> Connect every tool you use: email, calendar, CRM, payments, Slack, all of it.</p>
        <p style="margin: 0 0 0; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><span style="color: ${c.ink}; font-weight: 500;">3.</span> Close it. Tomorrow morning you'll have a full picture of your operations, not just one channel.</p>
      </td>
    </tr>`,
    waitlistBodySectionRowHtml(
      [
        `<p style="margin: 0 0 14px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><strong style="font-weight: 600; color: ${c.ink};">What you'll see tomorrow:</strong> Your messages grouped by what needs your attention. Threads your brain would have flagged but might have missed. A view of today that doesn't start with scrolling.</p>`,
        `<p style="margin: 0; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">You don't need to reorganize your workflow. You don't need to change how you work. You just need to let Salt see every tool you use.</p>`,
      ].join(""),
      "16px 32px 8px"
    ),
    `<tr>
      <td style="padding: 8px 32px 0; background-color: ${c.card};">
        ${waitlistPrimaryCtaHtml(appUrl, "Connect your first tool in 3 minutes →", c)}
      </td>
    </tr>`,
  ].join("");

  const text = `${WAITLIST_SEQUENCE_06_PREVIEW}

You're on the list. Your access is open. And maybe you haven't plugged anything in yet.

That's fine. Salt isn't going anywhere.

But the more tools you connect on day one, the more Salt surfaces tomorrow morning.

Three steps:
1. Open your account.
2. Connect every tool you use.
3. Close it. Tomorrow morning you'll have a full picture.

Connect your first tool in 3 minutes → ${appUrl}

Start there. Connect everything. Tomorrow morning will feel different.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_06_SUBJECT,
    previewText: WAITLIST_SEQUENCE_06_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "Early access",
    headline: WAITLIST_SEQUENCE_06_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_06_HERO.subtitle,
    sectionsHtml,
    closingParagraphs: [
      "Start there. Connect everything. Tomorrow morning will feel different.",
    ],
    text,
  });
}

// ─── Email 7 — Early adopter celebration ──────────────────────────────────

export const WAITLIST_SEQUENCE_07_SUBJECT = "You're shaping what Salt becomes";
export const WAITLIST_SEQUENCE_07_PREVIEW =
  "Early access has a voice. What are you seeing?";

export const WAITLIST_SEQUENCE_07_HERO = {
  headline: "You're shaping Salt",
  subtitle: "Two weeks in — your feedback is the roadmap.",
} as const;

export function buildWaitlistSequence07Email(options?: {
  siteUrl?: string;
  replyToEmail?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const replyTo = options?.replyToEmail ?? "hello@usesalt.io";
  const c = MARKETING_EMAIL_COLORS;
  const footer = waitlistFooterLinksText(siteUrl);

  const text = `${WAITLIST_SEQUENCE_07_PREVIEW}

You've been using Salt for two weeks. By now, you've had a few mornings where you opened your laptop and the day felt different.

Maybe you noticed a thread you would have dropped. Maybe you spent the first 15 minutes on actual work instead of triage. Maybe you closed your laptop one evening and realized you hadn't thought about email for three hours.

That's the product working. But it's also you teaching it.

Salt learns from how you respond, what you approve, what you defer. Every decision you make trains the system to understand your priorities better.

What we need from you: Tell us what you're seeing. What surprised you? What's missing? Reply to this email. We read every response.

Your launch pricing is locked in. When Salt opens more broadly, your price doesn't change.

Keep using it. Keep telling us what works. The product gets better because you do.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_07_SUBJECT,
    previewText: WAITLIST_SEQUENCE_07_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "Early access",
    headline: WAITLIST_SEQUENCE_07_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_07_HERO.subtitle,
    introParagraphs: [
      "You've been using Salt for two weeks. By now, you've had a few mornings where you opened your laptop and the day felt different.",
      "Maybe you noticed a thread you would have dropped. Maybe you spent the first 15 minutes on actual work instead of triage. Maybe you closed your laptop one evening and realized you hadn't thought about email for three hours.",
    ],
    sectionsHtml: waitlistBodySectionRowHtml(
      [
        paragraphBlock([
          "That's the product working. But it's also you teaching it.",
          "Salt learns from how you respond, what you approve, what you defer. Every decision you make trains the system to understand your priorities better. In month two, it's more useful than it was in week one. In month three, it feels like it was built for you, because it was.",
        ]),
        `<p style="margin: 0 0 14px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><strong style="font-weight: 600; color: ${c.ink};">What we need from you:</strong> Tell us what you're seeing. What surprised you? What's missing? What did you expect to hate but didn't?</p>`,
        `<p style="margin: 0 0 14px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><a href="mailto:${replyTo}" style="color: ${c.link}; text-decoration: underline;">Reply to this email</a>. We read every response. You're not one of a thousand users. You're one of a small group that decides what this product looks like at launch.</p>`,
        `<p style="margin: 0; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><strong style="font-weight: 600; color: ${c.ink};">Your launch pricing is locked in.</strong> Whatever rate you started at stays with you. When Salt opens more broadly, your price doesn't change. That's the early adopter advantage.</p>`,
      ].join(""),
      "24px 32px 8px"
    ),
    closingParagraphs: [
      "Keep using it. Keep telling us what works. The product gets better because you do.",
    ],
    text,
  });
}

// ─── Stay-warm — Still in line ───────────────────────────────────────────────

export const WAITLIST_SEQUENCE_STAY_WARM_SUBJECT =
  "You're still on the list. Here's what's next.";
export const WAITLIST_SEQUENCE_STAY_WARM_PREVIEW =
  "More access opening soon. You'll be first.";

export const WAITLIST_SEQUENCE_STAY_WARM_HERO = {
  headline: "Still with us",
  subtitle: "The next wave is coming. You're first in line.",
} as const;

export function buildWaitlistSequenceStayWarmEmail(options?: {
  siteUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const c = MARKETING_EMAIL_COLORS;
  const footer = waitlistFooterLinksText(siteUrl);

  const steps = [
    {
      phase: "What's happening behind the scenes",
      body: "Early access members are connecting their tools, seeing their first briefings, and telling us what works and what doesn't. Every piece of feedback makes the product better for them, and for you when your turn comes.",
    },
    {
      phase: "Your pricing is still locked",
      body: "The first 200 get launch pricing. You signed up early enough.",
    },
    {
      phase: "What to do",
      body: "Nothing. Keep running your business. We'll email you when the next wave opens. No guesswork, no checking the site.",
    },
  ];

  const stepsHtml = steps
    .map((item, index) =>
      waitlistTimelineItemHtml(item.phase, item.body, c, index === steps.length - 1)
    )
    .join("");

  const text = `${WAITLIST_SEQUENCE_STAY_WARM_PREVIEW}

You signed up for the Salt waitlist. You didn't get into the first wave yet. And you might be wondering: is my spot still there?

It is.

You're first in line for the next round. We're opening more access soon, and you'll get the email before anyone else.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_STAY_WARM_SUBJECT,
    previewText: WAITLIST_SEQUENCE_STAY_WARM_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "Waitlist",
    headline: WAITLIST_SEQUENCE_STAY_WARM_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_STAY_WARM_HERO.subtitle,
    pill: { text: "Your spot is confirmed" },
    introParagraphs: [
      "You signed up for the Salt waitlist. You didn't get into the first wave yet. And you might be wondering: is my spot still there?",
      "It is.",
      "You're first in line for the next round. We're opening more access soon, and you'll get the email before anyone else.",
    ],
    sectionsHtml: `<tr>
      <td style="padding: 8px 32px 8px; background-color: ${c.card};">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
          ${stepsHtml}
        </table>
      </td>
    </tr>`,
    closingParagraphs: [],
    text,
  });
}

// ─── Email 8 — Public launch ──────────────────────────────────────────────

export const WAITLIST_SEQUENCE_08_SUBJECT = "We're live. Your pricing is locked.";
export const WAITLIST_SEQUENCE_08_PREVIEW =
  "Here's what we built because of you.";

export const WAITLIST_SEQUENCE_08_HERO = {
  headline: "We're live.",
  subtitle: "You were early. Your pricing stays locked.",
} as const;

export function buildWaitlistSequence08Email(options?: {
  siteUrl?: string;
  appUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const appUrl = options?.appUrl ?? resolveAppUrl();
  const c = MARKETING_EMAIL_COLORS;
  const footer = waitlistFooterLinksText(siteUrl);

  const shipped = [
    "Faster briefing delivery in the morning (you told us 7:00 AM wasn't early enough).",
    "Better thread prioritization for repeat clients (you told us some threads looked urgent but weren't).",
    "A cleaner decision queue (you told us the first version had too many categories).",
  ];

  const shippedHtml = shipped
    .map(
      (item) =>
        `<p style="margin: 0 0 10px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">· ${item}</p>`
    )
    .join("");

  const sectionsHtml = [
    waitlistBodySectionRowHtml(
      paragraphBlock([
        "Today Salt opens to everyone.",
        "And because you were here first, a few things are true that won't be true for anyone who signs up today.",
      ])
    ),
    `<tr>
      <td style="padding: 8px 32px 8px; background-color: ${c.card};">
        ${waitlistSectionHeadingHtml("Because you were early", c)}
        <p style="margin: 0 0 14px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><strong style="font-weight: 600; color: ${c.ink};">Your pricing is locked.</strong> The rate you started with is permanent. When new customers join today, they pay standard pricing. You don't.</p>
        <p style="margin: 0 0 14px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};"><strong style="font-weight: 600; color: ${c.ink};">You helped build this.</strong> The feedback you sent, the threads you flagged, the things you told us were broken and the things you told us worked. We shipped changes because of you.</p>
      </td>
    </tr>`,
    `<tr>
      <td style="padding: 8px 32px 8px; background-color: ${c.card};">
        ${waitlistSectionHeadingHtml("Here's what we built because of you", c)}
        ${shippedHtml}
        <p style="margin: 14px 0 0; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">Every one of those changes came from someone on this list.</p>
      </td>
    </tr>`,
    waitlistBodySectionRowHtml(
      paragraphBlock([
        "Salt is live. Anyone can sign up. But you're not anyone. You're the group that made this product what it is on day one.",
        "If you know someone who needs a morning that starts with decisions instead of chaos, send them your link. Early adopters get a referral credit.",
      ]),
      "16px 32px 8px"
    ),
    `<tr>
      <td style="padding: 8px 32px 0; background-color: ${c.card};">
        ${waitlistPrimaryCtaHtml(appUrl, "Continue using Salt →", c)}
      </td>
    </tr>`,
  ].join("");

  const text = `${WAITLIST_SEQUENCE_08_PREVIEW}

Today Salt opens to everyone.

Your pricing is locked. The rate you started with is permanent.

You helped build this. We shipped changes because of you.

Continue using Salt → ${appUrl}

Otherwise, keep doing what you're doing. That morning is here. It belongs to you.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildSequenceEmail({
    subject: WAITLIST_SEQUENCE_08_SUBJECT,
    previewText: WAITLIST_SEQUENCE_08_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "Launch day",
    headline: WAITLIST_SEQUENCE_08_HERO.headline,
    heroSubtitle: WAITLIST_SEQUENCE_08_HERO.subtitle,
    sectionsHtml,
    closingParagraphs: [
      "Otherwise, keep doing what you're doing. That morning is here. It belongs to you.",
    ],
    text,
  });
}

// ─── Registry (previews + future scheduler) ───────────────────────────────
// Emails 5+ are preview-only until WAITLIST_NURTURE_POST_EMAIL_4_ENABLED=true
// and they are added to WAITLIST_SIGNUP_RELATIVE_SCHEDULE (or a separate flow).

export type WaitlistSequenceEntry = {
  meta: WaitlistSequenceEmailMeta;
  build: (options?: { siteUrl?: string; logoCid?: string }) => WaitlistEmailDocument;
};

export const WAITLIST_SEQUENCE_EMAILS: Record<
  WaitlistSequenceSlug,
  WaitlistSequenceEntry
> = {
  "02-invisible-load": {
    meta: {
      slug: "02-invisible-load",
      label: "Email 2 · The invisible load",
      trigger: "3–4 days after signup",
      subject: WAITLIST_SEQUENCE_02_SUBJECT,
      previewText: WAITLIST_SEQUENCE_02_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_02_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_02_HERO.subtitle,
    },
    build: buildWaitlistSequence02Email,
  },
  "03-morning-waiting": {
    meta: {
      slug: "03-morning-waiting",
      label: "Email 3 · The morning that's waiting",
      trigger: "7–8 days after signup",
      subject: WAITLIST_SEQUENCE_03_SUBJECT,
      previewText: WAITLIST_SEQUENCE_03_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_03_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_03_HERO.subtitle,
    },
    build: buildWaitlistSequence03Email,
  },
  "04-money-on-table": {
    meta: {
      slug: "04-money-on-table",
      label: "Email 4 · Money on the table",
      trigger: "10 days after signup",
      subject: WAITLIST_SEQUENCE_04_SUBJECT,
      previewText: WAITLIST_SEQUENCE_04_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_04_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_04_HERO.subtitle,
    },
    build: buildWaitlistSequence04Email,
  },
  "05a-access-granted": {
    meta: {
      slug: "05a-access-granted",
      label: "Email 5A · Access granted",
      trigger: "When access is granted · early access",
      subject: WAITLIST_SEQUENCE_05A_SUBJECT,
      previewText: WAITLIST_SEQUENCE_05A_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_05A_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_05A_HERO.subtitle,
    },
    build: buildWaitlistSequence05aEmail,
  },
  "05b-still-in-line": {
    meta: {
      slug: "05b-still-in-line",
      label: "Email 5B · Still in line",
      trigger: "When access opens · waitlist not in first wave",
      subject: WAITLIST_SEQUENCE_05B_SUBJECT,
      previewText: WAITLIST_SEQUENCE_05B_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_05B_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_05B_HERO.subtitle,
    },
    build: buildWaitlistSequence05bEmail,
  },
  "06-activation": {
    meta: {
      slug: "06-activation",
      label: "Email 6 · Activation follow-up",
      trigger: "48h after access, no tools connected",
      subject: WAITLIST_SEQUENCE_06_SUBJECT,
      previewText: WAITLIST_SEQUENCE_06_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_06_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_06_HERO.subtitle,
    },
    build: buildWaitlistSequence06Email,
  },
  "07-early-adopter": {
    meta: {
      slug: "07-early-adopter",
      label: "Email 7 · Early adopter celebration",
      trigger: "2 weeks after access · active users",
      subject: WAITLIST_SEQUENCE_07_SUBJECT,
      previewText: WAITLIST_SEQUENCE_07_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_07_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_07_HERO.subtitle,
    },
    build: buildWaitlistSequence07Email,
  },
  "stay-warm": {
    meta: {
      slug: "stay-warm",
      label: "Stay-warm · Still in line",
      trigger: "While waiting · non-selected waitlist",
      subject: WAITLIST_SEQUENCE_STAY_WARM_SUBJECT,
      previewText: WAITLIST_SEQUENCE_STAY_WARM_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_STAY_WARM_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_STAY_WARM_HERO.subtitle,
    },
    build: buildWaitlistSequenceStayWarmEmail,
  },
  "08-public-launch": {
    meta: {
      slug: "08-public-launch",
      label: "Email 8 · Public launch",
      trigger: "Public launch · entire list",
      subject: WAITLIST_SEQUENCE_08_SUBJECT,
      previewText: WAITLIST_SEQUENCE_08_PREVIEW,
      heroHeadline: WAITLIST_SEQUENCE_08_HERO.headline,
      heroSubtitle: WAITLIST_SEQUENCE_08_HERO.subtitle,
    },
    build: buildWaitlistSequence08Email,
  },
};

export const WAITLIST_SEQUENCE_SLUGS = Object.keys(
  WAITLIST_SEQUENCE_EMAILS
) as WaitlistSequenceSlug[];

export function buildWaitlistSequenceEmail(
  slug: WaitlistSequenceSlug,
  options?: { siteUrl?: string; logoCid?: string }
): WaitlistEmailDocument {
  return WAITLIST_SEQUENCE_EMAILS[slug].build(options);
}

export function isWaitlistSequenceSlug(
  value: string
): value is WaitlistSequenceSlug {
  return value in WAITLIST_SEQUENCE_EMAILS;
}
