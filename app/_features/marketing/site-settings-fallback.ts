import type { SanityLink, SiteSettingsSocial } from "@/app/_lib/sanity/types";
import { SALT_SOCIAL } from "@/app/_lib/seo/social-links";

export const SITE_SETTINGS_DOC_ID = "site-settings-en";

export const NAV_CTA_FALLBACK: SanityLink = {
  text: "Join the waitlist",
  linkType: "internal",
  href: "/waitlist?source=homepage-nav",
};

export const FOOTER_TAGLINE_FALLBACK =
  "Proactive AI for your business — connects your tools, surfaces what matters, waits for your approval.";

export const FOOTER_EXPLORE_LINKS_FALLBACK: SanityLink[] = [
  { text: "Blog", linkType: "internal", href: "/blog" },
  { text: "Features", linkType: "internal", href: "#product" },
  { text: "Compare", linkType: "internal", href: "/compare" },
  {
    text: "Early access",
    linkType: "internal",
    href: "/waitlist?source=homepage-footer",
  },
  {
    text: "Money On The Table Quiz",
    linkType: "internal",
    href: "/money-on-the-table",
  },
];

/** Footer explore links hidden until the surface is ready to ship. */
export const FOOTER_HIDDEN_EXPLORE_HREFS = new Set(["/learn"]);

export const FOOTER_LEGAL_LINKS_FALLBACK: SanityLink[] = [
  { text: "Privacy", linkType: "internal", href: "/privacy-policy" },
  { text: "Terms", linkType: "internal", href: "/terms-of-use" },
  { text: "Early Access Terms", linkType: "internal", href: "/early-access" },
  { text: "Cookies", linkType: "internal", href: "/cookie-policy" },
];

export const SUPPORT_EMAIL_FALLBACK = "support@usesalt.io";

export const LLM_INFO_EYEBROW_FALLBACK = "Hey AI";

export const LLM_INFO_LINK_FALLBACK: SanityLink = {
  text: "Learn about us",
  linkType: "internal",
  href: "/llm-info",
};

export const COPYRIGHT_HOLDER_FALLBACK = "Simcoe House Inc.";

export const SITE_SOCIAL_FALLBACK: SiteSettingsSocial = {
  twitter: SALT_SOCIAL.x,
  linkedin: SALT_SOCIAL.linkedin,
  instagram: SALT_SOCIAL.instagram,
  reddit: SALT_SOCIAL.reddit,
  youtube: SALT_SOCIAL.youtube,
  github: SALT_SOCIAL.github,
};
