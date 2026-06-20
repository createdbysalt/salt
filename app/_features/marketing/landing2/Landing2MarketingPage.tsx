import {
  getHomePage,
  getLandingPage,
  getMarketingCta,
} from "@/app/_lib/sanity/queries";
import type { HomepageContent, MarketingCta } from "@/app/_lib/sanity/types";
import { fetchResolvedWaitlistForm } from "@/app/_features/marketing/waitlist-form-config";
import { Landing2CapabilitiesSection } from "./Landing2CapabilitiesSection";
import { Landing2FooterServer } from "./Landing2FooterServer";
import { Landing2Hero } from "./Landing2Hero";
import { Landing2HeroShell } from "./Landing2HeroShell";
import { Landing2NavServer } from "./Landing2NavServer";
import { Landing2WaitlistPanel } from "./Landing2WaitlistPanel";
import { HOMEPAGE_CONTENT_FALLBACK } from "./homepage-content-fallback";
import {
  HOMEPAGE_WAITLIST_CTA_FALLBACK,
  HOMEPAGE_WAITLIST_CTA_KEY,
} from "./landing-waitlist-fallback";

function resolveHomeContent(
  homepageContent?: HomepageContent | null
): HomepageContent {
  return {
    ...HOMEPAGE_CONTENT_FALLBACK,
    ...homepageContent,
  };
}

async function resolveWaitlistCta(
  referenced?: MarketingCta | null,
  fallbackKey = HOMEPAGE_WAITLIST_CTA_KEY
): Promise<MarketingCta> {
  if (referenced?.heading) {
    return referenced;
  }

  return (await getMarketingCta(fallbackKey)) ?? HOMEPAGE_WAITLIST_CTA_FALLBACK;
}

type Landing2MarketingPageProps = {
  landingSlug: string;
};

export async function Landing2MarketingPage({
  landingSlug,
}: Landing2MarketingPageProps) {
  const [landing, waitlistForm] = await Promise.all([
    landingSlug === "home"
      ? getHomePage()
      : getLandingPage(landingSlug),
    fetchResolvedWaitlistForm(),
  ]);

  const usesMarketingLayout =
    landing?.pageVariant === "segment-landing" ||
    landing?.pageVariant === "marketing-home" ||
    landingSlug === "home";

  const content = resolveHomeContent(landing?.homepageContent);

  const waitlistCta = await resolveWaitlistCta(landing?.waitlistCta);

  return (
    <div className={landingSlug === "home" ? "landing2-home" : "landing2-segment"}>
      <main className="min-h-screen bg-background">
        <Landing2HeroShell>
          <Landing2NavServer />
          <Landing2Hero content={content} waitlistForm={waitlistForm} />
        </Landing2HeroShell>
        {usesMarketingLayout ? (
          <Landing2CapabilitiesSection
            eyebrow={content.productEyebrow}
            title={content.productTitle}
            landingSlug={landingSlug}
          />
        ) : null}
        <Landing2WaitlistPanel cta={waitlistCta} waitlistForm={waitlistForm} />
      </main>
      <Landing2FooterServer />
    </div>
  );
}
