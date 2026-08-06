import type { CaptureAdapter } from "./types";
import { getCategoryAdapter, listCategoryAdapters } from "./categories";

/**
 * Capture adapter registry (Captures V2).
 *
 * Uses category-based adapters as the sole source (email, calendar, billing, storage).
 * Category adapters handle any app in their category with provider-specific parsing.
 *
 * The webhook ingress routes trigger payloads by slug; the reconciliation cron
 * routes by toolkit.
 *
 * NOTE: App-specific adapters (gmail.ts, googlecalendar.ts, etc.) are RETIRED.
 * All capture normalization now goes through category adapters.
 */

/**
 * Build trigger slug → adapter map from category adapters.
 */
function buildTriggerSlugMap(): Map<string, CaptureAdapter> {
  const map = new Map<string, CaptureAdapter>();

  for (const { providers } of listCategoryAdapters()) {
    for (const provider of providers) {
      const adapter = getCategoryAdapter(provider);
      if (adapter) {
        for (const slug of adapter.triggerSlugs) {
          map.set(slug, adapter);
        }
      }
    }
  }

  return map;
}

const BY_TRIGGER_SLUG = buildTriggerSlugMap();

export function adapterForTriggerSlug(slug: string): CaptureAdapter | null {
  return BY_TRIGGER_SLUG.get(slug) ?? null;
}

/**
 * Get adapter for a toolkit/provider.
 * All adapters are now category-based.
 */
export function adapterForToolkit(toolkit: string): CaptureAdapter | null {
  return getCategoryAdapter(toolkit);
}

/**
 * List all available adapters.
 */
export function listCaptureAdapters(): CaptureAdapter[] {
  const adapters: CaptureAdapter[] = [];
  for (const { providers } of listCategoryAdapters()) {
    for (const provider of providers) {
      const adapter = getCategoryAdapter(provider);
      if (adapter) {
        adapters.push(adapter);
      }
    }
  }
  return adapters;
}
