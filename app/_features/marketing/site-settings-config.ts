import type { SanityLink, SiteSettings, SiteSettingsSocial } from "@/app/_lib/sanity/types";
import { normalizeFooterExploreLinks } from "./footer-explore-links";
import { normalizeMoneyOnTheTableLink } from "./money-on-the-table-links";
import {
  COPYRIGHT_HOLDER_FALLBACK,
  FOOTER_EXPLORE_LINKS_FALLBACK,
  FOOTER_LEGAL_LINKS_FALLBACK,
  FOOTER_TAGLINE_FALLBACK,
  LLM_INFO_EYEBROW_FALLBACK,
  LLM_INFO_LINK_FALLBACK,
  NAV_CTA_FALLBACK,
  SITE_SOCIAL_FALLBACK,
  SUPPORT_EMAIL_FALLBACK,
} from "./site-settings-fallback";

export type ResolvedSocialLink = {
  label: string;
  href: string;
  platform: keyof SiteSettingsSocial;
};

export type ResolvedSiteSettings = {
  ctaButton: SanityLink;
  footerTagline: string;
  footerExploreLinks: SanityLink[];
  footerLegalLinks: SanityLink[];
  supportEmail: string;
  llmInfoEyebrow: string;
  llmInfoLink: SanityLink;
  copyrightHolder: string;
  socialLinks: ResolvedSocialLink[];
};

const SOCIAL_PLATFORMS: Array<{
  key: keyof SiteSettingsSocial;
  label: string;
}> = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "reddit", label: "Reddit" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X" },
  { key: "youtube", label: "YouTube" },
];

function resolveLink(link: SanityLink | undefined, fallback: SanityLink): SanityLink {
  if (link?.text?.trim() && link.href?.trim()) {
    return {
      text: link.text.trim(),
      linkType: link.linkType ?? "internal",
      href: link.href.trim(),
      openInNewTab: link.openInNewTab,
    };
  }
  return fallback;
}

function resolveLinks(
  links: SanityLink[] | undefined,
  fallback: SanityLink[]
): SanityLink[] {
  const resolved =
    links
      ?.filter((link) => link.text?.trim() && link.href?.trim())
      .map((link) =>
        normalizeMoneyOnTheTableLink({
          text: link.text.trim(),
          linkType: link.linkType ?? "internal",
          href: link.href.trim(),
          openInNewTab: link.openInNewTab,
        })
      ) ?? [];

  const normalizedFallback = fallback.map(normalizeMoneyOnTheTableLink);

  return resolved.length > 0 ? resolved : normalizedFallback;
}

function resolveExploreLinks(
  links: SanityLink[] | undefined,
  fallback: SanityLink[]
): SanityLink[] {
  return normalizeFooterExploreLinks(resolveLinks(links, fallback));
}

function ensureRequiredLegalLinks(links: SanityLink[]): SanityLink[] {
  const seenHrefs = new Set(links.map((link) => link.href));
  const missingRequiredLinks = FOOTER_LEGAL_LINKS_FALLBACK.filter(
    (link) => !seenHrefs.has(link.href)
  );

  return [...links, ...missingRequiredLinks];
}

function resolveSocialLinks(social?: SiteSettingsSocial | null): ResolvedSocialLink[] {
  const merged: SiteSettingsSocial = {
    ...SITE_SOCIAL_FALLBACK,
    ...social,
  };

  return SOCIAL_PLATFORMS.flatMap(({ key, label }) => {
    const href = merged[key]?.trim();
    if (!href) return [];
    return [{ label, href, platform: key }];
  });
}

export function resolveSiteSettings(
  settings?: SiteSettings | null
): ResolvedSiteSettings {
  return {
    ctaButton: resolveLink(settings?.ctaButton, NAV_CTA_FALLBACK),
    footerTagline: settings?.description?.trim() || FOOTER_TAGLINE_FALLBACK,
    footerExploreLinks: resolveExploreLinks(
      settings?.footerNavigation,
      FOOTER_EXPLORE_LINKS_FALLBACK
    ),
    footerLegalLinks: ensureRequiredLegalLinks(
      resolveLinks(settings?.legalNavigation, FOOTER_LEGAL_LINKS_FALLBACK)
    ),
    supportEmail: settings?.supportEmail?.trim() || SUPPORT_EMAIL_FALLBACK,
    llmInfoEyebrow:
      settings?.llmInfoEyebrow?.trim() || LLM_INFO_EYEBROW_FALLBACK,
    llmInfoLink: resolveLink(settings?.llmInfoLink, LLM_INFO_LINK_FALLBACK),
    copyrightHolder:
      settings?.copyrightHolder?.trim() || COPYRIGHT_HOLDER_FALLBACK,
    socialLinks: resolveSocialLinks(settings?.social),
  };
}

export function isHashLink(href: string): boolean {
  return href.startsWith("#");
}

export function linkOpensInNewTab(link: SanityLink): boolean {
  return link.linkType === "external" || link.openInNewTab === true;
}
