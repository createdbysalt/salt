"use client";

import { useEffect, useState } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import { analyticsConfig } from "@/app/_lib/analytics/config";
import { useCookieConsent } from "@/app/_features/marketing/components/CookieConsentProvider";

export function MarketingTagManager({ gtmId }: { gtmId: string }) {
  const { marketing: marketingConsent } = useCookieConsent();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Only load GTM after user consents to marketing cookies
    if (analyticsConfig.enabled && gtmId && marketingConsent) {
      setShouldLoad(true);
    }
  }, [gtmId, marketingConsent]);

  if (!shouldLoad) return null;
  return <GoogleTagManager gtmId={gtmId} />;
}
