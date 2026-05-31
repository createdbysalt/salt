"use client";

import { useEffect, useRef } from "react";
import { trackWaitlistFunnel } from "@/app/_features/marketing/waitlist-funnel";

/** Records one homepage_view per mount for conversion rate baseline. */
export function WaitlistFunnelTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackWaitlistFunnel("homepage_view");
  }, []);

  return null;
}
