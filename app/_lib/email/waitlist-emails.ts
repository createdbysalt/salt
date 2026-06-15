/**
 * Waitlist confirmation email (sequence #1) — Resend.
 */

import {
  WAITLIST_QUAL_STEPS,
} from "@/app/_features/marketing/waitlist-qualification";
import type { WaitlistQualification } from "@/app/_features/marketing/waitlist-lead";
import {
  MARKETING_EMAIL_COLORS,
  MARKETING_EMAIL_FONTS,
  SALT_EMAIL_WORDMARK_CID,
  SALT_EMAIL_WORDMARK_PATHS,
} from "@/app/_lib/email/marketing-email-brand";
import {
  WAITLIST_EMAIL_SIGN_OFF_TEXT,
  buildWaitlistEmailDocument,
  resolveWaitlistSiteUrl,
  waitlistBodyParagraphHtml,
  waitlistBodySectionRowHtml,
  waitlistFooterLinksText,
  waitlistSectionHeadingHtml,
  waitlistSignOffAndCloseRowHtml,
  waitlistTimelineItemHtml,
} from "@/app/_lib/email/waitlist-email-layout";

export const WAITLIST_CONFIRMATION_SUBJECT =
  "You're on the list. Here's what happens next.";

export const WAITLIST_CONFIRMATION_PREVIEW =
  "Early access opens July 1. Here's your timeline.";

export const WAITLIST_CONFIRMATION_HERO_HEADLINE = "You're on the list.";
export const WAITLIST_CONFIRMATION_HERO_SUBTITLE =
  "Your place is held — here's how the next few weeks work.";

export type WaitlistConfirmationEmail = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

export function buildWaitlistConfirmationEmail(options?: {
  siteUrl?: string;
  /** Embed logo via CID inline attachment (production sends). */
  logoCid?: string;
}): WaitlistConfirmationEmail {
  const siteUrl = resolveWaitlistSiteUrl(options?.siteUrl);
  const c = MARKETING_EMAIL_COLORS;

  const timelineItems = [
    {
      phase: "Right now",
      body: "We're building access in waves. Your spot is saved. No action needed from you.",
    },
    {
      phase: "July 1",
      body: "The first group gets in. If you're in that wave, you'll get an email with everything you need to connect your tools and start seeing what Salt surfaces.",
    },
    {
      phase: "August",
      body: "Salt opens to everyone. If you're not in the first wave, you're still first in line.",
    },
  ];

  const timelineHtml = timelineItems
    .map((item, index) =>
      waitlistTimelineItemHtml(
        item.phase,
        item.body,
        c,
        index === timelineItems.length - 1
      )
    )
    .join("");

  const bodyRowsHtml = [
    waitlistBodySectionRowHtml(
      [
        waitlistBodyParagraphHtml(
          "You just did the thing that makes every system better: you raised your hand.",
          c
        ),
        waitlistBodyParagraphHtml(
          "You're on the Salt waitlist. You're one of the first people to see what your day looks like when operations stop eating your morning.",
          c,
          { marginBottom: "0" }
        ),
      ].join("")
    ),
    `<tr>
      <td style="padding: 24px 32px 8px; background-color: ${c.card};">
        ${waitlistSectionHeadingHtml("What happens next", c)}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
          ${timelineHtml}
        </table>
      </td>
    </tr>`,
    waitlistBodySectionRowHtml(
      [
        waitlistSectionHeadingHtml("Worth knowing now", c),
        `<p style="margin: 0; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">
          Salt takes about <strong style="font-weight: 600; color: ${c.ink};">10 minutes</strong> to set up. It connects to the tools you already use. No new workflows. Just a morning that starts with decisions instead of chaos.
        </p>`,
      ].join(""),
      "24px 32px 0"
    ),
    waitlistSignOffAndCloseRowHtml([
      "Between now and then, you'll get a few emails from us. Each one shows what's possible, not a sales pitch. Read them if they're useful. Skip them if they're not. Your place is held either way.",
    ]),
  ].join("");

  const text = `${WAITLIST_CONFIRMATION_PREVIEW}

You're on the list. Your spot is confirmed.

You just did the thing that makes every system better: you raised your hand.

You're on the Salt waitlist. You're one of the first people to see what your day looks like when your operations aren't eating your morning.

Here's how the next few weeks play out.

Right now: We're building access in waves. Your spot is saved. No action needed from you.

July 1: The first group gets in. If you're in that wave, you'll get an email with everything you need to connect your tools and start seeing what Salt surfaces.

August: Salt opens to everyone. If you're not in the first wave, you're still first in line.

Between now and then, you'll get a few emails from us. Each one is meant to show you what's possible, not sell you something. Read them if they're useful. Skip them if they're not. Either way, your place is held.

One thing worth knowing now: Salt takes about 10 minutes to set up. It connects to the tools you already use. No new workflows to learn. Just a morning that starts with decisions instead of chaos.

${WAITLIST_EMAIL_SIGN_OFF_TEXT}

${waitlistFooterLinksText(siteUrl)}`;

  return buildWaitlistEmailDocument({
    subject: WAITLIST_CONFIRMATION_SUBJECT,
    previewText: WAITLIST_CONFIRMATION_PREVIEW,
    siteUrl,
    hero: {
      siteUrl,
      logoCid: options?.logoCid,
      badge: "Early access",
      headline: WAITLIST_CONFIRMATION_HERO_HEADLINE,
      subtitle: WAITLIST_CONFIRMATION_HERO_SUBTITLE,
      pill: { text: "Your spot is confirmed" },
    },
    bodyRowsHtml,
    text,
  });
}

