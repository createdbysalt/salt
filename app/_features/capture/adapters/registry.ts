import type { CaptureAdapter } from "./types";
import { calCaptureAdapter } from "./cal";
import { gmailCaptureAdapter } from "./gmail";
import { googleCalendarCaptureAdapter } from "./googlecalendar";
import { googleDriveCaptureAdapter } from "./googledrive";
import { stripeCaptureAdapter } from "./stripe";
import { getCategoryAdapter, listCategoryAdapters } from "./categories";

/**
 * Capture adapter registry (Captures V2 Phase 1).
 *
 * Uses category-based adapters as primary source (email, calendar, billing, storage).
 * Category adapters handle any app in their category with provider-specific parsing.
 * Falls back to app-specific adapters for edge cases.
 *
 * The webhook ingress routes trigger payloads by slug; the reconciliation cron
 * routes by toolkit.
 */
const APP_SPECIFIC_ADAPTERS: readonly CaptureAdapter[] = [
  gmailCaptureAdapter,
  googleCalendarCaptureAdapter,
  googleDriveCaptureAdapter,
  stripeCaptureAdapter,
  calCaptureAdapter,
];

/**
 * Build trigger slug → adapter map including BOTH app-specific and category adapters.
 * Category adapters are resolved on-demand for each provider in their category.
 */
function buildTriggerSlugMap(): Map<string, CaptureAdapter> {
  const map = new Map<string, CaptureAdapter>();

  // 1. App-specific adapters (legacy)
  for (const adapter of APP_SPECIFIC_ADAPTERS) {
    for (const slug of adapter.triggerSlugs) {
      map.set(slug, adapter);
    }
  }

  // 2. Category adapters (covers all providers per category)
  for (const { providers } of listCategoryAdapters()) {
    for (const provider of providers) {
      const adapter = getCategoryAdapter(provider);
      if (adapter) {
        for (const slug of adapter.triggerSlugs) {
          // Don't override app-specific if already registered
          if (!map.has(slug)) {
            map.set(slug, adapter);
          }
        }
      }
    }
  }

  return map;
}

const BY_TRIGGER_SLUG = buildTriggerSlugMap();

const BY_TOOLKIT = new Map<string, CaptureAdapter>(
  APP_SPECIFIC_ADAPTERS.map((adapter) => [adapter.toolkit, adapter] as const),
);

export function adapterForTriggerSlug(slug: string): CaptureAdapter | null {
  return BY_TRIGGER_SLUG.get(slug) ?? null;
}

/**
 * Get adapter for a toolkit/provider.
 *
 * Priority:
 * 1. Category adapter (handles any app in category)
 * 2. App-specific adapter (legacy, proven)
 */
export function adapterForToolkit(toolkit: string): CaptureAdapter | null {
  const categoryAdapter = getCategoryAdapter(toolkit);
  if (categoryAdapter) return categoryAdapter;

  return BY_TOOLKIT.get(toolkit) ?? null;
}

export function listCaptureAdapters(): readonly CaptureAdapter[] {
  return APP_SPECIFIC_ADAPTERS;
}
