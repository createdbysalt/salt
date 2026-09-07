"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { useCookieConsent } from "@/app/_features/marketing/components/CookieConsentProvider";
import type { LandingVariant } from "./landing-variants";

/**
 * Records a homepage impression for the assigned A/B variant.
 *
 * Consent-gated: only fires when the visitor has granted analytics consent, so
 * it complies with the cookie-consent model. Registers `lp_variant` as a
 * PostHog super-property so any later events (incl. the waitlist conversion)
 * carry the variant, then captures an explicit impression for the denominator.
 */
export function LandingHomeVariantTracker({
  variant,
}: {
  variant: LandingVariant;
}) {
  const { analytics } = useCookieConsent();

  useEffect(() => {
    if (!analytics) return;
    posthog.register({ lp_variant: variant });
    posthog.capture("landing_home_viewed", { lp_variant: variant });
  }, [analytics, variant]);

  return null;
}