const OPTIONS_BY_QUAL_FIELD = new Map(
  WAITLIST_QUAL_STEPS.map((step) => [
    step.field,
    new Map(step.options?.map((option) => [option.value, option.label]) ?? []),
  ])
);

const TITLE_BY_QUAL_FIELD = new Map(
  WAITLIST_QUAL_STEPS.map((step) => [step.field, step.title])
);

function formatQualificationValue(
  field: string,
  rawValue: string
): string {
  const labels = OPTIONS_BY_QUAL_FIELD.get(field);
  if (!labels) return rawValue;

  const step = WAITLIST_QUAL_STEPS.find((item) => item.field === field);
  if (step?.type === "multi") {
    return rawValue
      .split(",")
      .map((token) => labels.get(token.trim()) ?? token.trim())
      .join(", ");
  }

  return labels.get(rawValue) ?? rawValue;
}

function formatQualificationLines(
  qualification: WaitlistQualification | undefined
): string[] {
  if (!qualification) return [];

  return WAITLIST_QUAL_STEPS.flatMap((step) => {
    const raw = qualification[step.field as keyof WaitlistQualification];
    if (typeof raw !== "string" || !raw.trim()) return [];

    const title = TITLE_BY_QUAL_FIELD.get(step.field) ?? step.field;
    return [`${title}: ${formatQualificationValue(step.field, raw)}`];
  });
}

/** Comma-separated in `WAITLIST_NOTIFY_EMAIL`; falls back to support@usesalt.io. */
export function getWaitlistNotifyRecipients(
  supportEmail = "support@usesalt.io"
): string[] {
  const fromEnv = process.env.WAITLIST_NOTIFY_EMAIL?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  return [supportEmail];
}

export type WaitlistAdminNotificationEmail = {
  subject: string;
  html: string;
  text: string;
};

export function buildWaitlistAdminNotificationEmail(input: {
  email: string;
  source: string;
  qualification?: WaitlistQualification;
  completedAt?: string;
}): WaitlistAdminNotificationEmail {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const qualLines = formatQualificationLines(input.qualification);
  const subject = `New waitlist signup: ${input.email}`;

  const detailLines = [
    `Email: ${input.email}`,
    `Source: ${input.source}`,
    `Completed: ${completedAt}`,
    ...qualLines,
  ];

  const text = ["New waitlist signup", "", ...detailLines].join("\n");

  const htmlRows = detailLines
    .map(
      (line) =>
        `<tr><td style="padding: 6px 0; font-family: ${MARKETING_EMAIL_FONTS.body}; font-size: 14px; line-height: 1.5; color: ${MARKETING_EMAIL_COLORS.ink};">${line}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin: 0; padding: 24px; background-color: #ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; border-collapse: collapse;">
    <tr>
      <td style="padding-bottom: 16px; font-family: ${MARKETING_EMAIL_FONTS.display}; font-size: 20px; color: ${MARKETING_EMAIL_COLORS.ink};">
        New waitlist signup
      </td>
    </tr>
    ${htmlRows}
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export async function sendWaitlistAdminNotificationEmail(input: {
  email: string;
  source: string;
  qualification?: WaitlistQualification;
  completedAt?: string;
}): Promise<void> {
  const { sendEmail } = await import("@/app/_lib/email/resend");
  const config = (await import("@/config")).default;
  const recipients = getWaitlistNotifyRecipients(config.resend.supportEmail);

  if (recipients.length === 0) {
    return;
  }

  const { subject, html, text } = buildWaitlistAdminNotificationEmail(input);

  await sendEmail({
    to: recipients,
    subject,
    html,
    text,
    replyTo: input.email,
  });
}

export async function loadWaitlistWordmarkAttachment(): Promise<
  | {
      inlineContentId: string;
      filename: string;
      content: Buffer;
      contentType: string;
    }
  | undefined
> {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");

  const logoPath = path.join(
    process.cwd(),
    "public",
    SALT_EMAIL_WORDMARK_PATHS.white.replace(/^\//, "")
  );

  try {
    const logoContent = await readFile(logoPath);
    return {
      filename: "salt-logo-email-white.png",
      content: logoContent,
      contentType: "image/png",
      inlineContentId: SALT_EMAIL_WORDMARK_CID,
    };
  } catch (err) {
    console.error("Waitlist wordmark PNG not found, sending without inline logo:", err);
    return undefined;
  }
}

export async function sendWaitlistConfirmationEmail({
  to,
}: {
  to: string;
}): Promise<void> {
  const { sendEmail } = await import("@/app/_lib/email/resend");
  const config = (await import("@/config")).default;
  const inlineLogo = await loadWaitlistWordmarkAttachment();
  const { subject, html, text } = buildWaitlistConfirmationEmail({
    logoCid: inlineLogo?.inlineContentId,
  });

  await sendEmail({
    to,
    subject,
    html,
    text,
    replyTo: config.resend.supportEmail,
    ...(inlineLogo && { attachments: [inlineLogo] }),
  });
}
