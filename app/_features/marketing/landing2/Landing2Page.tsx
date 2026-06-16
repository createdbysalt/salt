import { getHomePage, getMarketingCta } from "@/app/_lib/sanity/queries";
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
import "./landing2.css";

function resolveHomeContent(
  homepageContent?: HomepageContent | null
): HomepageContent {
  return {
    ...HOMEPAGE_CONTENT_FALLBACK,
    ...homepageContent,
  };
}

async function resolveWaitlistCta(
  referenced?: MarketingCta | null
): Promise<MarketingCta> {
  if (referenced?.heading) {
    return referenced;
  }

  return (
    (await getMarketingCta(HOMEPAGE_WAITLIST_CTA_KEY)) ??
    HOMEPAGE_WAITLIST_CTA_FALLBACK
  );
}

export async function Landing2Page() {
  const [home, waitlistForm] = await Promise.all([
    getHomePage(),
    fetchResolvedWaitlistForm(),
  ]);
  const content = resolveHomeContent(home?.homepageContent);
  const waitlistCta = await resolveWaitlistCta(home?.waitlistCta);

  return (
    <div className="landing2-home">
      <main className="min-h-screen bg-background">
        <Landing2HeroShell>
          <Landing2NavServer />
          <Landing2Hero content={content} waitlistForm={waitlistForm} />
        </Landing2HeroShell>
        <Landing2CapabilitiesSection
          eyebrow={content.productEyebrow}
          title={content.productTitle}
        />
        <Landing2WaitlistPanel cta={waitlistCta} waitlistForm={waitlistForm} />
      </main>
      <Landing2FooterServer />
    </div>
  );
}
