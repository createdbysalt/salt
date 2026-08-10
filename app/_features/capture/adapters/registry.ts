import type { CaptureAdapter } from "./types";
import {
  getAdapterForCategory,
  getCategoryAdapter,
  listCategoryAdapters,
} from "./categories";

/**
 * Capture adapter registry (Captures V2).
 *
 * Uses category-based adapters as the sole source (email, calendar, billing, storage).
 * Category adapters handle any app in their category with provider-specific parsing.
 *
 * The webhook ingress routes trigger payloads by slug (DB-first via
 * trigger-routing.ts; this module's static slug map is the fallback); the
 * reconciliation cron routes by toolkit.
 *
 * NOTE: App-specific adapters (gmail.ts, googlecalendar.ts, etc.) are RETIRED.
 * All capture normalization now goes through category adapters.
 */

/**
 * Build trigger slug → adapter map from the static category provider list.
 * Slugs are per-adapter constants, so the map resolves categories from the
 * static list directly — no DB lookup at module scope.
 */
function buildTriggerSlugMap(): Map<string, CaptureAdapter> {
  const map = new Map<string, CaptureAdapter>();

  for (const { category, providers } of listCategoryAdapters()) {
    for (const provider of providers) {
      const adapter = getAdapterForCategory(category, provider);
      for (const slug of adapter.triggerSlugs) {
        map.set(slug, adapter);
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
 * All adapters are now category-based; the category comes from the DB
 * (`connector_overrides.capture_category`) with a frozen fallback map.
 */
export async function adapterForToolkit(
  toolkit: string,
): Promise<CaptureAdapter | null> {
  return getCategoryAdapter(toolkit);
}

/**
 * List all available adapters.
 */
export function listCaptureAdapters(): CaptureAdapter[] {
  const adapters: CaptureAdapter[] = [];
  for (const { category, providers } of listCategoryAdapters()) {
    for (const provider of providers) {
      adapters.push(getAdapterForCategory(category, provider));
    }
  }
  return adapters;
}
