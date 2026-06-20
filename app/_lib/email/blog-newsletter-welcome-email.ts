/**
 * Blog newsletter welcome — first email after sidebar subscribe on /blog/*.
 * Send on first subscribe only (not resubscribe).
 */

import { getBlogArticleHref } from "@/app/_features/marketing/blog/blog-paths";
import { MARKETING_EMAIL_COLORS } from "@/app/_lib/email/marketing-email-brand";
import {
  WAITLIST_EMAIL_SIGN_OFF_TEXT,
  type WaitlistEmailDocument,
  buildMarketingSequenceEmail,
  marketingEmailParagraphBlock,
  resolveWaitlistSiteUrl,
  waitlistBodySectionRowHtml,
  waitlistFooterLinksText,
  waitlistPrimaryCtaHtml,
  waitlistSectionHeadingHtml,
  waitlistTimelineItemHtml,
} from "@/app/_lib/email/waitlist-email-layout";

export const BLOG_NEWSLETTER_WELCOME_SUBJECT =
  "Welcome — plus one thing worth two minutes";

export const BLOG_NEWSLETTER_WELCOME_PREVIEW =
  "Who we are, what we send, and a quick quiz most solo operators skip.";

export const BLOG_NEWSLETTER_WELCOME_HERO = {
  headline: "You're in.",
  subtitle: "Practical advice for running your business — not just doing the work.",
} as const;

const CURATED_READS = [
  {
    slug: "what-is-proactive-ai",
    title: "What Is Proactive AI?",
    hook: "The category primer — proactive vs. reactive, in plain language.",
  },
  {
    slug: "how-to-price-your-projects",
    title: "How to Price Your Projects for What They're Worth",
    hook: "Stop quoting hours. Start quoting outcomes.",
  },
  {
    slug: "salt-reads-your-business",
    title: "Salt Reads Your Business. Here's What It Finds.",
    hook: "What a proactive layer watches when your tools are connected.",
  },
] as const;

function curatedReadsSectionHtml(siteUrl: string): string {
  const c = MARKETING_EMAIL_COLORS;
  const timelineHtml = CURATED_READS.map((read, index) => {
    const url = `${siteUrl}${getBlogArticleHref(read.slug)}`;
    const phase = `<a href="${url}" style="color: ${c.ink}; font-weight: 500; text-decoration: underline;">${read.title}</a>`;

    return waitlistTimelineItemHtml(
      phase,
      read.hook,
      c,
      index === CURATED_READS.length - 1
    );
  }).join("");

  return `<tr>
    <td style="padding: 24px 32px 8px; background-color: ${c.card};">
      ${waitlistSectionHeadingHtml("Start here", c)}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
        ${timelineHtml}
      </table>
    </td>
  </tr>`;
}

function curatedReadsText(siteUrl: string): string {
  return CURATED_READS.map(
    (read) =>
      `${read.title}\n${read.hook}\n${siteUrl}${getBlogArticleHref(read.slug)}`
  ).join("\n\n");
}

export function buildBlogNewsletterWelcomeEmail(options?: {
  siteUrl?: string;
  logoCid?: string;
}): WaitlistEmailDocument {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const quizUrl = `${siteUrl}/money-on-the-table?source=blog-newsletter-welcome`;
  const c = MARKETING_EMAIL_COLORS;
  const footer = waitlistFooterLinksText(siteUrl);

  const quizSectionHtml = waitlistBodySectionRowHtml(
    [
      waitlistSectionHeadingHtml("One thing worth two minutes", c),
      marketingEmailParagraphBlock([
        "Most one-person businesses lose money in quiet places: inquiries that go cold before anyone replies, proposals that never get a follow-up, admin hours that could run themselves. None of it shows up on an invoice. That's why it's easy to miss.",
        "There's a short quiz that shows you the size of those leaks for a business like yours. Seven questions. No spreadsheet. You answer, and it maps where the number is coming from.",
      ]),
      waitlistPrimaryCtaHtml(quizUrl, "Take the Money on the Table quiz →", c),
      `<p style="margin: 0; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">It's an estimate, not your books. But for most people it's the first time the cost of "I'll get to it later" has an actual number on it.</p>`,
    ].join(""),
    "24px 32px 8px"
  );

  const text = `${BLOG_NEWSLETTER_WELCOME_PREVIEW}

You're subscribed.

Matt & Gabi here. We built Salt because running a service business shouldn't mean spending half the week on operations nobody sees — chasing threads, rebuilding context, wondering what slipped.

This newsletter is for independent professionals in that spot: pricing, client dynamics, scope, proactive AI, and product updates when they're worth your time. No hype. No fake urgency.

ONE THING WORTH TWO MINUTES

Most one-person businesses lose money in quiet places: inquiries that go cold before anyone replies, proposals that never get a follow-up, admin hours that could run themselves. None of it shows up on an invoice. That's why it's easy to miss.

There's a short quiz that shows you the size of those leaks for a business like yours. Seven questions. No spreadsheet. You answer, and it maps where the number is coming from.

Take the Money on the Table quiz → ${quizUrl}

It's an estimate, not your books. But for most people it's the first time the cost of "I'll get to it later" has an actual number on it.

START HERE

${curatedReadsText(siteUrl)}

We'll email when we publish something worth your time. Until then, the quiz and the reads above are a good place to start.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${footer}`;

  return buildMarketingSequenceEmail({
    subject: BLOG_NEWSLETTER_WELCOME_SUBJECT,
    previewText: BLOG_NEWSLETTER_WELCOME_PREVIEW,
    siteUrl,
    logoCid: options?.logoCid,
    badge: "Salt Blog",
    headline: BLOG_NEWSLETTER_WELCOME_HERO.headline,
    heroSubtitle: BLOG_NEWSLETTER_WELCOME_HERO.subtitle,
    pill: { text: "You're subscribed" },
    introParagraphs: [
      "Matt & Gabi here. We built Salt because running a service business shouldn't mean spending half the week on operations nobody sees — chasing threads, rebuilding context, wondering what slipped.",
      "This newsletter is for independent professionals in that spot: pricing, client dynamics, scope, proactive AI, and product updates when they're worth your time. No hype. No fake urgency.",
    ],
    sectionsHtml: [quizSectionHtml, curatedReadsSectionHtml(siteUrl)].join(""),
    closingParagraphs: [
      "We'll email when we publish something worth your time. Until then, the quiz and the reads above are a good place to start.",
    ],
    text,
  });
}
