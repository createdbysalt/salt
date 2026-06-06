"use client";

import { useEffect, useRef } from "react";
import { trackWaitlistFunnel } from "@/app/_features/marketing/waitlist-funnel";
import { useCookieConsent } from "./CookieConsentProvider";

/** Records one homepage_view per mount when analytics consent is granted. */
export function WaitlistFunnelTracker() {
  const { analytics } = useCookieConsent();
  const tracked = useRef(false);

  useEffect(() => {
    if (!analytics || tracked.current) return;
    tracked.current = true;
    trackWaitlistFunnel("homepage_view");
  }, [analytics]);

  return null;
}
