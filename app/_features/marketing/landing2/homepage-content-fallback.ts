import type { HomepageContent } from "@/app/_lib/sanity/types";
import { HERO_PREVIEW_VISUAL_FALLBACK } from "./hero-preview-visuals";
import { HOMEPAGE_STRUCTURED_DATA_FAQS_FALLBACK } from "./homepage-structured-data-fallback";

export const HOMEPAGE_CONTENT_FALLBACK: HomepageContent = {
  heroBadge: "Proactive AI for your business",
  heroHeadline: "You can clock out, Salt never sleeps",
  heroSubheadline:
    "Salt reads every tool your business runs on. It surfaces what needs you, automates what doesn't, and gets better over time.",
  heroWaitlistSource: "homepage-hero",
  heroPreviewVisualKey: HERO_PREVIEW_VISUAL_FALLBACK,
  productEyebrow: "Features",
  productTitle: "Salt runs the work. You run the business.",
  structuredDataFaqs: HOMEPAGE_STRUCTURED_DATA_FAQS_FALLBACK,
};
