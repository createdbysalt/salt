/**
 * Seed four segment landing pages (/for/*) from draft copy.
 *
 * Usage:
 *   op run --env-file=.env.1password -- pnpm content:seed-segment-landings
 */
import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { HERO_PREVIEW_VISUAL_FALLBACK } from "../app/_features/marketing/landing2/hero-preview-visuals";
import {
  HOMEPAGE_FEATURE_CARDS,
  featureCardReferences,
} from "./lib/homepage-feature-cards";

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "olt8be01";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

const writeToken =
  process.env.SANITY_API_WRITE_TOKEN ||
  (() => {
    try {
      return readFileSync("/tmp/sanity_wt", "utf8").trim();
    } catch {
      return "";
    }
  })();

if (!writeToken) {
  console.error("Missing SANITY_API_WRITE_TOKEN (or /tmp/sanity_wt)");
  console.error(
    "Usage: op run --env-file=.env.1password -- pnpm content:seed-segment-landings"
  );
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: writeToken,
  apiVersion: "2024-01-01",
  useCdn: false,
});

type SegmentSeed = {
  slug: string;
  landingId: string;
  ctaId: string;
  icpSegment: string;
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroMicroline: string;
  heroWaitlistSource: string;
  ctaHeading: string;
  ctaSubheading: string;
  ctaFooterText?: string;
  secondaryLinkLead: string;
  waitlistSource: string;
  seoTitle: string;
  seoDescription: string;
};

const SEGMENTS: SegmentSeed[] = [
  {
    slug: "photographers",
    landingId: "landing-segment-photographers",
    ctaId: "cta-waitlist-segment-photographers",
    icpSegment: "Photographers",
    heroBadge: "For photographers",
    heroHeadline: "Salt runs your studio while you shoot.",
    heroSubheadline:
      "Salt reads every tool your photography business runs on. Inquiries get answered with your packages and your real availability, galleries go out on time, albums get upsold, and the edit backlog stays organized. You come home from an eight-hour wedding to a business that kept moving.",
    heroMicroline:
      "Built by people who run a creative studio. Not a CRM. The work, done.",
    heroWaitlistSource: "segment-photographers-hero",
    ctaHeading: "Your craft got you here. Your inbox is what is holding you back.",
    ctaSubheading:
      "Salt answers, follows up, invoices, and upsells while you are behind the camera. You review the work in about 90 seconds a day. The rest of the day is yours to shoot.",
    secondaryLinkLead:
      "Shooting all weekend? See what your studio might be leaving on the table.",
    waitlistSource: "segment-photographers-cta",
    seoTitle: "Salt | AI assistant for photographers",
    seoDescription:
      "Salt runs your studio while you shoot. Inquiries answered, galleries delivered, albums upsold. Join the waitlist.",
  },
  {
    slug: "coaches",
    landingId: "landing-segment-coaches",
    ctaId: "cta-waitlist-segment-coaches",
    icpSegment: "Coaches",
    heroBadge: "For coaches",
    heroHeadline: "Salt runs your practice between sessions.",
    heroSubheadline:
      "Salt reads your calendar, your inbox, and your client notes. Discovery calls turn into proposals the same day, every client gets their recap and their check-in on time, and renewals show up drafted before the package ends. You coach. Salt does everything around the coaching.",
    heroMicroline:
      "The follow-through layer for coaches who are great in the room and buried after it.",
    heroWaitlistSource: "segment-coaches-hero",
    ctaHeading: "You can prove transformation in the room. Salt proves it in writing.",
    ctaSubheading:
      "Every recap, every milestone, every win gets captured and played back when it is time to renew. Clients feel held between sessions, and you never wrote a single follow-up.",
    secondaryLinkLead:
      "Great in the room, buried after? See what follow-through might be costing your practice.",
    waitlistSource: "segment-coaches-cta",
    seoTitle: "Salt | AI assistant for coaches",
    seoDescription:
      "Salt runs your practice between sessions. Proposals, recaps, and renewals handled while you coach. Join the waitlist.",
  },
  {
    slug: "consultants",
    landingId: "landing-segment-consultants",
    ctaId: "cta-waitlist-segment-consultants",
    icpSegment: "Consultants",
    heroBadge: "For consultants",
    heroHeadline: "Salt sells while you deliver.",
    heroSubheadline:
      "The oldest trap in consulting: when you are delivering, you are not selling, and the pipeline dies on a 90-day delay. Salt keeps proposals moving, follows up on every silent thread, drafts the change order when scope creeps, and revives dormant leads. The engagement ends and the next one is already warm.",
    heroMicroline:
      "Built for the consultant of one who is tired of choosing between this quarter's revenue and next quarter's.",
    heroWaitlistSource: "segment-consultants-hero",
    ctaHeading: "Your expertise is the product. Salt is the firm around it.",
    ctaSubheading:
      "The follow-ups, the paperwork, the pipeline, the invoicing: handled while you do the billable work. A quick review each morning and the business of one runs like a business of five.",
    secondaryLinkLead:
      "Delivering while the pipeline goes quiet? See what that gap might be costing you.",
    waitlistSource: "segment-consultants-cta",
    seoTitle: "Salt | AI assistant for consultants",
    seoDescription:
      "Salt sells while you deliver. Pipeline follow-ups, change orders, and dormant leads revived. Join the waitlist.",
  },
  {
    slug: "real-estate-agents",
    landingId: "landing-segment-real-estate-agents",
    ctaId: "cta-waitlist-segment-real-estate-agents",
    icpSegment: "Real estate agents",
    heroBadge: "For real estate agents",
    heroHeadline: "Salt answers in 90 seconds. Even mid-showing.",
    heroSubheadline:
      "Portal leads die in minutes, and you live in your car. Salt replies to every new lead with listings and your real showing windows, nurtures your sphere between transactions, and tracks every contract deadline so nothing slips. You close. Salt covers everything between closings.",
    heroMicroline:
      "No per-lead fees. No team required. Your pipeline, working while you show.",
    heroWaitlistSource: "segment-real-estate-agents-hero",
    ctaHeading:
      "The agents who win answer first and never let a contact go cold.",
    ctaSubheading:
      "Salt makes you the fastest responder in your market and the most consistent name in your sphere, without hiring an assistant or buying another lead product. You show and close. Salt runs the rest.",
    secondaryLinkLead:
      "Living in your car between showings? See what speed-to-lead might be worth.",
    waitlistSource: "segment-real-estate-agents-cta",
    seoTitle: "Salt | AI assistant for real estate agents",
    seoDescription:
      "Salt answers leads in 90 seconds and nurtures your sphere between closings. Join the waitlist.",
  },
];

