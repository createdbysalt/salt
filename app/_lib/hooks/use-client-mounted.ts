"use client";

import { useEffect, useState } from "react";

/** Defer Radix overlays until after hydration — avoids aria-controls/id SSR mismatches. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
