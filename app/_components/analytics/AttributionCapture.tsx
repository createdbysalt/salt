"use client";

import { useEffect } from "react";
import { captureAttributionFromSearch } from "@/app/_lib/analytics/attribution";

/** Stores utm/gclid/fbclid from the landing URL for later signup events. */
export function AttributionCapture(): null {
  useEffect(() => {
    captureAttributionFromSearch(window.location.search);
  }, []);

  return null;
}