async function main() {
  console.log(`Seeding segment landings to ${PROJECT_ID}/${DATASET}…`);

  for (const segment of SEGMENTS) {
    await client.createOrReplace({
      _id: segment.ctaId,
      _type: "marketingCta",
      language: "en",
      key: segment.ctaId,
      eyebrow: "Early access",
      heading: segment.ctaHeading,
      subheading: segment.ctaSubheading,
      benefits: [],
      disclaimer: "No countdown timers. No fake scarcity.",
      secondaryLinkLead: segment.secondaryLinkLead,
      secondaryLink: {
        _type: "link",
        text: "Take the 2-minute quiz",
        linkType: "internal",
        href: `/money-on-the-table?source=${segment.waitlistSource}`,
      },
      footerText: segment.ctaFooterText,
      waitlistSource: segment.waitlistSource,
    });
    console.log(`  ✓ ${segment.ctaId}`);

    await client.createOrReplace({
      _id: segment.landingId,
      _type: "landingPage",
      language: "en",
      title: `Segment — ${segment.icpSegment}`,
      slug: { _type: "slug", current: segment.slug },
      pageVariant: "segment-landing",
      icpSegment: segment.icpSegment,
      homepageContent: {
        _type: "homepageContent",
        heroBadge: segment.heroBadge,
        heroHeadline: segment.heroHeadline,
        heroSubheadline: segment.heroSubheadline,
        heroMicroline: segment.heroMicroline,
        heroWaitlistSource: segment.heroWaitlistSource,
        heroPreviewVisualKey: HERO_PREVIEW_VISUAL_FALLBACK,
        productEyebrow: "Features",
        productTitle: "Salt runs the work. You run the business.",
      },
      featureCards: featureCardReferences(
        HOMEPAGE_FEATURE_CARDS.map((card) => card._id)
      ),
      waitlistCta: {
        _type: "reference",
        _ref: segment.ctaId,
      },
      seo: {
        _type: "seo",
        title: segment.seoTitle,
        description: segment.seoDescription,
      },
    });
    console.log(`  ✓ /for/${segment.slug} (${segment.landingId})`);
  }

  console.log("");
  console.log("Done. Segment URLs:");
  for (const segment of SEGMENTS) {
    console.log(`  https://usesalt.io/for/${segment.slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
