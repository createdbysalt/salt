import type { MarketingCta } from "@/app/_lib/sanity/types";

export const HOMEPAGE_WAITLIST_CTA_KEY = "cta-waitlist";

export const HOMEPAGE_WAITLIST_CTA_FALLBACK: MarketingCta = {
  _id: "fallback-homepage-waitlist",
  _type: "marketingCta",
  key: HOMEPAGE_WAITLIST_CTA_KEY,
  eyebrow: "Early access",
  heading: "Join the waitlist. Get in early.",
  subheading: "First 200 customers lock in launch pricing — 2 months free on annual.",
  benefits: [
    "Founder access — direct input into product direction",
    "Launch pricing locked for as long as you're a customer",
  ],
  disclaimer: "No countdown timers. No fake scarcity.",
  footerText:
    "Salt doesn't replace you. It amplifies you. The week you get back is yours.",
  waitlistSource: "homepage-cta",
};
