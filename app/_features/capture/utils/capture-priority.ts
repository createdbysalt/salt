/**
 * Capture Priority Utilities
 *
 * Functions for grouping and filtering captures by priority tier.
 * Uses email_classification from enriched_metadata when available.
 */

import type { EmailClassificationMeta } from "../services/enrichment/types";

export type PriorityTier = "urgent" | "important" | "normal" | "low" | "noise";

export type PrioritySection = "priority" | "triggered" | "watching" | "standard" | "no_action";

export interface CaptureWithPriority {
  id: string;
  enrichedMetadata?: {
    email_classification?: EmailClassificationMeta;
    plays_dispatched?: Array<{ play_slug: string }>;
    watches_triggered?: Array<{ entity_id: string }>;
    signals_matched?: string[];
  } | null;
}

export interface GroupedCaptures<T extends CaptureWithPriority> {
  priority: T[];
  triggered: T[];
  watching: T[];
  standard: T[];
  noAction: T[];
}

export function getPriorityTier(capture: CaptureWithPriority): PriorityTier {
  const classification = capture.enrichedMetadata?.email_classification;
  if (!classification) return "normal";

  return classification.priority_tier as PriorityTier;
}

export function getPriorityScore(capture: CaptureWithPriority): number {
  const classification = capture.enrichedMetadata?.email_classification;
  return classification?.priority_score ?? 50;
}

export function getTriageAction(
  capture: CaptureWithPriority
): "surface_now" | "batch_digest" | "silent_archive" | null {
  const classification = capture.enrichedMetadata?.email_classification;
  if (!classification) return null;

  return classification.triage_action as
    | "surface_now"
    | "batch_digest"
    | "silent_archive";
}

export function isPriorityCapture(capture: CaptureWithPriority): boolean {
  const tier = getPriorityTier(capture);
  return tier === "urgent" || tier === "important";
}

export function isTriggeredCapture(capture: CaptureWithPriority): boolean {
  const dispatched = capture.enrichedMetadata?.plays_dispatched;
  return dispatched !== undefined && dispatched.length > 0;
}

export function isWatchingCapture(capture: CaptureWithPriority): boolean {
  const watches = capture.enrichedMetadata?.watches_triggered;
  return watches !== undefined && watches.length > 0;
}

export function isNoActionCapture(capture: CaptureWithPriority): boolean {
  const tier = getPriorityTier(capture);
  const triage = getTriageAction(capture);

  return (
    tier === "noise" ||
    tier === "low" ||
    triage === "silent_archive" ||
    triage === "batch_digest"
  );
}

export function groupCapturesByPriority<T extends CaptureWithPriority>(
  captures: T[]
): GroupedCaptures<T> {
  const groups: GroupedCaptures<T> = {
    priority: [],
    triggered: [],
    watching: [],
    standard: [],
    noAction: [],
  };

  for (const capture of captures) {
    if (isPriorityCapture(capture)) {
      groups.priority.push(capture);
    } else if (isTriggeredCapture(capture)) {
      groups.triggered.push(capture);
    } else if (isWatchingCapture(capture)) {
      groups.watching.push(capture);
    } else if (isNoActionCapture(capture)) {
      groups.noAction.push(capture);
    } else {
      groups.standard.push(capture);
    }
  }

  groups.priority.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
  groups.standard.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

  return groups;
}

export function getSectionForCapture(capture: CaptureWithPriority): PrioritySection {
  if (isPriorityCapture(capture)) return "priority";
  if (isTriggeredCapture(capture)) return "triggered";
  if (isWatchingCapture(capture)) return "watching";
  if (isNoActionCapture(capture)) return "no_action";
  return "standard";
}

export const SECTION_CONFIG: Record<
  PrioritySection,
  {
    label: string;
    description: string;
    defaultCollapsed: boolean;
    badgeVariant: "destructive" | "default" | "secondary" | "outline";
  }
> = {
  priority: {
    label: "Needs Attention",
    description: "High-priority captures requiring action",
    defaultCollapsed: false,
    badgeVariant: "destructive",
  },
  triggered: {
    label: "Triggered Plays",
    description: "Captures that queued a play",
    defaultCollapsed: false,
    badgeVariant: "default",
  },
  watching: {
    label: "Watching",
    description: "Matched a watched entity",
    defaultCollapsed: false,
    badgeVariant: "secondary",
  },
  standard: {
    label: "Stream",
    description: "Standard captures",
    defaultCollapsed: false,
    badgeVariant: "outline",
  },
  no_action: {
    label: "No Action Needed",
    description: "Low-priority or noise captures",
    defaultCollapsed: true,
    badgeVariant: "outline",
  },
};
