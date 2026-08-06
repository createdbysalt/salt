/**
 * Shared shell for Salt waitlist / nurture emails (Resend).
 * Matches the confirmation card: aurora hero, white card body, footer links.
 */

import {
  MARKETING_AURORA_GRADIENT,
  MARKETING_EMAIL_COLORS,
  MARKETING_EMAIL_FONTS,
  WAITLIST_EMAIL_SIGN_OFF_TEXT,
  saltWordmarkImgHtml,
  waitlistEmailSignOffHtml,
} from "@/app/_lib/email/marketing-email-brand";

/** Pure white canvas around the card (not cream). */
export const WAITLIST_EMAIL_PAGE_BG = "#ffffff";

export type WaitlistEmailColors = typeof MARKETING_EMAIL_COLORS;

export type WaitlistEmailDocument = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

export type WaitlistHeroConfig = {
  badge: string;
  headline: string;
  subtitle: string;
  pill?: { text: string; href?: string };
  /** Embed logo via CID inline attachment (production sends). */
  logoCid?: string;
  siteUrl: string;
};

export function resolveWaitlistSiteUrl(siteUrl?: string): string {
  return (
    siteUrl?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://usesalt.io"
  );
}

export function waitlistHeroLogoHtml(
  siteUrl: string,
  logoCid?: string
): string {
  return saltWordmarkImgHtml(siteUrl, {
    variant: "white",
    width: 96,
    inlineCid: logoCid,
  });
}

export function waitlistHeroBadgeHtml(label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px; border-collapse: collapse;">
    <tr>
      <td align="center" style="font-size: 0; line-height: 0;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 999px; background-color: rgba(255,255,255,0.92); vertical-align: middle; margin-right: 8px;"></span><!--
        --><span style="display: inline-block; vertical-align: middle; font-size: 10px; line-height: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.9);">${label}</span>
      </td>
    </tr>
  </table>`;
}

export function waitlistHeroPillHtml(
  text: string,
  colors: WaitlistEmailColors,
  href?: string
): string {
  const inner = `<span style="font-size: 13px; font-weight: 600; letter-spacing: -0.01em; color: ${colors.ink};">${text}</span>`;
  const cell = `<td style="border-radius: 999px; background-color: #ffffff; padding: 12px 22px; box-shadow: 0 2px 8px rgba(26,26,26,0.12);">${
    href
      ? `<a href="${href}" style="color: ${colors.ink}; text-decoration: none;">${inner}</a>`
      : inner
  }</td>`;

  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 22px auto 0; border-collapse: separate; border-spacing: 0;">
    <tr>${cell}</tr>
  </table>`;
}

export function waitlistHeroRowHtml(
  hero: WaitlistHeroConfig,
  colors: WaitlistEmailColors
): string {
  const logo = waitlistHeroLogoHtml(hero.siteUrl, hero.logoCid);
  const pill = hero.pill
    ? waitlistHeroPillHtml(hero.pill.text, colors, hero.pill.href)
    : "";

  return `<tr>
    <td style="padding: 36px 32px 40px; text-align: center; background: ${MARKETING_AURORA_GRADIENT}; background-color: ${colors.auroraMid};">
      <div style="margin: 0 auto 28px; width: 96px;">${logo}</div>
      ${waitlistHeroBadgeHtml(hero.badge)}
      <h1 style="margin: 0; font-family: ${MARKETING_EMAIL_FONTS.display}; color: #ffffff; font-size: 34px; font-weight: 400; letter-spacing: -0.04em; line-height: 1.08;">${hero.headline}</h1>
      <p style="margin: 14px auto 0; max-width: 340px; font-size: 15px; line-height: 24px; color: rgba(255,255,255,0.9); font-weight: 400;">${hero.subtitle}</p>
      ${pill}
    </td>
  </tr>`;
}

export function waitlistSectionHeadingHtml(
  title: string,
  colors: WaitlistEmailColors
): string {
  return `<h2 style="margin: 0 0 20px; font-family: ${MARKETING_EMAIL_FONTS.display}; font-size: 24px; font-weight: 400; letter-spacing: -0.03em; line-height: 1.2; color: ${colors.ink};">${title}</h2>`;
}

export function waitlistBodyParagraphHtml(
  text: string,
  colors: WaitlistEmailColors,
  options?: { marginBottom?: string }
): string {
  const margin = options?.marginBottom ?? "14px";
  return `<p style="margin: 0 0 ${margin}; font-size: 16px; line-height: 26px; color: ${colors.mutedLight};">${text}</p>`;
}

export function waitlistBodySectionRowHtml(
  innerHtml: string,
  padding = "32px 32px 8px"
): string {
  return `<tr>
    <td style="padding: ${padding}; background-color: ${MARKETING_EMAIL_COLORS.card}; text-align: left;">
      ${innerHtml}
    </td>
  </tr>`;
}

export function waitlistTimelineItemHtml(
  phase: string,
  body: string,
  colors: WaitlistEmailColors,
  isLast: boolean
): string {
  const spacing = isLast ? "" : "padding-bottom: 14px;";

  return `<tr>
    <td style="${spacing}">
      <p style="margin: 0; font-family: ${MARKETING_EMAIL_FONTS.body}; font-size: 15px; line-height: 24px; color: ${colors.mutedLight};">
        <span style="color: ${colors.ink}; font-weight: 500;">${phase}</span>: ${body}
      </p>
    </td>
  </tr>`;
}

