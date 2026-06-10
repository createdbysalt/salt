/**
 * Demo mode utilities.
 *
 * Exposes a single hook for checking whether demo mode is active.
 * Combines env var (NEXT_PUBLIC_DEMO_MODE) and URL param (?demo=1).
 */

import { FeatureFlag, isFeatureEnabled } from "@/app/_lib/feature-flags";

/**
 * Server-safe check (does not read window).
 * Returns true if env var NEXT_PUBLIC_DEMO_MODE=true|1.
 */
export function isDemoModeServer(): boolean {
  return isFeatureEnabled(FeatureFlag.DEMO_MODE);
}

/**
 * Client-side check. Combines:
 * - env var (NEXT_PUBLIC_DEMO_MODE=true|1)
 * - URL param (?demo=1)
 *
 * Returns true if either is set.
 */
export function isDemoModeClient(): boolean {
  if (typeof window === "undefined") return isDemoModeServer();

  const urlParam = new URLSearchParams(window.location.search).get("demo");
  if (urlParam === "1" || urlParam === "true") return true;

  return isDemoModeServer();
}

export * from "./mock-data";
export * from "./plays-demo-data";
export * from "./capture-demo-data";
export * from "./hq-play-queue";
export * from "./people-demo-data";
export * from "./spaces-demo-data";
export * from "./orgs-demo-data";
export * from "./connections-graph-data";
export * from "./connections-insights-data";
export * from "./connections-paths-data";
export * from "./mock-content";
