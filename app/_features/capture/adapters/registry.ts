import type { CaptureAdapter } from "./types";
import { gmailCaptureAdapter } from "./gmail";

/**
 * Capture adapter registry (connector-platform Phase 3).
 *
 * The head connectors (~30–50 capture sources, ever) get hand-written
 * adapters; the long tail stays action-only with no entry here. The webhook
 * ingress routes trigger payloads by slug; the reconciliation cron routes by
 * toolkit.
 */
const CAPTURE_ADAPTERS: readonly CaptureAdapter[] = [gmailCaptureAdapter];

const BY_TRIGGER_SLUG = new Map<string, CaptureAdapter>(
  CAPTURE_ADAPTERS.flatMap((adapter) =>
    adapter.triggerSlugs.map((slug) => [slug, adapter] as const),
  ),
);

const BY_TOOLKIT = new Map<string, CaptureAdapter>(
  CAPTURE_ADAPTERS.map((adapter) => [adapter.toolkit, adapter] as const),
);

export function adapterForTriggerSlug(slug: string): CaptureAdapter | null {
  return BY_TRIGGER_SLUG.get(slug) ?? null;
}

export function adapterForToolkit(toolkit: string): CaptureAdapter | null {
  return BY_TOOLKIT.get(toolkit) ?? null;
}

export function listCaptureAdapters(): readonly CaptureAdapter[] {
  return CAPTURE_ADAPTERS;
}
