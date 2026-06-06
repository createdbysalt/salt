/**
 * Waitlist confirmation email — light editorial layout aligned with landing2 aurora.
 */

import {
  MARKETING_AURORA_GRADIENT,
  MARKETING_EMAIL_COLORS,
  MARKETING_EMAIL_FONTS,
  saltWordmarkImgHtml,
} from "@/app/_lib/email/marketing-email-brand";

export const WAITLIST_CONFIRMATION_SUBJECT =
  "You're on the list. Here's what happens next.";

export const WAITLIST_CONFIRMATION_PREVIEW =
  "Early access opens July 1. Here's your timeline.";

function resolveSiteUrl(siteUrl?: string): string {
  const base =
    siteUrl?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://usesalt.io";
  return base;
}

export type WaitlistConfirmationEmail = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

type TimelineItem = {
  phase: string;
  body: string;
};

function renderTimelineItem(
  item: TimelineItem,
  colors: typeof MARKETING_EMAIL_COLORS,
  isLast: boolean
): string {
  const { border, ink, mutedLight } = colors;
  const divider = isLast
    ? ""
    : `border-bottom: 1px solid ${border}; padding-bottom: 18px; margin-bottom: 18px;`;

  return `
    <tr>
      <td style="${divider}">
        <p style="margin: 0; font-family: ${MARKETING_EMAIL_FONTS.body}; font-size: 15px; line-height: 24px; color: ${mutedLight};">
          <span style="color: ${ink}; font-weight: 500;">${item.phase}</span> — ${item.body}
        </p>
      </td>
    </tr>`;
}

