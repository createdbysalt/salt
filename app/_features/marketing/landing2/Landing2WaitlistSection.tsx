import { getMarketingCta } from "@/app/_lib/sanity/queries";
import { fetchResolvedWaitlistForm } from "@/app/_features/marketing/waitlist-form-config";
import {
  HOMEPAGE_WAITLIST_CTA_FALLBACK,
  HOMEPAGE_WAITLIST_CTA_KEY,
} from "./landing-waitlist-fallback";
import { Landing2WaitlistPanel } from "./Landing2WaitlistPanel";

type Landing2WaitlistSectionProps = {
  ctaKey?: string;
};

export async function Landing2WaitlistSection({
  ctaKey = HOMEPAGE_WAITLIST_CTA_KEY,
}: Landing2WaitlistSectionProps) {
  const [cta, waitlistForm] = await Promise.all([
    getMarketingCta(ctaKey),
    fetchResolvedWaitlistForm(),
  ]);

  return (
    <Landing2WaitlistPanel
      cta={cta ?? HOMEPAGE_WAITLIST_CTA_FALLBACK}
      waitlistForm={waitlistForm}
    />
  );
}
