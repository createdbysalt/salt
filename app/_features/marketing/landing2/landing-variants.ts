import type {
  HomepageContent,
  LandingCapabilityCard,
  MarketingCta,
} from "@/app/_lib/sanity/types";

/**
 * Homepage A/B test — landing copy variants.
 *
 * `control`  = current live copy ("You can clock out, Salt never sleeps").
 * `timeback` = time-led / money-proof copy (get your time back).
 *
 * Assignment happens once per visitor in `middleware.ts` (sticky cookie), and
 * the chosen variant is forwarded to the RSC render via the request header so
 * the first paint already matches the assignment.
 */

export const LP_VARIANT_COOKIE = "lp_variant";
export const LP_VARIANT_HEADER = "x-lp-variant";

export type LandingVariant = "control" | "timeback";

export const LANDING_VARIANTS: readonly LandingVariant[] = [
  "control",
  "timeback",
] as const;

export const DEFAULT_LANDING_VARIANT: LandingVariant = "control";

export function isLandingVariant(value: unknown): value is LandingVariant {
  return value === "control" || value === "timeback";
}

/** 50/50 assignment. Called only in middleware on a visitor's first request. */
export function pickLandingVariant(): LandingVariant {
  return Math.random() < 0.5 ? "control" : "timeback";
}

/** Coerce an untrusted header/cookie value into a known variant. */
export function resolveLandingVariant(
  value: string | undefined | null
): LandingVariant {
  return isLandingVariant(value) ? value : DEFAULT_LANDING_VARIANT;
}

// --- Variant B ("timeback") copy overrides -----------------------------------
// These are applied as field-level overrides on top of the resolved content so
// `control` stays byte-for-byte the current behaviour (Sanity → fallback).

const TIMEBACK_HOME_CONTENT_OVERRIDES: Partial<HomepageContent> = {
  heroHeadline: "Run your business in a fraction of the time.",
  heroSubheadline:
    "Salt reads every tool your business runs on, handles the busywork, and brings you only what needs a decision. You stay in control — and the more it proves, the more it runs on its own.",
  heroMicroline: "Set up in minutes. Salt starts working the same day.",
  productTitle: "You run the business. Salt runs everything around it.",
};

/** Card title overrides keyed by the capability card `key`. */
const TIMEBACK_CARD_TITLE_OVERRIDES: Record<string, string> = {
  plays: "Skip the blank draft. Salt prepares, you decide.",
  intelligence: "Catch what's slipping — and get paid for the work you've done.",
  playbooks:
    "Build a Playbook once. Salt runs it from there — and earns room to do more on its own.",
};

const TIMEBACK_WAITLIST_HEADING = "Get your time back. Join the waitlist.";

export function applyVariantToHomeContent(
  content: HomepageContent,
  variant: LandingVariant
): HomepageContent {
  if (variant !== "timeback") return content;
  return { ...content, ...TIMEBACK_HOME_CONTENT_OVERRIDES };
}

export function applyVariantToCapabilityCards(
  cards: LandingCapabilityCard[],
  variant: LandingVariant
): LandingCapabilityCard[] {
  if (variant !== "timeback") return cards;
  return cards.map((card) => {
    const override = card.key
      ? TIMEBACK_CARD_TITLE_OVERRIDES[card.key]
      : undefined;
    return override ? { ...card, title: override } : card;
  });
}

export function applyVariantToWaitlistCta(
  cta: MarketingCta,
  variant: LandingVariant
): MarketingCta {
  if (variant !== "timeback") return cta;
  return { ...cta, heading: TIMEBACK_WAITLIST_HEADING };
}