export function buildWaitlistConfirmationEmail(options?: {
  siteUrl?: string;
}): WaitlistConfirmationEmail {
  const siteUrl = resolveSiteUrl(options?.siteUrl);
  const year = new Date().getFullYear();
  const c = MARKETING_EMAIL_COLORS;
  const heroLogo = saltWordmarkImgHtml(siteUrl, { variant: "white", width: 96 });

  const timelineItems: TimelineItem[] = [
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
      renderTimelineItem(item, c, index === timelineItems.length - 1)
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${WAITLIST_CONFIRMATION_SUBJECT}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${c.cream}; font-family: ${MARKETING_EMAIL_FONTS.body}; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${WAITLIST_CONFIRMATION_PREVIEW}</div>
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${c.cream}; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 28px 16px 40px;">

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; border-collapse: separate; border-spacing: 0; border-radius: 24px; overflow: hidden; box-shadow: 0 1px 2px rgba(26,26,26,0.05), 0 20px 48px -24px rgba(26,26,26,0.2);">

          <!-- Hero -->
          <tr>
            <td style="padding: 36px 32px 40px; text-align: center; background: ${MARKETING_AURORA_GRADIENT}; background-color: ${c.auroraMid};">
              <div style="margin: 0 auto 28px; width: 96px;">${heroLogo}</div>

              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 8px;">
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 999px; background-color: rgba(255,255,255,0.92);"></span>
                  </td>
                  <td style="font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.9);">Early access</td>
                </tr>
              </table>

              <h1 style="margin: 0; font-family: ${MARKETING_EMAIL_FONTS.display}; color: #ffffff; font-size: 34px; font-weight: 400; letter-spacing: -0.04em; line-height: 1.08;">You're on the list.</h1>

              <p style="margin: 14px auto 0; max-width: 340px; font-size: 15px; line-height: 24px; color: rgba(255,255,255,0.9); font-weight: 400;">
                Early access opens July 1. Here's your timeline.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 22px auto 0; border-collapse: separate; border-spacing: 0;">
                <tr>
                  <td style="border-radius: 999px; background-color: #ffffff; padding: 12px 22px; box-shadow: 0 2px 8px rgba(26,26,26,0.12);">
                    <span style="font-size: 13px; font-weight: 600; letter-spacing: -0.01em; color: ${c.ink};">Your spot is confirmed</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 32px 32px 8px; background-color: ${c.card}; text-align: left;">
              <p style="margin: 0 0 14px; font-size: 16px; line-height: 26px; color: ${c.mutedLight};">
                You just did the thing that makes every system better: you raised your hand.
              </p>
              <p style="margin: 0; font-size: 16px; line-height: 26px; color: ${c.mutedLight};">
                You're on the Salt waitlist — one of the first people to see what your day looks like when operations stop eating your morning.
              </p>
            </td>
          </tr>

          <!-- Timeline -->
          <tr>
            <td style="padding: 24px 32px 8px; background-color: ${c.card};">
              <h2 style="margin: 0 0 20px; font-family: ${MARKETING_EMAIL_FONTS.display}; font-size: 24px; font-weight: 400; letter-spacing: -0.03em; line-height: 1.2; color: ${c.ink};">What happens next</h2>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                ${timelineHtml}
              </table>
            </td>
          </tr>

          <!-- Highlight -->
          <tr>
            <td style="padding: 8px 32px 0; background-color: ${c.card};">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; border-spacing: 0; background-color: ${c.sand}; border: 1px solid ${c.border}; border-left: 3px solid ${c.auroraMid}; border-radius: 14px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <p style="margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: ${c.muted};">Worth knowing now</p>
                    <p style="margin: 0; font-size: 15px; line-height: 24px; color: ${c.ink};">
                      Salt takes about <strong style="font-weight: 600;">10 minutes</strong> to set up. It connects to the tools you already use — no new workflows. Just a morning that starts with decisions instead of chaos.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Close -->
          <tr>
            <td style="padding: 24px 32px 28px; background-color: ${c.card};">
              <p style="margin: 0 0 14px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">
                Between now and then, you'll get a few emails from us. Each one shows what's possible — not a sales pitch. Read them if they're useful. Skip them if they're not. Your place is held either way.
              </p>
              <p style="margin: 0 0 4px; font-family: ${MARKETING_EMAIL_FONTS.display}; font-size: 20px; line-height: 1.3; letter-spacing: -0.02em; color: ${c.ink}; font-weight: 500;">That Tuesday is coming.</p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 24px; color: ${c.mutedLight};">See you on July 1.</p>
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: ${c.muted};">— The Salt team</p>
            </td>
          </tr>

          <tr>
            <td style="height: 3px; background: ${MARKETING_AURORA_GRADIENT}; background-color: ${c.auroraMid}; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding: 20px 32px 24px; background-color: ${c.card}; text-align: center;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: ${c.muted};">
                <a href="https://usesalt.io/privacy-policy" style="color: ${c.muted}; text-decoration: none;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="https://usesalt.io/terms-of-use" style="color: ${c.muted}; text-decoration: none;">Terms</a>
                &nbsp;·&nbsp;
                <a href="https://usesalt.io/early-access" style="color: ${c.muted}; text-decoration: none;">Early access</a>
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; line-height: 18px; color: ${c.mutedLight};">© ${year} Simcoe House Inc.</p>
              <p style="margin: 6px 0 0; font-size: 12px; line-height: 18px;">
                <a href="${siteUrl}" style="color: ${c.link}; text-decoration: underline;">usesalt.io</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${WAITLIST_CONFIRMATION_PREVIEW}

You're on the list. Your spot is confirmed.

You just did the thing that makes every system better: you raised your hand.

You're on the Salt waitlist. That means you're one of the first people to see what your day looks like when your operations aren't eating your morning.

Here's how the next few weeks play out.

Right now — We're building access in waves. Your spot is saved. No action needed from you.

July 1 — The first group gets in. If you're in that wave, you'll get an email with everything you need to connect your tools and start seeing what Salt surfaces.

August — Salt opens to everyone. If you're not in the first wave, you're still first in line.

Between now and then, you'll get a few emails from us. Each one is meant to show you what's possible — not sell you something. Read them if they're useful. Skip them if they're not. Either way, your place is held.

One thing worth knowing now: Salt takes about 10 minutes to set up. It connects to the tools you already use. No new workflows to learn. Just a morning that starts with decisions instead of chaos.

That Tuesday is coming.
See you on July 1.

— The Salt team

https://usesalt.io/privacy-policy · https://usesalt.io/terms-of-use · https://usesalt.io/early-access`;

  return {
    subject: WAITLIST_CONFIRMATION_SUBJECT,
    previewText: WAITLIST_CONFIRMATION_PREVIEW,
    html,
    text,
  };
}

export async function sendWaitlistConfirmationEmail({
  to,
}: {
  to: string;
}): Promise<void> {
  const { sendEmail } = await import("@/app/_lib/email/resend");
  const { subject, html, text } = buildWaitlistConfirmationEmail();

  await sendEmail({
    to,
    subject,
    html,
    text,
  });
}