export function waitlistPrimaryCtaHtml(
  href: string,
  label: string,
  colors: WaitlistEmailColors
): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0 8px; border-collapse: separate; border-spacing: 0;">
    <tr>
      <td style="border-radius: 14px; background-color: ${colors.ink};">
        <a href="${href}" style="display: inline-block; padding: 14px 24px; font-family: ${MARKETING_EMAIL_FONTS.body}; font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: #ffffff; text-decoration: none;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function waitlistFooterLinksText(siteUrl: string): string {
  return `https://usesalt.io/privacy-policy · https://usesalt.io/terms-of-service · https://usesalt.io/early-access · ${siteUrl}`;
}

export function waitlistFooterRowHtml(siteUrl: string, year: number): string {
  const c = MARKETING_EMAIL_COLORS;

  return `<tr>
    <td style="height: 3px; background: ${MARKETING_AURORA_GRADIENT}; background-color: ${c.auroraMid}; font-size: 0; line-height: 0;">&nbsp;</td>
  </tr>
  <tr>
    <td style="padding: 20px 32px 24px; background-color: ${c.card}; text-align: center;">
      <p style="margin: 0; font-size: 12px; line-height: 18px; color: ${c.muted};">
        <a href="https://usesalt.io/privacy-policy" style="color: ${c.muted}; text-decoration: none;">Privacy</a>
        &nbsp;·&nbsp;
        <a href="https://usesalt.io/terms-of-service" style="color: ${c.muted}; text-decoration: none;">Terms</a>
        &nbsp;·&nbsp;
        <a href="https://usesalt.io/early-access" style="color: ${c.muted}; text-decoration: none;">Early access</a>
      </p>
      <p style="margin: 10px 0 0; font-size: 12px; line-height: 18px; color: ${c.mutedLight};">© ${year} Simcoe House Inc.</p>
      <p style="margin: 6px 0 0; font-size: 12px; line-height: 18px;">
        <a href="${siteUrl}" style="color: ${c.link}; text-decoration: underline;">usesalt.io</a>
      </p>
    </td>
  </tr>`;
}

export function buildWaitlistEmailDocument(input: {
  subject: string;
  previewText: string;
  siteUrl: string;
  hero: WaitlistHeroConfig;
  bodyRowsHtml: string;
  text: string;
}): WaitlistEmailDocument {
  const c = MARKETING_EMAIL_COLORS;
  const year = new Date().getFullYear();
  const hero = { ...input.hero, siteUrl: input.siteUrl };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${input.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${WAITLIST_EMAIL_PAGE_BG}; font-family: ${MARKETING_EMAIL_FONTS.body}; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${input.previewText}</div>
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${WAITLIST_EMAIL_PAGE_BG}; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 28px 16px 40px;">

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; border-collapse: separate; border-spacing: 0; border-radius: 24px; overflow: hidden; box-shadow: 0 1px 2px rgba(26,26,26,0.05), 0 20px 48px -24px rgba(26,26,26,0.2);">

          ${waitlistHeroRowHtml(hero, c)}

          ${input.bodyRowsHtml}

          ${waitlistFooterRowHtml(input.siteUrl, year)}
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: input.subject,
    previewText: input.previewText,
    html,
    text: input.text,
  };
}

export function marketingEmailParagraphBlock(
  paragraphs: string[],
  colors: WaitlistEmailColors = MARKETING_EMAIL_COLORS
): string {
  return paragraphs
    .map((copy, index) =>
      waitlistBodyParagraphHtml(
        copy,
        colors,
        index === paragraphs.length - 1 ? { marginBottom: "0" } : undefined
      )
    )
    .join("");
}

/** Aurora card layout shared by waitlist nurture + blog newsletter welcome. */
export function buildMarketingSequenceEmail(input: {
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
  const c = MARKETING_EMAIL_COLORS;
  const intro = input.introParagraphs?.length
    ? waitlistBodySectionRowHtml(
        marketingEmailParagraphBlock(input.introParagraphs, c)
      )
    : "";

  const bodyRowsHtml = [
    intro,
    input.sectionsHtml ?? "",
    waitlistSignOffAndCloseRowHtml(input.closingParagraphs, c),
  ].join("");

  return buildWaitlistEmailDocument({
    subject: input.subject,
    previewText: input.previewText,
    siteUrl: input.siteUrl,
    hero: {
      siteUrl: input.siteUrl,
      logoCid: input.logoCid,
      badge: input.badge,
      headline: input.headline,
      subtitle: input.heroSubtitle,
      pill: input.pill,
    },
    bodyRowsHtml,
    text: input.text,
  });
}

export function waitlistSignOffAndCloseRowHtml(
  closingParagraphs: string[],
  colors: WaitlistEmailColors = MARKETING_EMAIL_COLORS
): string {
  const paragraphs = closingParagraphs
    .map(
      (copy) =>
        `<p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: ${colors.mutedLight};">${copy}</p>`
    )
    .join("");

  return `<tr>
    <td style="padding: 24px 32px 28px; background-color: ${colors.card};">
      ${paragraphs}
      ${waitlistEmailSignOffHtml(colors.muted)}
    </td>
  </tr>`;
}

export { WAITLIST_EMAIL_SIGN_OFF_TEXT };
